import { useState, useCallback, useRef } from "react";
import { generateSpeech } from "@/services/geminiTTS";

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(null); // ID of currently speaking text
  const [loading, setLoading] = useState(null); // ID of currently loading text
  const audioRef = useRef(null);

  const speak = useCallback(async (text, id) => {
    // If clicking the same item that's speaking, stop it
    if (speaking === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setSpeaking(null);
      return;
    }

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      setLoading(id);
      // Get audio URL (from Firebase Storage cache or generate new)
      const audioUrl = await generateSpeech(text);
      setLoading(null);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setSpeaking(id);
      audio.onended = () => setSpeaking(null);
      audio.onerror = () => {
        console.error("Audio playback error");
        setSpeaking(null);
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setLoading(null);
      setSpeaking(null);
    }
  }, [speaking]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeaking(null);
  }, []);

  const isSpeaking = useCallback(
    (id) => speaking === id,
    [speaking]
  );

  const isLoading = useCallback(
    (id) => loading === id,
    [loading]
  );

  return {
    speak,
    stop,
    speaking,
    isSpeaking,
    isLoading,
  };
}
