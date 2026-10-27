import { useState } from "react";
import CallControls from "./Components/CallControls";
import StatusIndicator from "./Components/StatusIndicator";
import TestOrders from "./Components/TestOrders";
import useSpeechRecognition from "./hooks/useSpeechRecognition";
import "./App.css";

export default function App() {
  const [callActive, setCallActive] = useState(false);

  const { transcript, isListening, error, startListening, stopListening } =
    useSpeechRecognition();

  const status = isListening ? "listening" : "idle";

  function handleStartCall() {
    setCallActive(true);
    startListening();
  }

  function handleEndCall() {
    stopListening();
    setCallActive(false);
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

        {error && (
          <p role="alert" className="error-message">
            {error}
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
