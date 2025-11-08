// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQB19AOFI87tqVIkm8Ir0yVGu9zj7WI-Q",
  authDomain: "majorbudapest.firebaseapp.com",
  projectId: "majorbudapest",
  storageBucket: "majorbudapest.firebasestorage.app",
  messagingSenderId: "802254853097",
  appId: "1:802254853097:web:3699e11b76b0efcafaf178",
  measurementId: "G-GXRXZEN96S"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence (try/catch because multiple tabs)
(async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("Firebase: Offline persistence aktivert");
  } catch (e) {
    console.warn("Firebase: Persistence ikke aktivert:", e && e.message);
  }
})();
