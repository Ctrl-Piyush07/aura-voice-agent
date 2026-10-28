import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({
  path: new URL("./.env", import.meta.url),
});

if (!process.env.GEMINI_API_KEY) {
  console.error("Gemini API key is missing.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 15000,
  },
});

async function listModels() {
  try {
    console.log("Checking available Gemini models...");

    const models = await ai.models.list();

    let count = 0;

    for await (const model of models) {
      if (
        model.name?.includes("flash") &&
        !model.name.includes("image") &&
        !model.name.includes("tts") &&
        !model.name.includes("live")
      ) {
        console.log(model.name);
        count++;

        if (count >= 15) break;
      }
    }

    console.log(`Found ${count} matching models.`);
  } catch (error) {
    console.error("Model listing failed.");
    console.error("Status:", error.status ?? "Unknown");
    console.error("Message:", error.message);
  }
}

listModels();
