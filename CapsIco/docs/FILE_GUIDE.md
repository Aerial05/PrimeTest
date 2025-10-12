# 🗺️ Gemini Chatbot - File Location Guide

## 📂 Project Structure

```
CapsIco/
│
├── 📄 README.md                          ← Updated with chatbot info
├── 📄 CHATBOT_QUICKSTART.md              ← Quick setup guide (START HERE!)
├── 📄 CHATBOT_SETUP.md                   ← Detailed setup guide
│
├── 📁 docs/
│   ├── 📄 CHATBOT_FEATURES.md            ← Feature overview & examples
│   └── 📄 IMPLEMENTATION_SUMMARY.md      ← What was built (this summary)
│
├── 📁 scripts/
│   └── 📄 set-gemini-key.js              ← Helper to set API key via console
│
├── 📁 src/
│   ├── 📄 App.jsx                        ← Chatbot integrated here
│   │
│   ├── 📁 components/
│   │   └── 📁 shared/
│   │       └── 📁 chatbot/               ← Chatbot component folder
│   │           ├── 📄 Chatbot.jsx        ← Main component (UI logic)
│   │           └── 📄 Chatbot.module.css ← Styles (purple gradient theme)
│   │
│   └── 📁 services/
│       └── 📄 ChatbotService.js          ← Gemini API integration service
│
└── 📁 node_modules/                       ← No new dependencies added!
```

---

## 🎯 Quick File Reference

### To Understand Setup:
1. **Start with:** `CHATBOT_QUICKSTART.md` (3 steps to get running)
2. **Details:** `CHATBOT_SETUP.md` (comprehensive guide)
3. **Features:** `docs/CHATBOT_FEATURES.md` (what it does)

### To Modify Chatbot:

| What to Change | File to Edit | Line Numbers (approx) |
|----------------|--------------|----------------------|
| Button appearance | `Chatbot.module.css` | Lines 1-50 |
| Chat window size | `Chatbot.module.css` | Lines 60-80 |
| Message colors | `Chatbot.module.css` | Lines 150-200 |
| AI personality | `ChatbotService.js` | Lines 100-140 |
| Quick replies | `Chatbot.jsx` | Lines 170-175 |
| Welcome message | `Chatbot.jsx` | Lines 75-85 |
| Page availability | `App.jsx` | Lines 180-185 |

### To Troubleshoot:
- **API key issues:** Check `ChatbotService.js` lines 15-40
- **UI problems:** Check `Chatbot.jsx` component state
- **Styling issues:** Check `Chatbot.module.css`
- **Integration issues:** Check `App.jsx` import and render

---

## 🔍 What Each File Does

### Core Files (What Makes It Work)

#### `src/services/ChatbotService.js`
**Purpose:** Handles all communication with Gemini API  
**Key Functions:**
- `fetchApiKey()` - Gets API key from Firebase
- `sendMessage()` - Sends message to Gemini and gets response
- `buildSystemContext()` - Creates the AI's personality and knowledge
- `clearHistory()` - Resets conversation

**When to edit:** Change AI behavior, modify API settings, adjust context

---

#### `src/components/shared/chatbot/Chatbot.jsx`
**Purpose:** The visual chatbot component users interact with  
**Key Features:**
- Floating button
- Chat window UI
- Message display
- Input handling
- Error states

**When to edit:** Change UI behavior, add features, modify interactions

---

#### `src/components/shared/chatbot/Chatbot.module.css`
**Purpose:** All styles for the chatbot  
**Sections:**
- Lines 1-60: Button styles
- Lines 61-120: Window and header
- Lines 121-220: Messages and bubbles
- Lines 221-280: Typing indicator & quick replies
- Lines 281-340: Input area
- Lines 341-400: Responsive mobile styles

**When to edit:** Change colors, sizes, animations, layout

---

#### `src/App.jsx`
**Purpose:** Main app file where chatbot is integrated  
**What changed:**
- Added import: `import { Chatbot } from "./components/shared/chatbot/Chatbot"`
- Added render: `{!checkingAuth && (!isAdmin || preferUserView) && <Chatbot />}`

**When to edit:** Change where chatbot appears, hide on certain pages

---

### Documentation Files (How to Use It)

#### `CHATBOT_QUICKSTART.md`
**🎯 START HERE!** 3-step setup guide  
**Who it's for:** Anyone setting up the chatbot for the first time  
**Time to read:** 2 minutes

---

#### `CHATBOT_SETUP.md`
**Comprehensive setup guide with all details**  
**Who it's for:** Developers, detailed implementation  
**Time to read:** 10 minutes  
**Includes:** Security rules, troubleshooting, production tips

---

#### `docs/CHATBOT_FEATURES.md`
**Feature showcase with examples**  
**Who it's for:** Understanding capabilities, showing to stakeholders  
**Time to read:** 8 minutes  
**Includes:** Visual diagrams, example conversations, customization

---

#### `docs/IMPLEMENTATION_SUMMARY.md`
**Complete summary of what was built**  
**Who it's for:** Project overview, handoff documentation  
**Time to read:** 5 minutes  
**Includes:** File list, metrics, testing checklist

---

### Helper Files

#### `scripts/set-gemini-key.js`
**Browser console helper to set API key**  
**How to use:**
1. Open browser console (F12)
2. Copy and paste the script
3. Run `promptForApiKey()`
4. Enter your key when prompted

**Alternative:** Run with key directly: `setGeminiApiKey('YOUR_KEY')`

---

## 📍 Firebase Structure Required

```
Firebase Realtime Database:
  └── config/
      └── gemini/
          └── apiKey: "AIzaSy..."  ← Your Gemini API key goes here
```

**Path:** `/config/gemini/apiKey`  
**Type:** String  
**Read access:** Authenticated users  
**Write access:** False (set manually)

---

## 🎨 Visual Component Hierarchy

```
<Chatbot>                              (Main container)
  └── <button chatbotButton>          (Floating button)
      └── <MessageCircle> or <X>      (Icon)
      
  └── <div chatbotWindow>             (Chat window - when open)
      ├── <div chatHeader>            (Header with title)
      │   ├── <Sparkles> icon
      │   ├── Title & subtitle
      │   └── <Trash2> & <X> buttons
      │
      ├── <div messagesContainer>     (Scrollable messages)
      │   ├── Welcome message (first time)
      │   ├── Messages array map:
      │   │   └── <div message>
      │   │       ├── Avatar (<Bot> or <User>)
      │   │       └── Message bubble + time
      │   └── Typing indicator (when loading)
      │
      ├── <div quickReplies>          (Quick reply buttons)
      │   └── Multiple buttons
      │
      └── <div inputArea>             (Input + send button)
          ├── <textarea>
          └── <button sendButton>
              └── <Send> icon
```

---

## 🚀 Deployment Checklist

Before deploying to production:

### Files to Commit:
- ✅ `src/services/ChatbotService.js`
- ✅ `src/components/shared/chatbot/Chatbot.jsx`
- ✅ `src/components/shared/chatbot/Chatbot.module.css`
- ✅ `src/App.jsx` (modified)
- ✅ All documentation files
- ✅ Helper scripts

### Don't Commit:
- ❌ Your actual API key (goes in Firebase, not code)
- ❌ `.env` files with keys
- ❌ Test data or logs

### Firebase Setup:
1. ✅ Add API key to `/config/gemini/apiKey`
2. ✅ Update security rules
3. ✅ Test with authenticated user
4. ✅ Set up usage monitoring

### Build & Deploy:
```bash
npm run build          # Verify build succeeds
firebase deploy        # Deploy to production
```

---

## 🆘 Quick Troubleshooting Map

| Problem | Check File | Look For |
|---------|-----------|----------|
| Button not showing | `App.jsx` | Chatbot import and render |
| API key error | Firebase Console | `/config/gemini/apiKey` path |
| Chat won't open | Browser Console | JavaScript errors |
| Styling broken | `Chatbot.module.css` | CSS import in component |
| No AI response | `ChatbotService.js` | API endpoint and key |
| Mobile issues | `Chatbot.module.css` | `@media` queries at bottom |

---

## 📚 Learning Resources

### To Understand the Code:
- **React Hooks:** `useState`, `useEffect`, `useRef` used throughout
- **CSS Modules:** Scoped styling in `.module.css` files
- **Service Pattern:** Singleton in `ChatbotService.js`
- **Firebase SDK:** `ref()`, `get()` for database access

### To Extend Features:
- **Gemini API Docs:** https://ai.google.dev/docs
- **React Router:** `useLocation` for page awareness
- **Firebase Auth:** `onAuthStateChanged` for user tracking
- **CSS Animations:** Keyframes in styles for smooth effects

---

## 💡 Tips for Success

### For Developers:
1. Read `CHATBOT_QUICKSTART.md` first
2. Test in development before production
3. Monitor API usage regularly
4. Keep conversation history reasonable
5. Use Cloud Functions proxy in production

### For Stakeholders:
1. Review `docs/CHATBOT_FEATURES.md` for capabilities
2. Check `docs/IMPLEMENTATION_SUMMARY.md` for metrics
3. Test on different devices
4. Gather user feedback
5. Monitor response quality

### For Users:
1. Click purple button in bottom-right
2. Try quick reply buttons first
3. Ask questions naturally
4. Clear history if needed
5. Report issues to admin

---

**Everything is ready! Just add your API key and go live! 🚀**

For immediate help: See `CHATBOT_QUICKSTART.md`
