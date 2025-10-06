// Firebase core SDKs
import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAuth, connectAuthEmulator } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingEnvVars = requiredEnvVars.filter((key) => !import.meta.env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variable(s): ${missingEnvVars.join(", ")}. ` +
      "Copy .env.example to .env and supply the values generated in the Google Cloud console."
  );
}

const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_DATABASE_URL,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID,
} = import.meta.env;

// Your web app's Firebase configuration (from Vite env)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: VITE_FIREBASE_DATABASE_URL,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
  measurementId: VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const usersDB = getDatabase(app);
export const auth = getAuth(app);
// Localize reCAPTCHA and SMS to the user's device/browser language
try {
  // Prefer device language so we don't hardcode a locale
  auth.useDeviceLanguage();
} catch (_) {
  // no-op if not supported in certain environments
}

// Optional: In development, you can disable app verification for testing WITH TEST PHONE NUMBERS ONLY.
// Set VITE_FIREBASE_PHONE_TEST_MODE=true in your .env to enable. Do NOT use in production.
try {
  if (import.meta.env.MODE !== 'production' && String(import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE).toLowerCase() === 'true') {
    // eslint-disable-next-line no-unused-expressions
    auth.settings && (auth.settings.appVerificationDisabledForTesting = true);
    // This will still require numbers configured in Firebase console > Phone numbers for testing.
  }
} catch (_) {}
export const storage = getStorage(app);
// Match deployed region for Cloud Functions
export const functions = getFunctions(app, 'asia-east2');

// Optional: Connect to local emulators for unlimited testing (no SMS, no rate limits)
// Set VITE_FIREBASE_USE_EMULATORS=true and run Firebase emulators locally.
try {
  const USE_EMULATORS = String(import.meta.env.VITE_FIREBASE_USE_EMULATORS || '').toLowerCase() === 'true';
  if (USE_EMULATORS) {
    const host = '127.0.0.1';
    const AUTH_PORT = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099);
    const DB_PORT = Number(import.meta.env.VITE_EMULATOR_DB_PORT || 9000);
    const STORAGE_PORT = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199);
    const FUNCTIONS_PORT = Number(import.meta.env.VITE_EMULATOR_FUNCTIONS_PORT || 5001);

    // Connect before use; for Auth, specify http and disable warnings about secure context in dev
    connectAuthEmulator(auth, `http://${host}:${AUTH_PORT}`, { disableWarnings: true });
    connectDatabaseEmulator(usersDB, host, DB_PORT);
    connectStorageEmulator(storage, host, STORAGE_PORT);
    connectFunctionsEmulator(functions, host, FUNCTIONS_PORT);
    // When using the Auth emulator, you can use the default verification code 123456 for phone sign-in/linking.
  }
} catch (_) {}

// Optional helper to call our callable function from anywhere
// Accepts: { apptId: string, status?: string, serviceName?: string, serviceType?: 'Service'|'Package'|string, date?: string, time?: string, serviceId?: string, record?: object, appointment?: object }
export async function sendAppointmentEmailCallable(payload) {
  const fn = httpsCallable(functions, 'sendAppointmentEmail');
  // Pass through all provided fields; backend will merge and normalize
  return await fn(payload).then((r) => r.data);
}
export { app };
