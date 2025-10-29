// This is a placeholder for your actual Firebase config
const firebaseConfig = {
    apiKey: "test_key",
    authDomain: "test_domain",
    projectId: "test_id",
    storageBucket: "test_bucket",
    messagingSenderId: "test_sender",
    appId: "test_app",
    measurementId: "test_measurement"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

try {
    const app = initializeApp(firebaseConfig);
    window.firebase = {
        app,
        auth: getAuth(app),
        db: getFirestore(app),
        googleProvider: new GoogleAuthProvider(),
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signInWithPopup,
        signOut,
        onAuthStateChanged,
        updateProfile,
        doc,
        setDoc,
        getDoc,
        updateDoc
    };
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed. Please check your config.", error);
    window.firebase = {};
}
