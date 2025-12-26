import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";

// Scoring algorithm:
// - Score starts at 5.0 (neutral)
// - Correct answer: score increases (diminishing returns as you approach 10)
// - Wrong answer: score decreases (bigger penalty at higher scores)
// - Score range: 0.0 to 10.0

function calculateNewScore(currentScore, isCorrect) {
  if (isCorrect) {
    // Increase score with diminishing returns near 10
    const increase = (10 - currentScore) * 0.25;
    return Math.min(10, currentScore + increase);
  } else {
    // Decrease score, bigger penalty at higher scores
    const decrease = currentScore * 0.3;
    return Math.max(0, currentScore - decrease);
  }
}

export function useWordProgress(userId) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadProgress() {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProgress(docSnap.data().wordProgress || {});
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [userId]);

  const updateWordScore = useCallback(async (wordId, isCorrect) => {
    if (!userId) return;

    const currentScore = progress[wordId]?.score ?? 5.0;
    const newScore = calculateNewScore(currentScore, isCorrect);
    const attempts = (progress[wordId]?.attempts ?? 0) + 1;
    const correct = (progress[wordId]?.correct ?? 0) + (isCorrect ? 1 : 0);

    const newProgress = {
      ...progress,
      [wordId]: {
        score: Math.round(newScore * 10) / 10, // Round to 1 decimal
        attempts,
        correct,
        lastReviewed: Date.now(),
      },
    };

    setProgress(newProgress);

    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, { wordProgress: newProgress }, { merge: true });
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    return newProgress[wordId].score;
  }, [userId, progress]);

  const getWordScore = useCallback((wordId) => {
    return progress[wordId]?.score ?? 5.0;
  }, [progress]);

  const isMemorized = useCallback((wordId) => {
    const wordProgress = progress[wordId];
    if (!wordProgress) return false;
    const { correct = 0, attempts = 0 } = wordProgress;
    // Memorized: at least 10 correct AND 90% accuracy
    return correct >= 10 && attempts > 0 && (correct / attempts) >= 0.9;
  }, [progress]);

  const getStudyWords = useCallback((words, options = {}) => {
    const { count = 10, excludeMemorized = false, randomOrder = false } = options;

    // Filter words if excluding memorized
    let availableWords = [...words];
    if (excludeMemorized) {
      availableWords = availableWords.filter(word => !isMemorized(word.id));
    }

    // Take first N words (sequential from beginning)
    let selected = availableWords.slice(0, count);

    // Shuffle if random order enabled
    if (randomOrder) {
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
      }
    }

    return selected;
  }, [progress, isMemorized]);

  const getStats = useCallback(() => {
    const wordIds = Object.keys(progress);
    if (wordIds.length === 0) {
      return { studied: 0, mastered: 0, learning: 0, avgScore: 0 };
    }

    const studied = wordIds.length;
    const mastered = wordIds.filter(id => isMemorized(id)).length;
    const learning = studied - mastered;
    const avgScore = Object.values(progress).reduce((sum, p) => sum + p.score, 0) / studied;

    return {
      studied,
      mastered,
      learning,
      avgScore: Math.round(avgScore * 10) / 10,
    };
  }, [progress, isMemorized]);

  return {
    progress,
    loading,
    updateWordScore,
    getWordScore,
    getStudyWords,
    getStats,
    isMemorized,
  };
}
