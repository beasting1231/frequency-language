import { useState, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCvxbK_MNBtT9bGQpI_ZXbTtKM1OJZqqAw");

async function generateBreakdown(phrase) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a Japanese language teacher. Break down this Japanese sentence for a beginner:

Japanese: ${phrase.japanese}
Romaji: ${phrase.romaji}
English: ${phrase.english}

Provide a detailed breakdown of each word/particle in the sentence. Explain:
1. What each word means
2. The grammatical role of each word/particle
3. How they combine to form the meaning

Return ONLY a JSON object with this structure:
{
  "words": [
    {
      "japanese": "the word in Japanese",
      "romaji": "romanization",
      "meaning": "English meaning",
      "role": "grammatical role (noun, verb, particle, etc.)"
    }
  ],
  "explanation": "A brief explanation of how the sentence structure works and any cultural/grammatical notes"
}

Return only the JSON, no other text.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse response");
  }

  return JSON.parse(jsonMatch[0]);
}

export function usePhraseBreakdown() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getBreakdown = useCallback(async (phrase, wordId, phraseIndex) => {
    setLoading(true);
    setError(null);

    const docId = `${wordId}_${phraseIndex}`;

    try {
      // Check if breakdown already exists in Firestore
      const docRef = doc(db, "breakdowns", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setLoading(false);
        return docSnap.data().breakdown;
      }

      // Generate new breakdown with Gemini
      const breakdown = await generateBreakdown(phrase);

      // Save to Firestore
      await setDoc(docRef, {
        wordId,
        phraseIndex,
        phrase,
        breakdown,
        createdAt: Date.now(),
      });

      setLoading(false);
      return breakdown;
    } catch (err) {
      console.error("Error getting breakdown:", err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  return { getBreakdown, loading, error };
}
