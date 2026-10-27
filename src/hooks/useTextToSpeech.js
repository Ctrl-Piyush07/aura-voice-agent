import { useEffect, useRef, useState } from "react";

export default function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState("");
  const utteranceRef = useRef(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text, onFinish) {
    if (!("speechSynthesis" in window)) {
      setError("Text-to-speech is not supported.");
      onFinish?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const indianVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === "en-in",
    );

    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setError("");
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
      onFinish?.();
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      utteranceRef.current = null;

      if (event.error !== "canceled" && event.error !== "interrupted") {
        setError(`Speech output error: ${event.error}`);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    error,
  };
}
