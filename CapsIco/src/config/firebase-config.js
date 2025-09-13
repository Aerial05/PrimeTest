// Firebase core SDKs
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBLoY0hxCqpdHL0cRk63gX0_Rb7J-BNNto",
  authDomain: "codepulseex.firebaseapp.com",
  databaseURL: "https://codepulseex-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "codepulseex",
  storageBucket: "codepulseex.firebasestorage.app",
  messagingSenderId: "314655829793",
  appId: "1:314655829793:web:56062befba3ac0289d1860",
  measurementId: "G-ML59QNMDCE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const usersDB = getDatabase(app);
export const auth = getAuth(app);
export { app };
