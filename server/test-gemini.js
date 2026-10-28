import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load the Gemini API key securely
dotenv.config({
  path: new URL("./.env", import.meta.url),
});

// Check whether the API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error("Gemini API key is missing.");
  process.exit(1);
}

// Initialize the Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function testGemini() {
  try {
    console.log("Connecting to Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents:
        "You are Aria, a friendly customer support agent for Aura Skincare. Introduce yourself in one short sentence.",
      config: {
        thinkingConfig: {
          thinkingLevel: "low",
        },
      },
    });

    console.log("\nGemini response:");
    console.log(response.text);

    console.log("\nGemini API connection successful!");
  } catch (error) {
    console.error("Gemini API test failed.");
    console.error("Status:", error.status ?? "Unknown");
    console.error("Error:", error.message?.split("\n")[0] ?? "Unknown error");
    process.exitCode = 1;
  }
}

testGemini();
