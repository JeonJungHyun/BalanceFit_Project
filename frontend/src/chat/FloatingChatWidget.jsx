import { useState } from "react";
import "./FloatingChatWidget.css";

function ChatIcon() {
  return (
    <svg className="floating-chat-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.5 17.5h5.9l4.3 3.1c.7.5 1.7 0 1.7-.9v-2.2h.1c2.3 0 4-1.7 4-3.9V7.4c0-2.2-1.7-3.9-4-3.9h-12c-2.3 0-4 1.7-4 3.9v5.2c0 2.2 1.7 3.9 4 3.9Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M7.5 9.2h9M7.5 12.4h5.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="floating-chat-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

export default function FloatingChatWidget() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="floating-chat-widget">
      {isChatOpen && (
        <section className="floating-chat-panel" aria-label="Chat panel">
          <div className="floating-chat-panel-header">
            <strong>Chat</strong>
          </div>
          <div className="floating-chat-panel-body">
            <p>Chat list will appear here.</p>
          </div>
        </section>
      )}

      <button
        type="button"
        className={`floating-chat-button ${isChatOpen ? "is-open" : ""}`}
        onClick={() => setIsChatOpen((current) => !current)}
        aria-label={isChatOpen ? "Close chat" : "Open chat"}
        aria-expanded={isChatOpen}
      >
        {isChatOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
