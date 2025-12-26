import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdw9wKbxOgWPWNscM493KJbGwzfcQs0Xc",
  authDomain: "frequentlanguage.firebaseapp.com",
  projectId: "frequentlanguage",
  storageBucket: "frequentlanguage.firebasestorage.app",
  messagingSenderId: "495056404478",
  appId: "1:495056404478:web:afd76e80608d2d9303caaf",
  measurementId: "G-TDX9NNY70G"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, db, storage, googleProvider };
