const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Use localhost during development.
// In production, require a configured backend URL.
const API_BASE_URL = (
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:3001" : "")
).replace(/\/+$/, "");

// Send a customer message to the Express backend
export async function sendChatMessage(message, history = []) {
  if (!API_BASE_URL) {
    throw new Error(
      "Backend API URL is not configured. Set VITE_API_BASE_URL.",
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      message,
      history,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("Backend returned an invalid AI response.");
  }

  return data;
}
