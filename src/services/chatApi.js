const API_BASE_URL = "http://localhost:3001";

// Send a customer message to the Express backend
export async function sendChatMessage(message, history = []) {
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
