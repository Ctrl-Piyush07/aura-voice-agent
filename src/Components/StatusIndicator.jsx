export default function StatusIndicator({ status }) {
  const labels = {
    idle: "Ready to assist you",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  return (
    <div className={`status-indicator ${status}`}>
      <span className="status-dot" />
      <span>{labels[status] ?? "Ready"}</span>
    </div>
  );
}
