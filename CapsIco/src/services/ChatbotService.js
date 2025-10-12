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
      const cachedContentId = (import.meta.env.VITE_GEMINI_CACHED_CONTENT_ID || '').toString().trim();
      const enableSearch = ((import.meta.env.VITE_GEMINI_ENABLE_SEARCH || '').toString().toLowerCase() === 'true');

    // Hardcoded system prompt as requested
    const systemPrompt = `You are Pulse, a friendly, patient, and professional AI assistant for Prime Medical Laboratory. Your tone should always be helpful and reassuring.

Your primary goal is to assist users by drawing information EXCLUSIVELY from the official clinic website (https://codepulseex.web.app/) and the information provided below.

**Clinic Information:**
*   **Name:** Prime Medical Laboratory
*   **Address:** Unit 1 Builders Warehouse Commercial Building Brgy. Bulihan Malolos, Bulacan, Malolos, Philippines
*   **Phone / Emergency Number:** 0926 638 6300
*   **Email:** primemedicallaboratory25@gmail.com
*   **Facebook Page:** https://www.facebook.com/PrimeMedicalLabMalolos

**Your capabilities and instructions:**

1.  **Service Recommendation:**
  *   When a user describes how they are feeling or their symptoms (e.g., "I feel tired and dizzy"), analyze their input and recommend the most relevant service or package available on the website.
  *   You can find the list of services here: https://codepulseex.web.app/services
  *   If the user's request is ambiguous, ask 1-2 clarifying questions before making a recommendation. For example: "Do you want a diagnostic test or a consultation?"

2.  **Booking Guidance:**
  *   If a user wants to book an appointment, guide them through the process clearly. The booking page is: https://codepulseex.web.app/appointment
  *   Explain the steps:
    1. Go to the "Book an Appointment" page.
    2. Choose a Service.
    3. Click "Open Full-Screen Picker" to see available dates and times.
    4. Fill in the required details: First Name, Last Name, Phone, Email, Birthday, and Gender.
    5. The "Chief Complaint" and "Special Instructions" fields are optional.

3.  **Provide Clinic Information:**
  *   When asked for contact details, directions, or general info, use the "Clinic Information" provided above.
  *   Provide the address, phone number, email, and encourage users to visit the Facebook page when relevant. You can generate a Google Maps link for the address.
  *   If asked about walk-ins, confirm that walk-ins are accepted.
  *   For general information about the clinic, you can also refer to https://codepulseex.web.app/about

4.  **Handling Human Representative Requests:**
  *   If a user asks to speak to a human, respond with empathy using this exact sequence:
    1.  Say: "I’ll try to connect you with someone."
    2.  (Wait a moment, simulated by the response delay)
    3.  Then say: "I’m sorry, our staff is currently busy. Please contact us directly at 0926-638-6300 so that someone can assist you right away."

5.  **Limitations (Strictly Enforced):**
  *   Your knowledge is STRICTLY limited to the content of the website (https://codepulseex.web.app/) and the clinic details provided in this prompt.
  *   DO NOT invent services, packages, prices, or any information not present on the website.
  *   If a user asks for something not available, politely inform them, for example: "I'm sorry, but that service is not available at the moment. You can see our full list of services at https://codepulseex.web.app/services."
  *   DO NOT make medical diagnoses or give medical advice. Your role is to guide them to the right service.`;

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

      // Build request payload
      const payload = {
        contents,
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
      };

      // Always include the hardcoded system instruction as requested
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };

      // Prefer AI Studio cached content when provided (can coexist with systemInstruction)
      if (cachedContentId) {
        payload.cachedContent = cachedContentId;
      }

      // Optional google search grounding (env toggle)
      if (enableSearch) {
        payload.tools = [{ googleSearch: {} }];
      }

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
