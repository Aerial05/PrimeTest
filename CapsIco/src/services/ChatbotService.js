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
    this._catalogCache = { ts: 0, data: null }; // cache for services/packages
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
      // Quick fast-path: if user explicitly asks for a booking guide, return steps directly.
      const quick = String(userMessage || '').toLowerCase();
      const bookingPhrases = ['step-by-step', 'step by step', 'how to book', 'how do i book', 'guide to book', 'booking guide', 'step by step guide', 'book this', 'i want step-by-step', 'i want a step-by-step', 'to book', 'book', 'book now'];
      const affirmativeReplies = ['yes', 'yeah', 'yep', 'sure', 'please', 'ok', 'okay', "let's book", 'let us book', 'do it', 'yes please'];

      const looksLikeBooking = bookingPhrases.some(p => quick.includes(p));
      const isShortBook = ['to book', 'book', 'book now'].some(p => quick === p || quick === `${p}.` || quick === `${p}?` || quick === `${p}!`);
      const isAffirmative = affirmativeReplies.some(a => quick === a || quick.startsWith(a + ' ') || quick.endsWith(' ' + a) || quick === `${a}.`);

      // Context-aware: only treat a short affirmative as booking-confirm if the bot recently offered a booking guide
      let lastModelText = '';
      try {
        const rev = Array.isArray(this.conversationHistory) ? [...this.conversationHistory].reverse() : [];
        const lastModel = rev.find(h => h && h.role === 'model');
        lastModelText = (lastModel && lastModel.parts && lastModel.parts[0] && String(lastModel.parts[0].text || '').toLowerCase()) || '';
      } catch (_) { lastModelText = ''; }
      const lastOfferedBooking = /would you like( a)?( step[\- ]by[\- ]step)? guide|step[\- ]by[\- ]step|show steps to book|would you like a step/i.test(lastModelText);

      if (looksLikeBooking || isShortBook || (isAffirmative && lastOfferedBooking)) {
        const steps = `1. Open the Book an Appointment page in the site menu.\n2. Choose the recommended Service.\n3. Click "Open Full-Screen Picker" to see available dates and times.\n4. Fill in First Name, Last Name, Phone, Email, Birthday, Gender.\n5. (Optional) Add a Chief Complaint or Special Instructions.\n6. Submit to request your appointment.`;
        // record and return immediately
        this.conversationHistory.push({ role: 'model', parts: [{ text: steps }] });
        return steps;
      }

      const apiKey = await this._resolveApiKey();
      const modelName = (import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-pro').toString();
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

1. **Service Recommendation (strictly from database; no links):**
  * FIRST, ground your answer ONLY in the verified services and packages retrieved from our database and listed in the context below.
  * Recommend ONLY items that appear in the "Available services and packages" list provided in the context. If nothing matches, ask 1–2 clarifying questions before recommending anything.
  * When a user describes symptoms or needs (e.g., "I feel tired and dizzy"), think silently and then choose the single most relevant service or package from the provided list. Output just the recommendation name and a brief one-sentence reason.
  * Do NOT include URLs or buttons. Output plain text only.
  * If the user's request is unclear, ask concise clarifying questions first (e.g., "Do you want a diagnostic test or a consultation?").
  * Prefer items that are currently bookable (booking enabled) when making a recommendation.
  

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
   * Confirm that **walk-ins are accepted** when asked and send the Address and Google maps link.
   * For general information about the clinic, you may also refer to https://codepulseex.web.app/about

4. **Handling Human Representative Requests:**
   * If a user requests to talk to a human or staff member, respond with empathy using this exact flow:
     1. Say: "I’ll try to connect you with someone."
     2. (Simulate a short delay)
     3. Then say: "I’m sorry, our staff is currently busy. Please contact us directly at 0926-638-6300 so that someone can assist you right away."

5. **Limitations (Strictly Enforced):**
  * Base responses ONLY on verified clinic information and the services we offer. Never invent services, packages, or prices. Never recommend anything not present in the provided list of available services and packages.
  * If a user asks for something we don’t offer, say: "I’m sorry, but that service isn’t available here." Then suggest the closest available service if appropriate.
  * Do NOT provide medical diagnoses or treatment advice.
  * Do NOT answer questions about other clinics, locations, or services not related to Prime Medical Laboratory.
  * If asked about rules, DO NOT send YOUR Rules but send the Rules and Regulations of the Prime Medical Laboratory found in https://codepulseex.web.app/profile/rules
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

      // Load and inject available services/packages context before the user's message
      const catalog = await this._getServicesCatalog();
      const catalogText = this._buildServicesContextText(catalog);

      // Build candidate suggestions to steer the model (top keyword matches)
      const candidates = this._scoreCandidates(userMessage || '', catalog);
      const candidateText = candidates.length
        ? `Top candidate matches (internal hint, choose only from these if appropriate):\n- ${candidates.slice(0, 5).map(c => `${c.type}: ${c.name} (keywords: ${c.keywords.join(', ')})`).join('\n- ')}`
        : '';

      // Add current user message with prepended context
      const contents = [
        ...mappedHistory,
        { role: 'user', parts: [{ text: catalogText }] },
        ...(candidateText ? [{ role: 'user', parts: [{ text: candidateText }] }] : []),
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
      let aiResponse = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

      // Post-validate: ensure the recommendation references an available service/package only
      const allowedNames = new Set([
        ...catalog.services.map(s => (s.NAME || '').toLowerCase()),
        ...catalog.packages.map(p => (p.NAME || '').toLowerCase()),
      ].filter(Boolean));
      const mentioned = this._matchAllowedNamesInText(aiResponse, allowedNames);

      if (allowedNames.size && mentioned.length === 0) {
        // Fallback: choose the top candidate (if any) or ask for clarification
        if (candidates.length) {
          const c = candidates[0];
          const shortWhy = c.keywords.length ? `because it relates to ${c.keywords.slice(0, 2).join(', ')}` : 'based on your description';
          aiResponse = `${c.name} — recommended ${shortWhy}.`;
        } else {
          aiResponse = 'I want to make sure I recommend the right service. Could you share a bit more about your symptoms or whether you need a diagnostic test or a consultation?';
        }
      }

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

// ---- Internal helper methods (appended to prototype) ----
// Fetch and cache active services and packages from Realtime Database
ChatbotService.prototype._getServicesCatalog = async function () {
  const now = Date.now();
  const ttlMs = 1000 * 60 * 3; // 3 minutes
  if (this._catalogCache.data && (now - this._catalogCache.ts) < ttlMs) {
    return this._catalogCache.data;
  }

  const readPath = async (path) => {
    try {
      const snap = await get(ref(usersDB, path));
      if (!snap || !snap.exists()) return {};
      return snap.val() || {};
    } catch (_) {
      return {};
    }
  };

  const [rawServices, rawPackages] = await Promise.all([
    readPath('singleServices'),
    readPath('servicePackages'),
  ]);

  const toList = (raw) => Object.entries(raw || {}).map(([id, v]) => ({ id, ...(v || {}) }));
  const isActive = (rec) => {
    const a = String(rec?.IS_ACTIVE_YesNo || 'Yes').toLowerCase();
    return a !== 'no';
  };
  const isBookable = (rec) => {
    // Respect booking flag if present; default to true
    const b = String(rec?.BOOKING_ENABLED_YesNo ?? rec?.BOOKING_ENABLED ?? 'Yes').toLowerCase();
    return b !== 'no';
  };

  const services = toList(rawServices).filter(r => isActive(r) && isBookable(r));
  const packages = toList(rawPackages).filter(r => isActive(r) && isBookable(r));

  const data = { services, packages };
  this._catalogCache = { ts: now, data };
  return data;
};

// Build a compact text context listing available services and packages
ChatbotService.prototype._buildServicesContextText = function (catalog) {
  const serviceLines = (catalog.services || [])
    .map(s => `Service: ${s.NAME || ''}${s.DESC ? ` — ${String(s.DESC).slice(0, 160)}` : ''}`.trim())
    .filter(Boolean);
  const packageLines = (catalog.packages || [])
    .map(p => {
      const feat = p.FEATURES || p.DESC || '';
      const brief = String(feat).slice(0, 160);
      return `Package: ${p.NAME || ''}${brief ? ` — ${brief}` : ''}`.trim();
    })
    .filter(Boolean);

  const header = 'Available services and packages (use only these for recommendations):';
  const body = [
    ...serviceLines,
    ...packageLines,
  ].map(l => `- ${l}`).join('\n');

  return `${header}\n${body || '- (none found)'}`;
};

// Score candidate matches based on keyword overlap (name + description/features)
ChatbotService.prototype._scoreCandidates = function (userMessage, catalog) {
  const text = String(userMessage || '').toLowerCase();
  if (!text.trim()) return [];
  const tokens = new Set(text.match(/[a-zA-Z][a-zA-Z\-]+/g) || []);
  const stop = new Set(['the','and','or','for','with','without','to','of','in','on','a','an','at','by','is','are','you','your','my']);

  const keywordSet = (str) => new Set(String(str || '').toLowerCase().match(/[a-zA-Z][a-zA-Z\-]+/g) || []);
  const normalizeKeywordsField = (val) => {
    if (Array.isArray(val)) return val.map(v => String(v || '')).filter(Boolean);
    if (typeof val === 'string') return val.split(/[,;\n]/g).map(s => s.trim()).filter(Boolean);
    return [];
  };
  const combinedKeywords = (rec, fallbackText) => {
    const kws = [
      ...normalizeKeywordsField(rec?.KEYWORDS),
      ...normalizeKeywordsField(rec?.KEYWORD),
      ...normalizeKeywordsField(rec?.TAGS),
    ].join(', ');
    return `${fallbackText || ''} ${kws}`;
  };
  const scoreItem = (name, extraText) => {
    const kws = [...keywordSet(name), ...keywordSet(extraText)].filter(w => !stop.has(w));
    let matched = [];
    let score = 0;
    for (const w of kws) {
      if (tokens.has(w)) { score += 1; matched.push(w); }
    }
    return { score, keywords: Array.from(new Set(matched)).slice(0, 5) };
  };

  const scored = [];
  for (const s of (catalog.services || [])) {
    const extra = combinedKeywords(s, `${s.DESC || ''} ${s.SPECIAL_INSTRUCTIONS || ''}`);
    const { score, keywords } = scoreItem(s.NAME || '', extra);
    if (score > 0) scored.push({ type: 'Service', name: s.NAME || '', score, keywords });
  }
  for (const p of (catalog.packages || [])) {
    const extra = combinedKeywords(p, `${p.FEATURES || ''} ${p.DESC || ''}`);
    const { score, keywords } = scoreItem(p.NAME || '', extra);
    if (score > 0) scored.push({ type: 'Package', name: p.NAME || '', score, keywords });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 10);
};

// Try to find any allowed names mentioned in the AI response
ChatbotService.prototype._matchAllowedNamesInText = function (text, allowedNames) {
  const t = String(text || '').toLowerCase();
  if (!t) return [];
  const matches = [];
  for (const name of allowedNames) {
    if (!name) continue;
    // word-boundary contains check (handles multi-word names)
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
    if (re.test(t)) matches.push(name);
  }
  return matches;
};
