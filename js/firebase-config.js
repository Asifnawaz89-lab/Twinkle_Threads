import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBa5HAOKL57VuVcdKUyG_C2sCYtAXEKvjY",
  authDomain: "twinkle-threads.firebaseapp.com",
  projectId: "twinkle-threads",
  storageBucket: "twinkle-threads.firebasestorage.app",
  messagingSenderId: "38427143104",
  appId: "1:38427143104:web:f6ebcbcd1e74b11974b625",
  measurementId: "G-QFN7X47X8K"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);