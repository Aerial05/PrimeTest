# Quick Start: Secure Gemini Chatbot Setup (Backend-only key)

## Step 1: Get Your API Key from AI Studio

1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Click **"Get API Key"** in the left sidebar
4. Copy your API key (starts with `AIzaSy...`)

## Step 2: Provide the API key to the client securely

Option A (recommended in your setup):
- Add the key to Realtime Database at: `/config/gemini/apiKey`
- Restrict read access to authenticated users only via database rules

Option B (local development only):
- Add `VITE_GEMINI_API_KEY=YOUR_KEY` to `.env.local`

## Step 3: Test It

1. Open your website
2. Look for the purple chat button in the bottom-right corner
3. Click it and send a test message like "Hello"
4. If you get a response, it's working! 🎉

## Troubleshooting

### ❌ "API key not found"
- Double-check the path in Firebase: must be exactly `/config/gemini/apiKey`
- Make sure you're logged in to your website
- Refresh the page after adding the key

### ❌ "Failed to get response"
- Verify your API key is correct in AI Studio
- Check if you have internet connection
- Look at browser console (F12) for detailed errors

### ❌ Chat button not showing
- Make sure you're NOT on an admin page
- Try clearing cache: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Security Note

If you store the key in Realtime Database, ensure rules restrict reads (e.g., `auth != null`). Consider moving to a backend proxy for production.

---

**Need help?** Check CHATBOT_SETUP.md for detailed instructions.
