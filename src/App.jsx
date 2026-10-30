import { useRef, useState } from "react";

import CallControls from "./Components/CallControls";
import StatusIndicator from "./Components/StatusIndicator";
import TestOrders from "./Components/TestOrders";

import useSpeechRecognition from "./hooks/useSpeechRecognition";
import useTextToSpeech from "./hooks/useTextToSpeech";
import { sendChatMessage } from "./services/chatApi";

// NEW: Structured call outcome generator
import { buildCallOutcome } from "./utils/buildCallOutcome";

import "./App.css";

export default function App() {
  const [callActive, setCallActive] = useState(false);
  const [completedMessage, setCompletedMessage] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState("");

  const [callTranscript, setCallTranscript] = useState([]);

  // NEW: Structured post-call JSON
  const [callOutcome, setCallOutcome] = useState(null);

  const callActiveRef = useRef(false);
  const historyRef = useRef([]);
  const processingRef = useRef(false);
  const callSessionRef = useRef(0);
  const transcriptIdRef = useRef(0);

  function addTranscriptMessage(speaker, text) {
    const entry = {
      id: ++transcriptIdRef.current,
      speaker,
      text,
      timestamp: new Date().toISOString(),
    };

    setCallTranscript((previous) => [...previous, entry]);
  }

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

    addTranscriptMessage("Customer", message);

    async function processMessage() {
      try {
        const data = await sendChatMessage(message, historyRef.current);

        // Ignore responses from ended or older calls
        if (!callActiveRef.current || callSessionRef.current !== session) {
          return;
        }

        // Preserve Gemini conversation memory
        historyRef.current = [
          ...historyRef.current,
          { role: "user", text: message },
          { role: "model", text: data.reply },
        ].slice(-20);

        setAiReply(data.reply);
        setIsThinking(false);

        addTranscriptMessage("Aria", data.reply);

        // Speak Gemini's answer
        speak(data.reply, () => {
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

          addTranscriptMessage("Aria", fallback);

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
    const session = callSessionRef.current;

    callActiveRef.current = true;
    processingRef.current = false;
    historyRef.current = [];

    // Reset transcript for the new call
    transcriptIdRef.current = 0;
    setCallTranscript([]);

    // NEW: Clear previous call outcome
    setCallOutcome(null);

    setCallActive(true);
    setCompletedMessage("");
    setAiReply("");
    setChatError("");
    setIsThinking(false);

    const greeting =
      "Hi! I'm Aria from Aura Skincare. " + "How can I help you today?";

    addTranscriptMessage("Aria", greeting);

    speak(greeting, () => {
      if (callActiveRef.current && callSessionRef.current === session) {
        startListening();
      }
    });
  }

  // End the current call
  function handleEndCall() {
    // NEW: Generate structured JSON from the transcript
    const outcome = buildCallOutcome(callTranscript);
    setCallOutcome(outcome);

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

    // Preserve callTranscript and callOutcome
    // for post-call review.
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

        {/* Chronological conversation transcript */}
        <div className="transcript-box">
          <h3>Call Transcript</h3>

          {callTranscript.length === 0 ? (
            <p>Your conversation history will appear here.</p>
          ) : (
            <ol>
              {callTranscript.map((entry) => (
                <li key={entry.id}>
                  <p>
                    <strong>{entry.speaker}:</strong> {entry.text}
                  </p>
                  <small>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* NEW: Structured call outcome JSON */}
        <div className="transcript-box">
          <h3>Structured Call Outcome (JSON)</h3>

          {callOutcome ? (
            <pre
              style={{
                textAlign: "left",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {JSON.stringify(callOutcome, null, 2)}
            </pre>
          ) : (
            <p>End the call to generate the structured call summary.</p>
          )}
        </div>
      </section>

      <TestOrders />
    </main>
  );
}
