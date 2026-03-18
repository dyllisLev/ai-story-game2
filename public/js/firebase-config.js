import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { getAuth, signInAnonymously }
  from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAaO9dQmykNuiaf23jh_QJVJFBZn4HsMZw",
  authDomain: "ai-story-game-5278.firebaseapp.com",
  projectId: "ai-story-game-5278",
  storageBucket: "ai-story-game-5278.firebasestorage.app",
  messagingSenderId: "571520885404",
  appId: "1:571520885404:web:cfc13ab40dd9a81edc4359"
};

let db = null;
let currentUser = null;

try {
  if (FIREBASE_CONFIG.apiKey) {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    const auth = getAuth(app);
    const userCredential = await signInAnonymously(auth);
    currentUser = userCredential.user;
  }
} catch (e) {
  console.warn('Firebase init failed:', e);
}

export { db, currentUser, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, serverTimestamp };
