export default function CallControls({ isCallActive, onStart, onEnd }) {
  return (
    <div className="call-controls">
      <button
        className="start-button"
        onClick={onStart}
        disabled={isCallActive}
      >
        Start Call
      </button>

      <button className="end-button" onClick={onEnd} disabled={!isCallActive}>
        End Call
      </button>
    </div>
  );
}
