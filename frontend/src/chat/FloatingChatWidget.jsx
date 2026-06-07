import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBell,
  FaChevronRight,
  FaCog,
  FaCommentDots,
  FaEdit,
  FaGlobe,
  FaHome,
  FaLanguage,
  FaPaperPlane,
  FaRegClock,
} from "react-icons/fa";
import "./FloatingChatWidget.css";

const defaultConversations = [];
const tabs = [
  { id: "home", label: "홈", icon: FaHome },
  { id: "chat", label: "대화", icon: FaCommentDots },
  { id: "settings", label: "설정", icon: FaCog },
];
const inquiryOptions = [
  { icon: "💳", label: "비용 문의" },
  { icon: "🧑‍💻", label: "데이터 이관" },
  { icon: "🙋🏻‍♀️", label: "무료 체험" },
  { icon: "🎯", label: "도입 문의" },
  { icon: "🙋", label: "자주 묻는 질문" },
  { icon: "🙂", label: "운영자료 무료로 받기" },
  { icon: "👻", label: "마케팅/제휴 문의" },
  { icon: "🎸", label: "기타 문의" },
];

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

function formatLastMessageTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const period = date.getHours() >= 12 ? "PM" : "AM";
  const hour = date.getHours() % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${period} ${String(hour).padStart(2, "0")}:${minute}`;
}

function getAccountType() {
  return (
    localStorage.getItem("accountType") ||
    localStorage.getItem("userType") ||
    localStorage.getItem("role") ||
    "USER"
  ).toUpperCase();
}

export default function FloatingChatWidget({ conversations = defaultConversations, accountType }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const widgetRef = useRef(null);

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    setIsNewInquiryOpen(false);
  };

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [conversations]);

  const normalizedAccountType = (accountType || getAccountType()).toUpperCase();
  const emptyMessage = normalizedAccountType === "INSTRUCTOR"
    ? "문의가 들어오고 있어요!"
    : "대화를 시작해보세요";

  useEffect(() => {
    if (!isChatOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!widgetRef.current?.contains(event.target)) {
        closeChat();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isChatOpen]);

  const renderHome = () => (
    <div className="floating-chat-home">
      <header className="floating-chat-brand">
        <div className="floating-chat-brand-mark" aria-hidden="true">B</div>
        <div>
          <h2>밸런스핏</h2>
          <button type="button" className="floating-chat-hours-link">
            운영시간 보기 <FaChevronRight aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="floating-chat-welcome-card">
        <p>
          안녕하세요 회원님👋
          <br />
          무슨 도움이 필요하신가요?
        </p>
        <button type="button" className="floating-chat-primary-action" onClick={() => setActiveTab("chat")}>
          문의하기 <FaPaperPlane aria-hidden="true" />
        </button>
        <div className="floating-chat-hours">
          <FaRegClock aria-hidden="true" />
          <span>월요일 오전 10:00부터 운영해요</span>
        </div>
      </section>
    </div>
  );

  const openNewInquiry = () => {
    setActiveTab("chat");
    setSelectedConversation(null);
    setIsNewInquiryOpen(true);
  };

  const renderNewInquiry = () => (
    <div className="floating-chat-inquiry-room">
      <header className="floating-chat-inquiry-header">
        <button
          type="button"
          className="floating-chat-back-button"
          onClick={() => setIsNewInquiryOpen(false)}
          aria-label="Back to conversations"
        >
          <FaChevronRight aria-hidden="true" />
        </button>
        <div className="floating-chat-inquiry-brand-mark" aria-hidden="true">B</div>
        <div>
          <h2>밸런스핏</h2>
          <p>월요일 오전 10:00부터 운영해요</p>
        </div>
      </header>

      <section className="floating-chat-inquiry-message">
        <span className="floating-chat-inquiry-eyebrow">상담 시작</span>
        <p>
          안녕하세요 회원님👋
          <br />
          밸런스핏 이용 안내는 아래 가이드를 통해 확인하실 수 있습니다.
          <br />
          <br />
          무슨 도움이 필요하신가요?🥰
        </p>
        <div className="floating-chat-message-meta">
          <span>밸런스핏, 오후 8:16</span>
        </div>
      </section>

      <div className="floating-chat-inquiry-choice-header">
        <strong>문의 유형을 선택해주세요</strong>
        <span>가장 가까운 항목을 고르면 더 빠르게 도와드릴게요.</span>
      </div>

      <div className="floating-chat-inquiry-options">
        {inquiryOptions.map((option) => (
          <button type="button" key={option.label}>
            <span className="floating-chat-option-icon" aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="floating-chat-tab-page">
      {isNewInquiryOpen ? renderNewInquiry() : selectedConversation ? (
        <div className="floating-chat-room-placeholder">
          <strong>{selectedConversation.partnerName}</strong>
          <p>{selectedConversation.partnerName}님과의 상담방입니다.</p>
        </div>
      ) : sortedConversations.length > 0 ? (
        <div className="floating-chat-list" role="list">
          {sortedConversations.map((conversation) => (
            <button
              type="button"
              className="floating-chat-list-row"
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
            >
              <span className="floating-chat-partner-name">{conversation.partnerName}</span>
              <time dateTime={conversation.lastMessageAt}>
                {formatLastMessageTime(conversation.lastMessageAt)}
              </time>
            </button>
          ))}
        </div>
      ) : (
        <div className="floating-chat-chat-empty">
          <h2 className="floating-chat-page-title">대화</h2>
          <FaCommentDots aria-hidden="true" />
          <strong>{emptyMessage}</strong>
          <button type="button" className="floating-chat-new-inquiry" onClick={openNewInquiry}>
            새 문의하기 <FaPaperPlane aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="floating-chat-tab-page floating-chat-settings">
      <h2 className="floating-chat-page-title">설정</h2>
      <section className="floating-chat-profile">
        <div className="floating-chat-profile-avatar" aria-hidden="true">B</div>
        <strong>이름</strong>
        <span>연락처 정보</span>
        <button type="button" className="floating-chat-edit-profile">
          <FaEdit aria-hidden="true" /> 정보 수정하기
        </button>
      </section>

      <section className="floating-chat-settings-list" aria-label="상담 환경">
        <h3>상담 환경</h3>
        <button type="button" className="floating-chat-setting-row">
          <span><FaGlobe aria-hidden="true" /> 언어</span>
          <strong>한국어 <FaChevronRight aria-hidden="true" /></strong>
        </button>
        <div className="floating-chat-setting-row">
          <span><FaLanguage aria-hidden="true" /> 메시지 번역 표시</span>
          <span className="floating-chat-toggle" aria-hidden="true"></span>
        </div>
        <div className="floating-chat-setting-row">
          <span><FaBell aria-hidden="true" /> 알림음</span>
          <span className="floating-chat-toggle" aria-hidden="true"></span>
        </div>
        <p className="floating-chat-version">v17.1.8</p>
      </section>
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "chat") return renderChat();
    if (activeTab === "settings") return renderSettings();
    return renderHome();
  };

  return (
    <div className="floating-chat-widget" ref={widgetRef}>
      {isChatOpen && (
        <section
          className={`floating-chat-panel ${isNewInquiryOpen ? "is-inquiry-open" : ""}`}
          aria-label="Chat panel"
        >
          <div className="floating-chat-panel-body" aria-live="polite">
            {renderActiveTab()}
          </div>

          {!isNewInquiryOpen && (
            <nav className="floating-chat-tab-bar" aria-label="Chat tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    type="button"
                    className={`floating-chat-tab-button ${activeTab === tab.id ? "is-active" : ""}`}
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== "chat") {
                        setSelectedConversation(null);
                        setIsNewInquiryOpen(false);
                      }
                    }}
                  >
                    <Icon aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </section>
      )}

      <button
        type="button"
        className={`floating-chat-button ${isChatOpen ? "is-open" : ""}`}
        onClick={() => {
          if (isChatOpen) {
            closeChat();
            return;
          }

          setIsChatOpen(true);
        }}
        aria-label={isChatOpen ? "Close chat" : "Open chat"}
        aria-expanded={isChatOpen}
      >
        {isChatOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
