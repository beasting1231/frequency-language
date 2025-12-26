import { useState, useCallback, useEffect, useRef } from "react";

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(null); // ID of currently speaking text
  const [voices, setVoices] = useState([]);
  const [japaneseVoice, setJapaneseVoice] = useState(null);
  const utteranceRef = useRef(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Find a Japanese voice
      const jaVoice = availableVoices.find(
        (voice) =>
          voice.lang === "ja-JP" ||
          voice.lang.startsWith("ja") ||
          voice.name.toLowerCase().includes("japanese")
      );
      setJapaneseVoice(jaVoice || null);
    };

    // Voices may not be immediately available
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speak = useCallback(
    (text, id) => {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      // If clicking the same item that's speaking, just stop
      if (speaking === id) {
        setSpeaking(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.9; // Slightly slower for learning

      if (japaneseVoice) {
        utterance.voice = japaneseVoice;
      }

      utterance.onstart = () => setSpeaking(id);
      utterance.onend = () => setSpeaking(null);
      utterance.onerror = () => setSpeaking(null);

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [japaneseVoice, speaking]
  );

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setSpeaking(null);
  }, []);

  const isSpeaking = useCallback(
    (id) => {
      return speaking === id;
    },
    [speaking]
  );

  return {
    speak,
    stop,
    speaking,
    isSpeaking,
    hasJapaneseVoice: !!japaneseVoice,
  };
}
