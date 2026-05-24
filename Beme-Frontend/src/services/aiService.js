/**
 * aiService.js — calls real Claude API through Beme-Backend.
 * API key stays secure on the server, never exposed to the browser.
 */

const API_URL = import.meta.env.VITE_API_URL || "https://beme-market-1.onrender.com";

const FALLBACK = [
  "I'm having a bit of trouble connecting right now. Please try again in a moment!",
  "Connection issue — please retry. Your message wasn't lost!",
  "I'm briefly unavailable. Try again in a few seconds.",
];

export async function sendAIMessage(messages, context = {}, uid = null) {
  try {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages, context }),
    });

    if (!response.ok) {
      if (response.status === 429) return "I'm getting a lot of requests right now. Give me a second and try again! 🙏";
      if (response.status === 401) return "There's a configuration issue with the AI service. Please contact Beme support.";
      if (response.status === 503) return "Claude is briefly overloaded. Please try again in a few seconds!";
      console.error("[aiService] backend error:", response.status);
      return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    }

    const data = await response.json();
    return data.content || FALLBACK[0];

  } catch (err) {
    console.error("[aiService] fetch error:", err);
    return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
  }
}

export function buildSystemPrompt(context = {}) {
  return `Beme AI Copilot — ${context.shopName || "Seller"} — ${context.currentPage || "dashboard"}`;
}
