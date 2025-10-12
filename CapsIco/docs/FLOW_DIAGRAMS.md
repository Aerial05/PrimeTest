# 🎨 Gemini Chatbot - Visual Flow Diagram

## 📱 User Experience Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        USER'S JOURNEY                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

1. USER ARRIVES ON WEBSITE
   │
   ├─→ Page loads (Home, Services, About, etc.)
   │
   └─→ 🟣 Purple chat button appears (bottom-right)
       │
       ├─→ Smooth fade-in animation
       └─→ Pulsing notification badge (if bot sent message earlier)


2. USER CLICKS CHAT BUTTON
   │
   ├─→ Button rotates (180°) to show X icon
   │
   └─→ Chat window slides in from bottom-right
       │
       └─→ Welcome message appears:
           "Hello [UserName]! 👋 I'm your Prime Medical Laboratory 
            assistant. How can I help you today?"


3. USER SEES QUICK REPLIES (First Time)
   │
   └─→ [What services do you offer?]
       [How do I book an appointment?]
       [What are your clinic hours?]
       [Where are you located?]


4. USER TYPES OR CLICKS QUICK REPLY
   │
   ├─→ Message appears on RIGHT side (user bubble)
   │   └─→ Blue/purple gradient background
   │
   ├─→ Input field clears automatically
   │
   └─→ "Typing..." indicator appears on LEFT side
       │
       ├─→ Three dots bounce up and down
       │
       └─→ 1-3 seconds later...
           │
           └─→ AI response appears on LEFT side (bot bubble)
               └─→ White background, bot avatar


5. USER NAVIGATES TO ANOTHER PAGE
   │
   ├─→ Chat button persists (stays in place)
   │
   ├─→ Conversation history maintained
   │
   └─→ Can continue chatting seamlessly


6. USER CLOSES CHAT
   │
   ├─→ Clicks X button in header OR
   ├─→ Clicks chat button again
   │
   └─→ Window slides out smoothly
       └─→ Button returns to MessageCircle icon
```

---

## 🔧 Technical Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                   SYSTEM ARCHITECTURE                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   App.jsx    │  ← Application entry point
└──────┬───────┘
       │
       ├─→ Renders Chatbot component (if user view)
       │
       v
┌──────────────────┐
│  Chatbot.jsx     │  ← Main UI Component
└──────┬───────────┘
       │
       ├─→ useState: Manages UI state
       │   ├─→ isOpen
       │   ├─→ messages []
       │   ├─→ inputValue
       │   ├─→ isTyping
       │   └─→ error
       │
       ├─→ useEffect: Side effects
       │   ├─→ Auto-scroll
       │   ├─→ Auth listener
       │   └─→ Notifications
       │
       └─→ User sends message
           │
           v
    ┌────────────────────┐
    │ ChatbotService.js  │  ← API Integration Layer
    └────────┬───────────┘
             │
             ├─→ fetchApiKey()
             │   │
             │   └─→ Firebase Realtime Database
             │       │
             │       └─→ GET /config/gemini/apiKey
             │           │
             │           └─→ Returns: "AIzaSy..."
             │
             └─→ sendMessage(text, context)
                 │
                 ├─→ Build system prompt
                 │   └─→ "You are a helpful AI assistant for
                 │        Prime Medical Laboratory..."
                 │
                 ├─→ Add conversation history
                 │
                 └─→ POST to Gemini API
                     │
                     └─→ https://generativelanguage.googleapis.com/v1beta/
                         models/gemini-pro:generateContent?key={apiKey}
                         │
                         └─→ Response: AI-generated text
                             │
                             └─→ Return to Chatbot component
                                 │
                                 └─→ Display in chat window
```

---

## 🗄️ Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        DATA FLOW                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

USER INPUT
    │
    v
┌───────────────┐
│ "What are     │  ← User message (string)
│ your hours?"  │
└───────┬───────┘
        │
        v
┌───────────────────────────────────┐
│  Chatbot Component State          │
│  ─────────────────────────────    │
│  messages: [                      │
│    {                              │
│      id: 1697234567890,           │
│      text: "What are your hours?" │
│      sender: "user",              │
│      timestamp: "2:45 PM"         │
│    }                              │
│  ]                                │
└───────────┬───────────────────────┘
            │
            v
┌────────────────────────────────────┐
│  ChatbotService.sendMessage()      │
│  ───────────────────────────────   │
│  Input: {                          │
│    message: "What are your hours?" │
│    context: {                      │
│      currentPage: "home",          │
│      userName: "John"              │
│    }                               │
│  }                                 │
└───────────┬────────────────────────┘
            │
            v
┌────────────────────────────────────┐
│  Build API Request                 │
│  ───────────────────────           │
│  {                                 │
│    contents: [                     │
│      {                             │
│        role: "user",               │
│        parts: [{                   │
│          text: "System: You are... │
│                 User: What are..." │
│        }]                          │
│      }                             │
│    ],                              │
│    generationConfig: {...},        │
│    safetySettings: [...]           │
│  }                                 │
└───────────┬────────────────────────┘
            │
            v
┌────────────────────────────────────┐
│  🌐 GEMINI API                     │
│  ───────────────                   │
│  POST /v1beta/models/              │
│       gemini-pro:generateContent   │
│                                    │
│  Headers: Content-Type: JSON       │
│  Query: ?key={apiKey}              │
└───────────┬────────────────────────┘
            │
            v (1-3 seconds)
┌────────────────────────────────────┐
│  API Response                      │
│  ─────────────                     │
│  {                                 │
│    candidates: [{                  │
│      content: {                    │
│        parts: [{                   │
│          text: "Our clinic is..."  │
│        }]                          │
│      }                             │
│    }]                              │
│  }                                 │
└───────────┬────────────────────────┘
            │
            v
┌────────────────────────────────────┐
│  Extract Response Text             │
│  ────────────────────              │
│  "Our clinic is open Monday -      │
│   Saturday: 8:00 AM - 5:00 PM.     │
│   We're closed on Sundays."        │
└───────────┬────────────────────────┘
            │
            v
┌────────────────────────────────────┐
│  Add to State                      │
│  ─────────────                     │
│  messages: [                       │
│    ..., // previous messages       │
│    {                               │
│      id: 1697234567891,            │
│      text: "Our clinic is open..." │
│      sender: "bot",                │
│      timestamp: "2:45 PM"          │
│    }                               │
│  ]                                 │
└───────────┬────────────────────────┘
            │
            v
        DISPLAY IN UI
```

---

## 🎯 Component State Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│               COMPONENT LIFECYCLE                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

MOUNT (Component First Rendered)
  │
  ├─→ Initialize state:
  │   ├─ isOpen: false
  │   ├─ messages: []
  │   ├─ inputValue: ""
  │   ├─ isTyping: false
  │   └─ currentUser: null
  │
  ├─→ Set up auth listener (useEffect)
  │   └─→ onAuthStateChanged(auth, setCurrentUser)
  │
  └─→ Render floating button


OPEN CHAT (isOpen = true)
  │
  ├─→ Trigger useEffect (isOpen dependency)
  │   ├─→ Add welcome message if messages.length === 0
  │   └─→ Focus input field
  │
  └─→ Render chat window with animation


SEND MESSAGE
  │
  ├─→ User types → inputValue updates
  │
  ├─→ User clicks send or presses Enter
  │   │
  │   ├─→ Add user message to messages[]
  │   │
  │   ├─→ Clear inputValue
  │   │
  │   ├─→ Set isTyping = true
  │   │
  │   ├─→ Call ChatbotService.sendMessage()
  │   │   │
  │   │   └─→ API request (async)
  │   │       │
  │   │       ├─→ SUCCESS:
  │   │       │   ├─ Add bot message to messages[]
  │   │       │   └─ Set isTyping = false
  │   │       │
  │   │       └─→ ERROR:
  │   │           ├─ Set error message
  │   │           ├─ Add error to messages[]
  │   │           └─ Set isTyping = false
  │   │
  │   └─→ Trigger scroll useEffect (messages dependency)
  │       └─→ Scroll to bottom smoothly


NAVIGATE PAGE (location.pathname changes)
  │
  ├─→ Component re-renders
  │
  ├─→ State persists (messages, isOpen, etc.)
  │
  └─→ Context updates for next message
      └─→ getCurrentPageContext() returns new page


CLOSE CHAT (isOpen = false)
  │
  ├─→ If bot message was received while closed:
  │   └─→ hasNewMessage = true
  │       └─→ Show notification badge
  │
  └─→ Hide chat window with animation


UNMOUNT (User leaves site)
  │
  ├─→ Cleanup useEffect
  │   └─→ Unsubscribe from auth listener
  │
  └─→ Clear all state
```

---

## 🔐 Security & API Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                 SECURITY ARCHITECTURE                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

API KEY STORAGE (Setup Time)
  │
  Admin (or setup script)
  │
  └─→ Firebase Console / Firebase SDK
      │
      └─→ SET /config/gemini/apiKey = "AIzaSy..."
          │
          └─→ Firebase Security Rules apply:
              {
                "config": {
                  "gemini": {
                    "apiKey": {
                      ".read": "auth != null",   ← Must be logged in
                      ".write": false             ← No one can overwrite
                    }
                  }
                }
              }


API KEY RETRIEVAL (Runtime)
  │
  User logs in
  │
  └─→ ChatbotService.fetchApiKey()
      │
      ├─→ Check if already cached
      │   ├─ YES → Return cached key
      │   └─ NO  → Continue...
      │
      └─→ GET ref(usersDB, 'config/gemini/apiKey')
          │
          ├─→ Firebase checks auth token
          │   │
          │   ├─ AUTHENTICATED → Allow read
          │   └─ NOT AUTH      → PERMISSION_DENIED
          │
          └─→ Return API key to service
              │
              └─→ Cache for future requests


API REQUEST FLOW
  │
  User sends message
  │
  └─→ ChatbotService.sendMessage()
      │
      ├─→ Get API key (from cache or Firebase)
      │
      ├─→ Build request payload
      │   │
      │   └─→ Include safety settings:
      │       ├─ HARM_CATEGORY_HARASSMENT
      │       ├─ HARM_CATEGORY_HATE_SPEECH
      │       ├─ HARM_CATEGORY_SEXUALLY_EXPLICIT
      │       └─ HARM_CATEGORY_DANGEROUS_CONTENT
      │
      └─→ POST to Gemini API
          │
          ├─→ Content filtered by Gemini
          │
          └─→ Safe response returned


PRODUCTION RECOMMENDATION
  │
  └─→ Use Firebase Cloud Function as Proxy:
      │
      Client → Cloud Function → Gemini API
      │            │
      │            └─→ API key stored as Cloud Function secret
      │                (Never exposed to client)
      │
      └─→ Benefits:
          ├─ API key completely hidden
          ├─ Rate limiting per user
          ├─ Request logging
          ├─ Input validation
          └─ Usage monitoring
```

---

## 📱 Responsive Design Breakpoints

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              RESPONSIVE BEHAVIOR                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

DESKTOP (> 768px)
  │
  ├─→ Button: 60px circle, bottom-right 2rem
  │
  ├─→ Window: 380px × 600px
  │   ├─ Position: bottom-right
  │   ├─ Margin: 2rem from edges
  │   └─ Animation: scale from bottom-right
  │
  └─→ Messages: 75% max-width


TABLET (768px - 480px)
  │
  ├─→ Button: 60px circle (same)
  │
  ├─→ Window: Slightly smaller
  │   └─ Adapts to screen size
  │
  └─→ Messages: 80% max-width


MOBILE (< 768px)
  │
  ├─→ Button: 56px circle, 1rem from edges
  │
  ├─→ Window: 
  │   ├─ Width: calc(100vw - 2rem)
  │   ├─ Height: calc(100vh - 7rem)
  │   ├─ Position: bottom 5rem, right 1rem
  │   └─ Nearly full-screen
  │
  ├─→ Messages: 85% max-width
  │
  ├─→ Input: Larger touch targets
  │
  └─→ Quick replies: Horizontal scroll


SMALL MOBILE (< 480px)
  │
  └─→ All elements scale down proportionally
      ├─ Font sizes reduce slightly
      ├─ Padding tightens
      └─ Touch targets remain >= 44px
```

---

**Legend:**
```
│   Flow continues
├─→ Branch/Option
└─→ Final step/Result
v   Vertical continuation
← ← Arrow with explanation
```

---

This diagram shows the complete flow from user interaction to AI response!
