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

  /**
   * Fetch raw page content from Realtime DB under `site/pages/{key}` or `content/pages/{key}`.
   * Caches results in-memory. Returns null if not found.
   */
  async fetchPageContent(pageKey) {
    if (!pageKey) return null;
    this._pageCache = this._pageCache || {};
    if (this._pageCache[pageKey]) return this._pageCache[pageKey];
    try {
      // Try common DB paths
      const paths = [`site/pages/${pageKey}`, `content/pages/${pageKey}`, `pages/${pageKey}`];
      for (const p of paths) {
        try {
          const snap = await get(ref(usersDB, p));
          if (snap && snap.exists()) {
            const v = snap.val() || null;
            // Normalize to plain text if object
            const text = typeof v === 'string' ? v : (v?.body || v?.content || JSON.stringify(v));
            this._pageCache[pageKey] = String(text || '').trim();
            return this._pageCache[pageKey];
          }
        } catch (_) {}
      }
    } catch (e) {
      // ignore
    }
    // As a last resort, attempt to fetch the public site route and extract text (best-effort)
    try {
      const base = 'https://codepulseex.web.app';
      const route = pageKey === 'home' ? '/' : `/${pageKey}`;
      const res = await fetch(base + route, { method: 'GET' });
      if (res && res.ok) {
        const html = await res.text();
        // Strip tags to get a simple summary
        const stripped = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
        const normalized = stripped.replace(/\s+/g, ' ').trim();
        this._pageCache[pageKey] = normalized;
        return normalized;
      }
    } catch (_) {}
    return null;
  }

  /**
   * Return a short summary (first ~280 chars) for the requested page.
   * Uses cached page content or fetches it. Returns null when empty.
   */
  async getPageSummary(pageKey) {
    try {
      const raw = await this.fetchPageContent(pageKey);
      if (!raw) return null;
      // Prefer the first paragraphs or first 280 chars
      const cleaned = String(raw).replace(/\s+/g, ' ').trim();
      if (cleaned.length <= 300) return cleaned;
      // Try to split by sentence boundaries
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned.slice(0, 300)];
      let out = '';
      for (const s of sentences) {
        if ((out + s).length > 300) break;
        out += s.trim() + ' ';
      }
      out = out.trim();
      if (!out) out = cleaned.slice(0, 300) + '...';
      return out;
    } catch (_) { return null; }
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

   // Hardcoded system prompt updated to align with page-summary and local-db functions
  const systemPrompt = `You are Pulse, a friendly, patient, and professional AI assistant for Prime Medical Laboratory. Use a helpful, concise, and reassuring tone. Think step-by-step internally before answering, but only share the final concise recommendation.

Your primary goal is to assist users using ONLY verified content from the official clinic website (https://codepulseex.web.app/) and the explicit clinic information below.

Clinic Information:
Name: Prime Medical Laboratory
Address: Unit 1 Builders Warehouse Commercial Building, Brgy. Bulihan, Malolos, Bulacan, Malolos, Philippines
Phone / Emergency Number: 0926 638 6300
Email: primemedicallaboratory25@gmail.com
Facebook Page: https://www.facebook.com/PrimeMedicalLabMalolos

---

**Your capabilities and instructions:**

1. **Service Recommendation (no links):**
  * FIRST, ground your answer in our verified local services/packages. Base recommendations only on services we actually offer.
  * When a user describes how they are feeling or mentions symptoms (e.g., "I feel tired and dizzy"), reason step-by-step and then recommend the most relevant clinic service or package we offer. Keep the reasoning internal; output only the short recommendation with a brief "why".
  * Do NOT include URLs or buttons in your response. Simply name the recommended service or package and a one‑sentence reason.
  * If the user's request is unclear, ask 1–2 clarifying questions before suggesting a service. Example: "Do you want a diagnostic test or a consultation?"
  * Pregnancy-related guidance: if a user says they are pregnant, prefer OB‑Gyne Consultation and/or Obstetric Ultrasound based on context. Do not give medical advice—only suggest appropriate available services.

2. **Booking Guidance (on-demand, no links):**
   * After recommending a service, ask: "Would you like a step‑by‑step guide to book this?"
   * If the user says yes, provide the following numbered steps clearly, without any links:
     1. Open the Book an Appointment page in the site menu.
     2. Choose the recommended Service.
     3. Click “Open Full‑Screen Picker” to see available dates and times.
     4. Fill in First Name, Last Name, Phone, Email, Birthday, Gender.
     5. (Optional) Add a Chief Complaint or Special Instructions.
     6. Submit to request your appointment.

3. **Provide Clinic Information:**
   * When asked for contact details, directions, or general info, use only the "Clinic Information" provided above.
   * Include the address, phone number, and email when appropriate, and encourage users to visit the Facebook page for updates.
   * You may send a Google Maps Link (https://maps.google.com/maps/dir//Prime+Medical+Laboratory+Km+42+MacArthur+Hwy+Malolos+3000+Bulacan/@14.8643365,120.8061427,16z/data=!4m5!4m4!1m0!1m2!1m1!1s0x3396539fbcb72721:0x354c9a99ae71365c)() if useful.
   * Confirm that **walk-ins are accepted** when asked.
   * For general information about the clinic, you may also refer to https://codepulseex.web.app/about

4. **Handling Human Representative Requests:**
   * If a user requests to talk to a human or staff member, respond with empathy using this exact flow:
     1. Say: "I’ll try to connect you with someone."
     2. (Simulate a short delay)
     3. Then say: "I’m sorry, our staff is currently busy. Please contact us directly at 0926-638-6300 so that someone can assist you right away."

5. **Limitations (Strictly Enforced):**
  * Base responses ONLY on verified clinic information and the services we offer. Never invent services, packages, or prices.
  * If a user asks for something we don’t offer, say: "I’m sorry, but that service isn’t available here." Then suggest the closest available service if appropriate.
  * Do NOT provide medical diagnoses or treatment advice.

---

**Disclaimer:**  
The information provided by this chatbot is intended for **appointment assistance and general service guidance only**. It does not constitute medical advice, diagnosis, or treatment. For medical concerns, please consult a licensed healthcare professional.
`;


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
