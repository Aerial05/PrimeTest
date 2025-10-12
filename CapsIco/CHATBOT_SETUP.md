# Gemini AI Chatbot Setup Guide

## Overview
The Prime Medical Laboratory chatbot uses Google's Gemini AI API to provide intelligent assistance to users across all pages of the website.

## Features
- ✅ Floating chat button on all user-facing pages (home, services, about, contact, appointments)
- ✅ Persistent across navigation
- ✅ Context-aware responses based on current page
- ✅ User authentication integration
- ✅ Conversation history management
- ✅ Quick reply suggestions
- ✅ Mobile responsive design
- ✅ Real-time typing indicators
- ✅ Error handling and retry logic

## Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click on "Get API Key" in the left sidebar
4. Create a new API key or use an existing one
5. Copy the API key (it will look like: `AIzaSy...`)

### 2. Securely store the key on the backend (no client exposure)

By default, the client fetches the Gemini API key from Realtime Database at `config/gemini/apiKey`. For local development, you may also define `VITE_GEMINI_API_KEY` in `.env.local` (dev only). Ensure your database rules restrict reads appropriately.

### 3. Deploy and Test the Chatbot

1. Build and run your application
2. Ensure the Gemini key exists at `/config/gemini/apiKey` (or `VITE_GEMINI_API_KEY` for dev)
3. Open your app and look for the floating purple chat button in the bottom-right corner
4. Send a message (e.g., "What services do you offer?")

### 4. Test the Chatbot

1. Build and run your application:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to your app
3. You should see a floating purple chat button in the bottom-right corner
4. Click the button to open the chat window
5. Try sending a message like:
   - "What services do you offer?"
   - "How do I book an appointment?"
   - "What are your clinic hours?"

### 5. Customization Options

#### Modify System Context
System prompt is generated client-side in `src/services/ChatbotService.js` in `_buildSystemPrompt()`.

#### Change Appearance
Edit `/src/components/shared/chatbot/Chatbot.module.css` to customize colors, sizes, and layout.

#### Adjust AI Parameters
Tune `generationConfig` in `src/services/ChatbotService.js` inside `sendMessage()`.

## Architecture

### File Structure
```
src/
├── components/
│   └── shared/
│       └── chatbot/
│           ├── Chatbot.jsx          # Main chatbot component
│           └── Chatbot.module.css   # Chatbot styles
├── services/
│   └── ChatbotService.js            # Gemini API integration
└── App.jsx                          # Chatbot integration point
```

### How It Works

1. **Service Layer** (`ChatbotService.js`):
   - Manages conversation history
   - Calls the secure callable `chatWithGemini` (no client API key)
   - Provides context about the user and current page

2. **Component Layer** (`Chatbot.jsx`):
   - Renders floating button and chat window
   - Manages UI state (open/closed, typing, errors)
   - Tracks user authentication
   - Provides quick reply buttons
   - Auto-scrolls to latest messages

3. **Integration** (`App.jsx`):
   - Renders chatbot on all user-facing pages
   - Conditionally hides on admin pages
   - Positioned to not interfere with booking button

## Troubleshooting

### "Gemini API key not found in Firebase"
- Ensure you've added the API key to Firebase at the correct path: `config/gemini/apiKey`
- Check Firebase console to verify the key exists
- Ensure you're logged in (API key requires authentication)

### "Failed to get response from Gemini"
- Check your internet connection
- Verify the API key is valid in AI Studio
- Check browser console for detailed error messages
- Ensure your Firebase project has the correct CORS settings

### Chatbot button not appearing
- Check browser console for errors
- Ensure you're on a user-facing page (not admin)
- Clear browser cache and rebuild: `npm run build`

### Chat window positioning issues on mobile
- The chatbot is responsive and will adjust for mobile screens
- If issues persist, check for CSS conflicts with existing styles
- Adjust z-index if needed in `Chatbot.module.css`

## Security Best Practices

- If you choose to store the key in Realtime Database for client access, lock reads to authorized users only and consider additional rate limiting.
- For stricter secrecy, use a backend proxy instead of direct client calls.
- Monitor API usage in AI Studio / Google Cloud.

## Cost Considerations

- Gemini API has a free tier with generous limits
- Monitor your usage in [Google AI Studio](https://aistudio.google.com/)
- Current pricing (as of 2024):
  - Free tier: 60 requests per minute
  - Paid tier: $0.00025 per 1K characters (input) + $0.0005 per 1K characters (output)

## Support

For issues or questions:
1. Check the [Gemini API documentation](https://ai.google.dev/docs)
2. Review Firebase [security rules documentation](https://firebase.google.com/docs/database/security)
3. Check browser console for error messages
4. Contact your development team

---

**Created:** October 2025  
**Last Updated:** October 12, 2025  
**Version:** 1.0.0
