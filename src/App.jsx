import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";
import { LoginScreen } from "@/components/LoginScreen";
import { StudyScreen } from "@/components/StudyScreen";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <StudyScreen user={user} />;
}

export default App;
