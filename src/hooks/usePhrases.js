import { useState, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { generateExamplePhrases } from "@/services/gemini";

export function usePhrases() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPhrases = useCallback(async (word) => {
    setLoading(true);
    setError(null);

    try {
      // Check if phrases already exist in Firestore
      const docRef = doc(db, "phrases", String(word.id));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setLoading(false);
        return docSnap.data().phrases;
      }

      // Generate new phrases with Gemini
      const phrases = await generateExamplePhrases(word);

      // Save to Firestore
      await setDoc(docRef, {
        wordId: word.id,
        japanese: word.japanese,
        phrases,
        createdAt: Date.now(),
      });

      setLoading(false);
      return phrases;
    } catch (err) {
      console.error("Error getting phrases:", err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  return { getPhrases, loading, error };
}
