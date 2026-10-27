import { useState } from "react";
import CallControls from "./Components/CallControls";
import StatusIndicator from "./Components/StatusIndicator";
import TestOrders from "./Components/TestOrders";
import "./App.css";

export default function App() {
  const [status, setStatus] = useState("idle");

  const isCallActive = status !== "idle";

  function handleStartCall() {
    setStatus("listening");
  }

  function handleEndCall() {
    setStatus("idle");
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
          isCallActive={isCallActive}
          onStart={handleStartCall}
          onEnd={handleEndCall}
        />
      </section>

      <TestOrders />
    </main>
  );
}
