# Prime Medical Laboratory & Clinic - Web Application

A comprehensive healthcare management system built with React, Vite, and Firebase, featuring AI-powered chatbot assistance.

## 🚀 Key Features

- 🏥 **Medical Services Management**: Browse and book laboratory tests, consultations, and health packages
- 📅 **Online Appointment Booking**: Schedule appointments with real-time availability
- 🤖 **AI Chatbot Assistant**: Gemini-powered intelligent support across all pages
- 👤 **User Profiles**: Manage personal information, appointments, and medical history
- 🔐 **Multi-Authentication**: Email/password, Google, Facebook, and Phone OTP (PH)
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- 🎨 **Modern UI/UX**: Smooth animations and intuitive navigation

## 🤖 AI Chatbot Feature (NEW!)

The application includes a floating AI chatbot powered by Google's Gemini API:

- **Persistent Across Pages**: Chat button available on all user-facing pages
- **Context-Aware**: Provides relevant information based on current page
- **Smart Assistance**: Answers questions about services, appointments, and clinic info
- **User-Friendly**: Quick replies, typing indicators, and conversation history
- **Secure (per your setup)**: API key fetched at runtime from Realtime Database (or from .env in dev)

### Quick Setup:
1. Get your Gemini API key from [AI Studio](https://aistudio.google.com/)
2. Add it to Realtime Database at `/config/gemini/apiKey` (restrict reads)
3. Or in local dev, set `VITE_GEMINI_API_KEY` in `.env.local`
4. Chat button appears automatically on all user pages!

📖 **Detailed Setup**: See [CHATBOT_QUICKSTART.md](./CHATBOT_QUICKSTART.md) and [CHATBOT_SETUP.md](./CHATBOT_SETUP.md)

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.




    

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Phone OTP login (PH-only) quick setup

The app supports OTP login via phone for Philippines numbers only (+63). Users must verify their phone in Profile before they can log in with OTP.

- Prereqs in Firebase Console:
	- Enable Authentication → Sign-in method → Phone.
	- Authentication → Settings → Authorized domains: add localhost, 127.0.0.1, and your prod domains.
	- If API key has HTTP referrer restrictions, include your dev/prod origins.
	- App Check: disable for Web in dev or configure properly. If using reCAPTCHA Enterprise, ensure site key is linked.
	- Realtime Database → Rules: deploy the included `database.rules.json` so `/users` is indexed by `phone`.

- Env vars (create `.env.local`):
	- VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_DATABASE_URL, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID.
	- Optional: VITE_FIREBASE_PHONE_TEST_MODE=true (dev only) to disable app verification for Firebase test numbers.

- Usage:
	- In Profile → Phone, enter a PH number in 09XXXXXXXXX format and Verify via SMS. This links the phone to the logged-in user and marks `phoneVerified:true`.
	- On Login, choose "Use phone (OTP)". Only verified PH numbers can request an OTP. reCAPTCHA is required and falls back to a visible widget if needed.
	- Test numbers configured in Firebase won't send real SMS; use the predefined code.

- Rate limiting:
	- The UI enforces a resend cooldown if you hit `auth/too-many-requests`. Try again after the countdown.

