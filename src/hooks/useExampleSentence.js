import { useState, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCvxbK_MNBtT9bGQpI_ZXbTtKM1OJZqqAw");

async function generateExample(word) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Generate ONE short, simple Japanese example sentence using the word "${word.japanese}" (${word.romaji}, meaning: ${word.english}).

Rules:
- Keep it very short (3-6 words)
- Beginner-friendly
- You may conjugate the word naturally
- Make it practical and useful

Return ONLY a JSON object:
{"japanese": "sentence", "romaji": "romanization", "english": "translation"}

No other text.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse response");
  }

  return JSON.parse(jsonMatch[0]);
}

export function useExampleSentence() {
  const [examples, setExamples] = useState({});
  const [loading, setLoading] = useState({});

  const getExample = useCallback(async (word) => {
    if (examples[word.id]) {
      return examples[word.id];
    }

    if (loading[word.id]) {
      return null;
    }

    setLoading(prev => ({ ...prev, [word.id]: true }));

    try {
      const docRef = doc(db, "examples", String(word.id));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const example = docSnap.data().example;
        setExamples(prev => ({ ...prev, [word.id]: example }));
        setLoading(prev => ({ ...prev, [word.id]: false }));
        return example;
      }

      const example = await generateExample(word);

      await setDoc(docRef, {
        wordId: word.id,
        word: word.japanese,
        example,
        createdAt: Date.now(),
      });

      setExamples(prev => ({ ...prev, [word.id]: example }));
      setLoading(prev => ({ ...prev, [word.id]: false }));
      return example;
    } catch (err) {
      console.error("Error getting example:", err);
      setLoading(prev => ({ ...prev, [word.id]: false }));
      return null;
    }
  }, [examples, loading]);

  const isLoading = useCallback((wordId) => {
    return loading[wordId] || false;
  }, [loading]);

  const getExampleSync = useCallback((wordId) => {
    return examples[wordId] || null;
  }, [examples]);

  return { getExample, getExampleSync, isLoading };
}
