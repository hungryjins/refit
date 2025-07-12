import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";

let app: any = null;
let auth: any = null;
let initializationAttempted = false;

// Lazy initialization function
const initializeFirebase = () => {
  if (initializationAttempted) return auth;
  initializationAttempted = true;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  // Check if we have valid-looking Firebase config
  if (!apiKey || !projectId || !appId ||
      !apiKey.startsWith('AIza') ||
      apiKey.length < 30) {
    console.warn("Firebase configuration incomplete or invalid - running in guest mode");
    return null;
  }

  // Additional validation for project ID format
  if (!projectId.includes('-') || projectId.length < 10) {
    console.warn("Firebase project ID format invalid - running in guest mode");
    return null;
  }

  try {
    const firebaseConfig = {
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
      appId,
    };

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log("Firebase initialized successfully");
    return auth;
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
    auth = null;
    return null;
  }
};

export { auth };

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  const firebaseAuth = initializeFirebase();
  if (!firebaseAuth) {
    alert("Firebase authentication is not configured. Please check your API keys or use guest mode.");
    return;
  }
  signInWithRedirect(firebaseAuth, provider);
};

export const signOutUser = () => {
  const firebaseAuth = initializeFirebase();
  if (!firebaseAuth) return Promise.resolve();
  return signOut(firebaseAuth);
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const firebaseAuth = initializeFirebase();
  if (!firebaseAuth) {
    // If Firebase is not configured, always call callback with null (guest mode)
    setTimeout(() => callback(null), 0);
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(firebaseAuth, callback);
};