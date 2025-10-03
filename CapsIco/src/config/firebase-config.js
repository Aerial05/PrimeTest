// Firebase core SDKs
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
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
export const storage = getStorage(app);
// Match deployed region for Cloud Functions
export const functions = getFunctions(app, 'asia-east2');

// Optional helper to call our callable function from anywhere
export async function sendAppointmentEmailCallable({ apptId, status }) {
  const fn = httpsCallable(functions, 'sendAppointmentEmail');
  return await fn({ apptId, status }).then((r) => r.data);
}
export { app };
