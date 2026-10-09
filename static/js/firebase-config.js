// ==========================================================================
// FIREBASE AUTHENTICATION CONFIGURATION (FIREBASE JS SDK v11)
// ==========================================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA2vuIbSaisn9iGL4vWF76_jgFhaTMJ8_4",
    authDomain: "ai-research-chatbot.firebaseapp.com",
    projectId: "ai-research-chatbot",
    storageBucket: "ai-research-chatbot.firebasestorage.app",
    messagingSenderId: "942422297748",
    appId: "1:942422297748:web:2f73d1b28b3a537aae3881",
    measurementId: "G-CD10G2VS4W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export Firebase authentication functions
export {
    app,
    auth,
    googleProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
    signOut,
    onAuthStateChanged
};