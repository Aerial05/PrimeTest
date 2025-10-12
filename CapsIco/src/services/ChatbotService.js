import { get, ref } from 'firebase/database';
import { usersDB } from '/src/config/firebase-config';

/**
 * ChatbotService - Manages Gemini AI chatbot interactions (direct mode)
 * - Fetches Gemini API key once (prefers Realtime Database path `config/gemini/apiKey`).
 * - In non-production, can also read VITE_GEMINI_API_KEY from .env for local dev.
 * - Key usage is isolated to this file; it is not exported or logged.
 */
class ChatbotService {
  constructor() {
    this.conversationHistory = [];
    this._apiKey = null; // not exported; runtime only
  }

  // Resolve API key once. In production, avoid bundling via env; prefer fetching from DB.
  async _resolveApiKey() {
    if (this._apiKey) return this._apiKey;

    // 1) Preferred per your setup: .env (Vite) in any mode
    // Note: VITE_ vars are bundled; keep reference isolated to this file.
  const envKey = ((import.meta.env.VITE_GEMINI_API_KEY) || '').toString().trim();
    if (envKey) {
      this._apiKey = envKey;
      return this._apiKey;
    }

    // 2) Fallback: fetch from Realtime Database
    try {
      const snap = await get(ref(usersDB, 'config/gemini/apiKey'));
      const fromDb = (snap && snap.val && snap.val()) || null;
      if (fromDb && typeof fromDb === 'string' && fromDb.trim()) {
        this._apiKey = fromDb.trim();
        return this._apiKey;
      }
    } catch (_) {
      // ignore and try env fallback
    }

    throw new Error('Gemini API key not found. Set VITE_GEMINI_API_KEY in your .env(.local) or add it at Realtime DB path config/gemini/apiKey.');
  }

  /**
   * Send a message to Gemini AI and get response
   * @param {string} userMessage - The user's message
   * @param {object} context - Optional context about the user/page
   * @returns {Promise<string>} - AI response
   */
  async sendMessage(userMessage, context = {}) {
    try {
      const apiKey = await this._resolveApiKey();
      const modelName = (import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash').toString();
      const apiVersion = (import.meta.env.VITE_GEMINI_API_VERSION || 'v1beta').toString();
      const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent`;

      // Map conversation history
      const trimmed = Array.isArray(this.conversationHistory) ? this.conversationHistory.slice(-10) : [];
      const mappedHistory = trimmed.map((h) => ({
        role: h?.role === 'user' ? 'user' : 'model',
        parts: [{ text: (h?.parts?.[0]?.text || '').toString() }],
      }));

      // Add current user message
      const contents = [
        ...mappedHistory,
        { role: 'user', parts: [{ text: (userMessage || '').toString() }] },
      ];

      const payload = {
        contents,
        systemInstruction: {
          parts: [{
            text: `You are Pulse, a friendly, patient, and professional AI assistant for Prime Medical Laboratory and Clinic (https://codepulseex.web.app/). Your tone is helpful and reassuring.

Your primary goal is to assist users by drawing information EXCLUSIVELY from the official clinic website.

Your capabilities and instructions:
1. Service Recommendation:
   - When a user describes symptoms or feelings, recommend the most relevant service or package from the Services page
   - If ambiguous, ask 1-2 clarifying questions before recommending
   
2. Booking Guidance:
   - Guide users through the appointment booking process
   - Steps: Choose a Service → Click "Open Full-Screen Picker" to see available dates/times → Fill required details (First Name, Last Name, Phone, Email, Birthday, Gender)
   - Chief Complaint and Special Instructions are optional
   
3. Provide Clinic Information:
   - Contact details, Google Maps link, and emergency number
   - Confirm that walk-ins are accepted
   - Clinic hours and location info

Limitations (Strictly Enforced):
- Your knowledge is STRICTLY limited to the website content
- DO NOT invent services, packages, prices, or any information not on the website
- DO NOT make medical diagnoses or give medical advice
- Always recommend booking an appointment or consulting with medical staff for health concerns
- If a requested service isn't available, politely inform them and point to the Services page

Behavior:
- Greet warmly and ask what the user feels or needs
- Be concise, friendly, and professional
- Use simple language suited for a medical/wellness setting
- Always helpful and reassuring`
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
        tools: [{
          googleSearch: {}
        }]
      };

      const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errMsg = 'Gemini API error';
        try { const j = await res.json(); errMsg = j?.error?.message || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const dataJson = await res.json();
      const aiResponse = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

      // Add AI response to history
      this.conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });

      return aiResponse;
    } catch (error) {
      console.error('Chatbot error:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }
}

// Export singleton instance
const chatbotService = new ChatbotService();
export default chatbotService;
