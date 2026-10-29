import { useRef, useState } from "react";

import CallControls from "./Components/CallControls";
import StatusIndicator from "./Components/StatusIndicator";
import TestOrders from "./Components/TestOrders";

import useSpeechRecognition from "./hooks/useSpeechRecognition";
import useTextToSpeech from "./hooks/useTextToSpeech";
import { sendChatMessage } from "./services/chatApi";

import "./App.css";

export default function App() {
  const [callActive, setCallActive] = useState(false);
  const [completedMessage, setCompletedMessage] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState("");

  const callActiveRef = useRef(false);
  const historyRef = useRef([]);
  const processingRef = useRef(false);
  const callSessionRef = useRef(0);

  // Speech recognition
  const {
    transcript,
    isListening,
    error: recognitionError,
    startListening,
    stopListening,
  } = useSpeechRecognition((message) => {
    if (!callActiveRef.current || processingRef.current) {
      return;
    }

    const session = callSessionRef.current;

    processingRef.current = true;
    setCompletedMessage(message);
    setIsThinking(true);
    setChatError("");
    setAiReply("");

    async function processMessage() {
      try {
        const data = await sendChatMessage(message, historyRef.current);

        // Ignore responses from ended or older calls
        if (!callActiveRef.current || callSessionRef.current !== session) {
          return;
        }

        // Preserve conversation memory
        historyRef.current = [
          ...historyRef.current,
          { role: "user", text: message },
          { role: "model", text: data.reply },
        ].slice(-20);

        setAiReply(data.reply);
        setIsThinking(false);

        // NEW: Speak Gemini's answer
        speak(data.reply, () => {
          // NEW: Resume listening after speaking finishes
          if (callActiveRef.current && callSessionRef.current === session) {
            startListening();
          }
        });
      } catch (error) {
        if (callActiveRef.current && callSessionRef.current === session) {
          console.error("Chat request failed:", error);

          const fallback =
            "Sorry, I'm having trouble responding right now. " +
            "Could you please try again?";

          setChatError("Unable to reach Aria's AI service. Please try again.");

          setIsThinking(false);

          // Speak a safe error message and resume listening
          speak(fallback, () => {
            if (callActiveRef.current && callSessionRef.current === session) {
              startListening();
            }
          });
        }
      } finally {
        if (callSessionRef.current === session) {
          processingRef.current = false;
          setIsThinking(false);
        }
      }
    }

    processMessage();
  });

  // Text-to-speech
  const {
    speak,
    stopSpeaking,
    isSpeaking,
    error: speechError,
  } = useTextToSpeech();

  // Agent status
  const status = isSpeaking
    ? "speaking"
    : isThinking
      ? "thinking"
      : isListening
        ? "listening"
        : "idle";

  // Start a new call
  function handleStartCall() {
    if (callActiveRef.current) return;

    callSessionRef.current += 1;
    callActiveRef.current = true;
    processingRef.current = false;
    historyRef.current = [];

    setCallActive(true);
    setCompletedMessage("");
    setAiReply("");
    setChatError("");
    setIsThinking(false);

    const greeting =
      "Hi! I'm Aria from Aura Skincare. " + "How can I help you today?";

    speak(greeting, () => {
      if (callActiveRef.current) {
        startListening();
      }
    });
  }

  // End the current call
  function handleEndCall() {
    callActiveRef.current = false;
    callSessionRef.current += 1;
    processingRef.current = false;
    historyRef.current = [];

    setCallActive(false);
    setIsThinking(false);

    stopSpeaking();
    stopListening();

    setCompletedMessage("");
    setAiReply("");
    setChatError("");
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <div className="brand-icon">✦</div>
        <div>
          <h1>Aria</h1>
          <p>Aura Skincare · AI Voice Support</p>
        </div>
      </header>

      <section className="call-panel">
        <div className="microphone-icon">🎙️</div>

        <StatusIndicator status={status} />

        <p className="call-description">
          Ask about orders, shipping, returns, refunds or cancellations.
        </p>

        <CallControls
          isCallActive={callActive}
          onStart={handleStartCall}
          onEnd={handleEndCall}
        />

        {(recognitionError || speechError || chatError) && (
          <p role="alert" className="error-message">
            {recognitionError || speechError || chatError}
          </p>
        )}

        <div className="transcript-box">
          <h3>Recognized Speech</h3>
          <p>{transcript || "Your spoken words will appear here..."}</p>
        </div>

        <div className="transcript-box">
          <h3>Completed Customer Message</h3>
          <p>
            {completedMessage ||
              "Waiting for the customer to finish speaking..."}
          </p>
        </div>

        <div className="transcript-box">
          <h3>Aria's AI Response</h3>
          <p>{aiReply || "Aria's response will appear here..."}</p>
        </div>
      </section>

      <TestOrders />
    </main>
  );
}
