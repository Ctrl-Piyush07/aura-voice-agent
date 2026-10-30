import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

import orders from "./orders.json" with { type: "json" };

import { orderToolDeclaration } from "./orderToolDeclaration.js";
import { getOrderDetails } from "./orderTools.js";
import { ariaInstructions } from "./ariaInstructions.js";

// NEW: Backend response safety validation
import { enforceResponseGuardrails } from "./responseGuardrails.js";

// --------------------------------------------------
// 1. Load environment variables
// --------------------------------------------------

dotenv.config({
  path: new URL("./.env", import.meta.url),
});

// --------------------------------------------------
// 2. Initialize Express
// --------------------------------------------------

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json());

// --------------------------------------------------
// 3. Initialize Gemini
// --------------------------------------------------

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        timeout: 30000,
      },
    })
  : null;

// --------------------------------------------------
// 4. Health check endpoint
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Aura Voice Agent Backend",
  });
});

// --------------------------------------------------
// 5. Mock order lookup endpoint
// --------------------------------------------------

app.get("/api/orders/:orderId", (req, res) => {
  const orderId = req.params.orderId.toUpperCase();

  const order = orders[orderId];

  if (!order) {
    return res.status(404).json({
      error: "Order not found",
      order_id: orderId,
    });
  }

  res.json(order);
});

// --------------------------------------------------
// 6. AI chat endpoint
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body ?? {};

    // ----------------------------------------------
    // Validate customer message
    // ----------------------------------------------

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "A valid message of up to 2000 characters is required.",
      });
    }

    // ----------------------------------------------
    // Validate conversation history
    // ----------------------------------------------

    if (
      !Array.isArray(history) ||
      history.length > 20 ||
      !history.every(
        (item) =>
          item &&
          (item.role === "user" || item.role === "model") &&
          typeof item.text === "string" &&
          item.text.trim().length > 0 &&
          item.text.length <= 2000,
      )
    ) {
      return res.status(400).json({
        error: "Invalid conversation history.",
      });
    }

    // ----------------------------------------------
    // Verify Gemini configuration
    // ----------------------------------------------

    if (!ai) {
      return res.status(503).json({
        error: "AI service is not configured.",
      });
    }

    // ----------------------------------------------
    // Prepare conversation history
    // ----------------------------------------------

    const contents = history.map((item) => ({
      role: item.role,
      parts: [
        {
          text: item.text,
        },
      ],
    }));

    // Add current customer message
    contents.push({
      role: "user",
      parts: [
        {
          text: message.trim(),
        },
      ],
    });

    console.log("Processing customer message...");

    // ----------------------------------------------
    // First Gemini request
    // Includes policies and function declarations
    // ----------------------------------------------

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents,

      config: {
        // Aura Skincare policies and guardrails
        systemInstruction: ariaInstructions,

        thinkingConfig: {
          thinkingLevel: "low",
        },

        // Allow Gemini to request order details
        tools: [
          {
            functionDeclarations: [orderToolDeclaration],
          },
        ],
      },
    });

    // ----------------------------------------------
    // 7. Handle Gemini function calling
    // ----------------------------------------------

    if (response.functionCalls?.length > 0) {
      const functionCall = response.functionCalls[0];

      // Reject unsupported functions
      if (functionCall.name !== "get_order_details") {
        return res.status(502).json({
          error: "Unknown AI function requested.",
        });
      }

      console.log("Gemini requested:", functionCall.name);

      // Extract order ID
      const orderId = functionCall.args?.order_id;

      // Execute actual backend function
      const orderResult = getOrderDetails(orderId);

      console.log(
        "Order lookup completed:",
        orderResult.error ? "Not found or invalid" : "Found",
      );

      // --------------------------------------------
      // Handle invalid order IDs
      // Without making another Gemini request
      // --------------------------------------------

      if (orderResult.error) {
        const reply = orderResult.order_id
          ? `I'm sorry, but I couldn't find order ${orderResult.order_id}. Could you please double-check the order ID?`
          : "I couldn't look up that order. Could you please provide a valid order ID?";

        return res.json({
          tool_call: {
            name: functionCall.name,
            args: functionCall.args,
          },

          tool_result: orderResult,

          reply,
        });
      }

      // --------------------------------------------
      // Prepare verified function response
      // --------------------------------------------

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) {
        return res.status(502).json({
          error: "Missing AI function-call content.",
        });
      }

      const functionResponse = {
        name: functionCall.name,
        response: {
          result: orderResult,
        },
      };

      // Preserve function-call ID when provided
      if (functionCall.id) {
        functionResponse.id = functionCall.id;
      }

      // --------------------------------------------
      // Continue Gemini conversation with tool data
      // --------------------------------------------

      const followUpContents = [
        ...contents,

        modelContent,

        {
          role: "user",
          parts: [
            {
              functionResponse,
            },
          ],
        },
      ];

      // --------------------------------------------
      // Second Gemini request
      // Generate natural customer response
      // --------------------------------------------

      const finalResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: followUpContents,

        config: {
          // Apply the SAME Aura brand policies
          systemInstruction: ariaInstructions,

          thinkingConfig: {
            thinkingLevel: "low",
          },
        },
      });

      const finalReply = finalResponse.text?.trim();

      if (!finalReply) {
        return res.status(502).json({
          error: "AI returned an empty final response.",
        });
      }

      // --------------------------------------------
      // NEW: Validate final Gemini response
      // after successful order lookup
      // --------------------------------------------

      const safeFinalReply = enforceResponseGuardrails(finalReply);

      // Return validated reply and verified order data
      return res.json({
        tool_call: {
          name: functionCall.name,
          args: functionCall.args,
        },

        tool_result: orderResult,

        reply: safeFinalReply,
      });
    }

    // ----------------------------------------------
    // 8. Normal conversation without function call
    // ----------------------------------------------

    const reply = response.text?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "AI returned an empty response.",
      });
    }

    // ----------------------------------------------
    // NEW: Validate normal Gemini responses
    // before sending them to React
    // ----------------------------------------------

    const safeReply = enforceResponseGuardrails(reply);

    res.json({
      reply: safeReply,
    });
  } catch (error) {
    // Do not expose sensitive API details
    console.error("Gemini chat failed:", error.status ?? "Unknown status");

    res.status(502).json({
      error: "Unable to generate an AI response.",
    });
  }
});

// --------------------------------------------------
// 9. Start Express server
// --------------------------------------------------

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  console.log(
    `Gemini API key configured: ${Boolean(process.env.GEMINI_API_KEY)}`,
  );
});
