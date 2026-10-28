
import { useRef, useState } from "react";

import CallControls from "./Components/CallControls";
import StatusIndicator from "./Components/StatusIndicator";
import TestOrders from "./Components/TestOrders";

import useSpeechRecognition from "./hooks/useSpeechRecognition";
import useTextToSpeech from "./hooks/useTextToSpeech";

import "./App.css";

export default function App() {
  // 1. Call state
  const [callActive, setCallActive] = useState(false);

  // 2. Stores the customer's completed message
  const [completedMessage, setCompletedMessage] = useState("");

  // 3. Tracks whether the call is active inside callbacks
  const callActiveRef = useRef(false);

  // 4. Speech recognition hook
  const {
    transcript,
    isListening,
    error: recognitionError,
    startListening,
    stopListening,
  } = useSpeechRecognition((message) => {
    // Called after approximately 1.5 seconds of silence
    if (callActiveRef.current) {
      console.log("Customer message:", message);
      setCompletedMessage(message);
    }
  });

  // 5. Text-to-speech hook
  const {
    speak,
    stopSpeaking,
    isSpeaking,
    error: speechError,
  } = useTextToSpeech();

  // 6. Determine the current agent state
  const status = isSpeaking
    ? "speaking"
    : isListening
      ? "listening"
      : callActive && completedMessage
        ? "thinking"
        : "idle";

  // 7. Start call
  function handleStartCall() {
    if (callActiveRef.current) return;

    setCompletedMessage("");
    callActiveRef.current = true;
    setCallActive(true);

    const greeting =
      "Hi! I'm Aria from Aura Skincare. " +
      "How can I help you today?";

    // Aria speaks first
    speak(greeting, () => {
      // Start listening only if the call is still active
      if (callActiveRef.current) {
        startListening();
      }
    });
  }

  // 8. End call
  function handleEndCall() {
    callActiveRef.current = false;
    setCallActive(false);

    stopSpeaking();
    stopListening();

    setCompletedMessage("");
  }

  return (
    <main className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-icon">✦</div>

        <div>
          <h1>Aria</h1>
          <p>Aura Skincare · AI Voice Support</p>
        </div>
      </header>

      {/* Main call panel */}
      <section className="call-panel">
        <div className="microphone-icon">🎙️</div>

        {/* Listening / Thinking / Speaking */}
        <StatusIndicator status={status} />

        <p className="call-description">
          Ask about orders, shipping, returns,
          refunds or cancellations.
        </p>

        {/* Call buttons */}
        <CallControls
          isCallActive={callActive}
          onStart={handleStartCall}
          onEnd={handleEndCall}
        />

        {/* Error handling */}
        {(recognitionError || speechError) && (
          <p role="alert" className="error-message">
            {recognitionError || speechError}
          </p>
        )}

        {/* Live speech recognition */}
        <div className="transcript-box">
          <h3>Recognized Speech</h3>

          <p>
            {transcript ||
              "Your spoken words will appear here..."}
          </p>
        </div>

        {/* Completed customer message */}
        <div className="transcript-box">
          <h3>Completed Customer Message</h3>

          <p>
            {completedMessage ||
              "Waiting for the customer to finish speaking..."}
          </p>
        </div>
      </section>

      {/* Sample orders */}
      <TestOrders />
    </main>
  );
}
