import { useEffect, useRef, useState } from "react";

export default function useSpeechRecognition(onSpeechComplete) {
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const activeRef = useRef(false);
  const latestTextRef = useRef("");
  const finalTextRef = useRef("");
  const callbackRef = useRef(onSpeechComplete);

  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");

  // Keep the latest callback without recreating recognition.
  useEffect(() => {
    callbackRef.current = onSpeechComplete;
  }, [onSpeechComplete]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    // Finish a customer's turn.
    function finishTurn() {
      if (!activeRef.current) return;

      clearTimeout(timerRef.current);
      timerRef.current = null;

      const completedText = latestTextRef.current.trim();

      if (!completedText) return;

      console.log("Completed customer message:", completedText);

      activeRef.current = false;
      setIsListening(false);

      // Stop recognition after collecting the message.
      try {
        recognition.stop();
      } catch (err) {
        console.warn("Recognition stop:", err);
      }

      // Send completed text to App.jsx
      callbackRef.current?.(completedText);
    }

    // Receive recognized speech.
    recognition.onresult = (event) => {
      if (!activeRef.current) return;

      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript + " ";
        }
      }

      finalTextRef.current = finalText.trim();

      const combinedText = `${finalText} ${interimText}`.trim();

      latestTextRef.current = combinedText;
      setTranscript(combinedText);

      // Reset the timer whenever recognition updates.
      clearTimeout(timerRef.current);

      if (combinedText) {
        console.log("Speech detected:", combinedText);
        console.log("Starting silence timer...");

        timerRef.current = setTimeout(() => {
          console.log("Silence timer finished");
          finishTurn();
        }, 1500);
      }
    };

    recognition.onstart = () => {
      if (activeRef.current) {
        setIsListening(true);
        setError("");
        console.log("Microphone listening...");
      }
    };

    // Handle browser recognition ending automatically.
    recognition.onend = () => {
      setIsListening(false);

      if (!activeRef.current) {
        clearTimeout(timerRef.current);
        return;
      }

      // Chrome may stop before the timer completes.
      if (latestTextRef.current.trim()) {
        finishTurn();
      } else {
        activeRef.current = false;
        clearTimeout(timerRef.current);
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);

      if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        activeRef.current = false;
        clearTimeout(timerRef.current);
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Cleanup when the component unmounts.
    return () => {
      activeRef.current = false;
      clearTimeout(timerRef.current);

      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  // Start capturing customer speech.
  function startListening() {
    if (!recognitionRef.current || activeRef.current) {
      return;
    }

    clearTimeout(timerRef.current);

    latestTextRef.current = "";
    finalTextRef.current = "";

    setTranscript("");
    setError("");

    activeRef.current = true;

    try {
      recognitionRef.current.start();
    } catch (err) {
      activeRef.current = false;
      setError(err.message);
    }
  }

  // Stop recognition when the call ends.
  function stopListening() {
    activeRef.current = false;

    clearTimeout(timerRef.current);
    timerRef.current = null;

    recognitionRef.current?.abort();

    setIsListening(false);
  }

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
  };
}
