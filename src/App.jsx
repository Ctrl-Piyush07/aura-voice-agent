import { useRef, useState } from "react";
import CallControls from "./components/CallControls";
import StatusIndicator from "./components/StatusIndicator";
import TestOrders from "./components/TestOrders";
import useSpeechRecognition from "./hooks/useSpeechRecognition";
import useTextToSpeech from "./hooks/useTextToSpeech";
import "./App.css";

export default function App() {
  const [callActive, setCallActive] = useState(false);
  const callActiveRef = useRef(false);

  const {
    transcript,
    isListening,
    error: recognitionError,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  const {
    speak,
    stopSpeaking,
    isSpeaking,
    error: speechError,
  } = useTextToSpeech();

  const status = isSpeaking ? "speaking" : isListening ? "listening" : "idle";

  function handleStartCall() {
    callActiveRef.current = true;
    setCallActive(true);

    const greeting =
      "Hi! I'm Aria from Aura Skincare. " + "How can I help you today?";

    speak(greeting, () => {
      if (callActiveRef.current) {
        startListening();
      }
    });
  }

  function handleEndCall() {
    callActiveRef.current = false;
    setCallActive(false);
    stopSpeaking();
    stopListening();
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

        {(recognitionError || speechError) && (
          <p role="alert" className="error-message">
            {recognitionError || speechError}
          </p>
        )}

        <div className="transcript-box">
          <h3>Recognized Speech</h3>
          <p>{transcript || "Your spoken words will appear here..."}</p>
        </div>
      </section>

      <TestOrders />
    </main>
  );
}
