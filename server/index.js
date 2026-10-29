import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import orders from "./orders.json" with { type: "json" };
import { orderToolDeclaration } from "./orderToolDeclaration.js";
import { getOrderDetails } from "./orderTools.js";

// Load backend environment variables
dotenv.config({
  path: new URL("./.env", import.meta.url),
});

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

// Initialize Gemini on the backend
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        timeout: 30000,
      },
    })
  : null;

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Aura Voice Agent Backend",
  });
});

// Mock order lookup
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

// AI chat endpoint with conversation history and tool declarations
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body ?? {};

    // Validate customer message
    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "A valid message of up to 2000 characters is required.",
      });
    }

    // Validate conversation history
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

    if (!ai) {
      return res.status(503).json({
        error: "AI service is not configured.",
      });
    }

    // Convert conversation history into Gemini format
    const contents = history.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // Append the current customer message
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    console.log("Processing customer message...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        thinkingConfig: {
          thinkingLevel: "low",
        },

        // Make the order lookup tool available to Gemini
        tools: [
          {
            functionDeclarations: [orderToolDeclaration],
          },
        ],
      },
    });

    // Detect function calls requested by Gemini
    if (response.functionCalls?.length > 0) {
      const functionCall = response.functionCalls[0];

      if (functionCall.name !== "get_order_details") {
        return res.status(502).json({
          error: "Unknown AI function requested.",
        });
      }

      console.log("Gemini requested:", functionCall.name);

      // Extract the order ID requested by Gemini
      const orderId = functionCall.args?.order_id;

      // Execute the real backend lookup function
      const orderResult = getOrderDetails(orderId);

      console.log(
        "Order lookup completed:",
        orderResult.error ? "Not found or invalid" : "Found",
      );

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

      // Return the function request and verified database result

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) {
        return res.status(502).json({
          error: "Missing AI function-call content.",
        });
      }

      // Prepare the verified result for Gemini
      const functionResponse = {
        name: functionCall.name,
        response: {
          result: orderResult,
        },
      };

      // Preserve the function-call ID when provided
      if (functionCall.id) {
        functionResponse.id = functionCall.id;
      }

      // Continue the conversation after executing the tool
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

      // Generate a natural response using verified order data
      const finalResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: followUpContents,
        config: {
          thinkingConfig: {
            thinkingLevel: "low",
          },
          systemInstruction:
            "You are Aria, a friendly Aura Skincare customer support agent. " +
            "Answer concisely using only the verified order information " +
            "returned by the function. Never invent order details, " +
            "delivery estimates, or actions. Never claim an order was " +
            "cancelled or refunded unless that action was actually performed.",
        },
      });

      const finalReply = finalResponse.text?.trim();

      if (!finalReply) {
        return res.status(502).json({
          error: "AI returned an empty final response.",
        });
      }

      // Return the completed order lookup and natural reply
      return res.json({
        tool_call: {
          name: functionCall.name,
          args: functionCall.args,
        },
        tool_result: orderResult,
        reply: finalReply,
      });
    }

    // Normal AI response when no function is needed
    const reply = response.text;

    if (!reply?.trim()) {
      return res.status(502).json({
        error: "AI returned an empty response.",
      });
    }

    res.json({
      reply: reply.trim(),
    });
  } catch (error) {
    console.error("Gemini chat failed:", error.status ?? "Unknown status");

    res.status(502).json({
      error: "Unable to generate an AI response.",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  console.log(
    `Gemini API key configured: ${Boolean(process.env.GEMINI_API_KEY)}`,
  );
});
