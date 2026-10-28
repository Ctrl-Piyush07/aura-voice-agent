import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import orders from "./orders.json" with { type: "json" };

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

// AI chat endpoint with conversation history
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

    // Validate previous conversation messages
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

    // Convert previous messages into Gemini format
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
      },
    });

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
