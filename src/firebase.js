// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAU_N_4qncyiteN5QXhVE-kRA4EgIzUkXs",
  authDomain: "focus-writer-8fe7b.firebaseapp.com",
  projectId: "focus-writer-8fe7b",
  storageBucket: "focus-writer-8fe7b.firebasestorage.app",
  messagingSenderId: "1090296644416",
  appId: "1:1090296644416:web:9825cdb945509190d9f0a5",
  measurementId: "G-CV8SJQ92L8",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
