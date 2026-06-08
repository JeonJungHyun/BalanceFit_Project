import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBell,
  FaChevronRight,
  FaCog,
  FaCommentDots,
  FaGlobe,
  FaHome,
  FaPaperPlane,
  FaRegClock,
  FaSearch,
} from "react-icons/fa";
import "./FloatingChatWidget.css";

const CHAT_API_BASE_URL = "http://localhost:8080/chats";
const USER_API_BASE_URL = "http://localhost:8080/users";
const SUPPORT_USER_ID = "support";
const MOCK_ROOM_ID = "mock-support-room";
const mockSupportRoom = {
  roomId: MOCK_ROOM_ID,
  memberId: "test-member",
  supportId: SUPPORT_USER_ID,
  partnerName: "밸런스핏 상담",
  partnerRole: "SUPPORT",
  lastMessage: "백엔드 없이 채팅 흐름을 확인할 수 있어요.",
  lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
};
const mockInitialMessages = [
  {
    messageId: "mock-message-welcome",
    senderId: SUPPORT_USER_ID,
    message: "안녕하세요. 이 방은 로그인, DB, 백엔드 없이 동작하는 채팅 테스트 모드입니다.",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];
const defaultConversations = [];
const tabs = [
  { id: "home", label: "홈", icon: FaHome },
  { id: "chat", label: "대화", icon: FaCommentDots },
  { id: "settings", label: "설정", icon: FaCog },
];
const inquiryOptions = [
  { icon: "🙋🏻‍♀️", label: "무료 체험" },
  { icon: "📅", label: "수업/예약 문의" },
  { icon: "🙋", label: "자주 묻는 질문" },
  { icon: "🎸", label: "기타 문의" },
];
const languageOptions = [
  { value: "ko", nativeLabel: "한국어", englishLabel: "Korean", group: "모든 번역 지원" },
  { value: "en", nativeLabel: "English", englishLabel: "English", group: "모든 번역 지원" },
  { value: "ja", nativeLabel: "日本語", englishLabel: "Japanese", group: "모든 번역 지원" },
  { value: "ar", nativeLabel: "العربية", englishLabel: "Arabic", group: "메시지 번역 지원" },
  { value: "ca", nativeLabel: "Català", englishLabel: "Catalan", group: "메시지 번역 지원" },
  { value: "zh", nativeLabel: "中文", englishLabel: "Chinese", group: "메시지 번역 지원" },
  { value: "hr", nativeLabel: "Hrvatski", englishLabel: "Croatian", group: "메시지 번역 지원" },
  { value: "cs", nativeLabel: "Čeština", englishLabel: "Czech", group: "메시지 번역 지원" },
  { value: "da", nativeLabel: "Dansk", englishLabel: "Danish", group: "메시지 번역 지원" },
  { value: "nl", nativeLabel: "Nederlands", englishLabel: "Dutch", group: "메시지 번역 지원" },
  { value: "fi", nativeLabel: "Suomi", englishLabel: "Finnish", group: "메시지 번역 지원" },
  { value: "fr", nativeLabel: "Français", englishLabel: "French", group: "메시지 번역 지원" },
  { value: "de", nativeLabel: "Deutsch", englishLabel: "German", group: "메시지 번역 지원" },
  { value: "es", nativeLabel: "Español", englishLabel: "Spanish", group: "메시지 번역 지원" },
];
const messagesByLanguage = {
  ko: {
    tabs: { home: "홈", chat: "대화", settings: "설정" },
    brandName: "밸런스핏",
    operatingHours: "월요일 오전 10:00부터 운영해요",
    greeting: "안녕하세요 회원님🙇‍♂️",
    helpQuestion: "무슨 도움이 필요하신가요?",
    inquiryButton: "문의하기",
    newInquiryButton: "새 문의하기",
    chatTitle: "대화",
    instructorEmpty: "문의가 들어오고 있어요!",
    chatEmpty: "대화를 시작해보세요",
    inquiryIntro: "밸런스핏 이용 안내는 아래 가이드를 통해 확인하실 수 있습니다.",
    inquiryQuestion: "무슨 도움이 필요하신가요?🥰",
    inquiryStarted: "상담 시작",
    inquiryChoiceTitle: "문의 유형을 선택해주세요",
    inquiryChoiceGuide: "가장 가까운 항목을 고르면 더 빠르게 도와드릴게요.",
    settingsTitle: "설정",
    memberFallback: "회원",
    supportSettings: "상담 환경",
    language: "언어",
    notificationSound: "알림음",
    languageSearchPlaceholder: "검색어를 입력해주세요",
    languageGroups: { all: "모든 번역 지원", message: "메시지 번역 지원" },
    notificationPermissionAlert: "브라우저 알림 권한이 꺼져 있어요. 알림을 받으려면 브라우저 설정에서 권한을 허용해주세요.",
    notificationPreviewBody: "알림음이 켜졌어요.",
    turnSoundOn: "알림음 켜기",
    turnSoundOff: "알림음 끄기",
    backToConversations: "대화 목록으로 돌아가기",
    closeLanguage: "언어 선택 닫기",
    languageDialog: "언어 선택",
    consultationRoom: (name) => `${name}님과의 상담방입니다.`,
    inquiryOptions: {
      "비용 문의": "비용 문의",
      "데이터 이관": "데이터 이관",
      "무료 체험": "무료 체험",
      "수업/예약 문의": "수업/예약 문의",
      "도입 문의": "도입 문의",
      "자주 묻는 질문": "자주 묻는 질문",
      "운영자료 무료로 받기": "운영자료 무료로 받기",
      "마케팅/제휴 문의": "마케팅/제휴 문의",
      "기타 문의": "기타 문의",
    },
  },
  en: {
    tabs: { home: "Home", chat: "Chat", settings: "Settings" },
    brandName: "BalanceFit",
    operatingHours: "Open from Monday 10:00 AM",
    greeting: "Hello, member🙇‍♂️",
    helpQuestion: "How can we help?",
    inquiryButton: "Contact us",
    newInquiryButton: "New inquiry",
    chatTitle: "Chat",
    instructorEmpty: "New inquiries are coming in!",
    chatEmpty: "Start a conversation",
    inquiryIntro: "You can check the BalanceFit guide below.",
    inquiryQuestion: "How can we help?🥰",
    inquiryStarted: "Consultation started",
    inquiryChoiceTitle: "Choose an inquiry type",
    inquiryChoiceGuide: "Pick the closest topic so we can help faster.",
    settingsTitle: "Settings",
    memberFallback: "Member",
    supportSettings: "Support settings",
    language: "Language",
    notificationSound: "Notification sound",
    languageSearchPlaceholder: "Enter a search term",
    languageGroups: { all: "Full translation support", message: "Message translation support" },
    notificationPermissionAlert: "Browser notifications are disabled. Please allow notifications in your browser settings.",
    notificationPreviewBody: "Notification sound is on.",
    turnSoundOn: "Turn notification sound on",
    turnSoundOff: "Turn notification sound off",
    backToConversations: "Back to conversations",
    closeLanguage: "Close language selection",
    languageDialog: "Language selection",
    consultationRoom: (name) => `Consultation room with ${name}.`,
    inquiryOptions: {
      "비용 문의": "Pricing",
      "데이터 이관": "Data migration",
      "무료 체험": "Free trial",
      "수업/예약 문의": "Class/reservation",
      "도입 문의": "Getting started",
      "자주 묻는 질문": "FAQ",
      "운영자료 무료로 받기": "Free resources",
      "마케팅/제휴 문의": "Partnership",
      "기타 문의": "Other",
    },
  },
  ja: {
    tabs: { home: "ホーム", chat: "会話", settings: "設定" },
    brandName: "バランスフィット",
    operatingHours: "月曜日 午前10:00から営業します",
    greeting: "こんにちは、会員さま🙇‍♂️",
    helpQuestion: "どのようなサポートが必要ですか？",
    inquiryButton: "問い合わせ",
    newInquiryButton: "新規問い合わせ",
    chatTitle: "会話",
    instructorEmpty: "お問い合わせが届いています！",
    chatEmpty: "会話を始めてみましょう",
    inquiryIntro: "バランスフィットの利用案内は下のガイドで確認できます。",
    inquiryQuestion: "どのようなサポートが必要ですか？🥰",
    inquiryStarted: "相談開始",
    inquiryChoiceTitle: "問い合わせ種別を選択してください",
    inquiryChoiceGuide: "近い項目を選ぶと、より早くご案内できます。",
    settingsTitle: "設定",
    memberFallback: "会員",
    supportSettings: "相談環境",
    language: "言語",
    notificationSound: "通知音",
    languageSearchPlaceholder: "検索語を入力してください",
    languageGroups: { all: "すべての翻訳対応", message: "メッセージ翻訳対応" },
    notificationPermissionAlert: "ブラウザ通知がオフです。通知を受け取るにはブラウザ設定で許可してください。",
    notificationPreviewBody: "通知音がオンになりました。",
    turnSoundOn: "通知音をオンにする",
    turnSoundOff: "通知音をオフにする",
    backToConversations: "会話一覧に戻る",
    closeLanguage: "言語選択を閉じる",
    languageDialog: "言語選択",
    consultationRoom: (name) => `${name}さんとの相談ルームです。`,
    inquiryOptions: {
      "비용 문의": "料金相談",
      "데이터 이관": "データ移行",
      "무료 체험": "無料体験",
      "수업/예약 문의": "レッスン・予約相談",
      "도입 문의": "導入相談",
      "자주 묻는 질문": "よくある質問",
      "운영자료 무료로 받기": "運営資料を受け取る",
      "마케팅/제휴 문의": "提携相談",
      "기타 문의": "その他",
    },
  },
  zh: {
    tabs: { home: "首页", chat: "对话", settings: "设置" },
    brandName: "BalanceFit",
    operatingHours: "周一上午10:00开始运营",
    greeting: "您好，会员🙇‍♂️",
    helpQuestion: "需要什么帮助？",
    inquiryButton: "咨询",
    newInquiryButton: "新咨询",
    chatTitle: "对话",
    instructorEmpty: "正在收到咨询！",
    chatEmpty: "开始对话吧",
    inquiryIntro: "您可以通过下方指南查看BalanceFit使用说明。",
    inquiryQuestion: "需要什么帮助？🥰",
    inquiryStarted: "咨询开始",
    inquiryChoiceTitle: "请选择咨询类型",
    inquiryChoiceGuide: "选择最接近的项目，我们会更快帮助您。",
    settingsTitle: "设置",
    memberFallback: "会员",
    supportSettings: "咨询环境",
    language: "语言",
    notificationSound: "通知音",
    languageSearchPlaceholder: "请输入搜索词",
    languageGroups: { all: "支持完整翻译", message: "支持消息翻译" },
    notificationPermissionAlert: "浏览器通知已关闭。请在浏览器设置中允许通知。",
    notificationPreviewBody: "通知音已开启。",
    turnSoundOn: "开启通知音",
    turnSoundOff: "关闭通知音",
    backToConversations: "返回对话列表",
    closeLanguage: "关闭语言选择",
    languageDialog: "语言选择",
    consultationRoom: (name) => `这是与${name}的咨询房间。`,
    inquiryOptions: {
      "비용 문의": "费用咨询",
      "데이터 이관": "数据迁移",
      "무료 체험": "免费体验",
      "수업/예약 문의": "课程/预约咨询",
      "도입 문의": "导入咨询",
      "자주 묻는 질문": "常见问题",
      "운영자료 무료로 받기": "领取运营资料",
      "마케팅/제휴 문의": "合作咨询",
      "기타 문의": "其他咨询",
    },
  },
};

function getMessages(language) {
  return messagesByLanguage[language] || messagesByLanguage.ko;
}

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

function ThinCheckIcon() {
  return (
    <svg className="floating-chat-language-check" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.4 4.2 4.2L19 6.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
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

function formatKoreanTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const period = date.getHours() >= 12 ? "오후" : "오전";
  const hour = date.getHours() % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${period} ${hour}:${minute}`;
}

function formatMessageTime(value, language) {
  if (language === "ko" || !messagesByLanguage[language]) return formatKoreanTime(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getAccountType() {
  return (
    localStorage.getItem("accountType") ||
    localStorage.getItem("userType") ||
    localStorage.getItem("role") ||
    "USER"
  ).toUpperCase();
}

function getNotificationSoundStorageKey(userId) {
  return `balanceFitNotificationSound:${userId || "guest"}`;
}

function getStoredNotificationSoundEnabled(userId) {
  return localStorage.getItem(getNotificationSoundStorageKey(userId)) === "true";
}

function createMockMessage(senderId, message) {
  return {
    messageId: `mock-message-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    senderId,
    message,
    createdAt: new Date().toISOString(),
  };
}

function createMockReply(userMessage) {
  if (userMessage.includes("예약")) {
    return "예약 문의 테스트 응답입니다. 실제 예약 데이터 없이 채팅 흐름만 확인합니다.";
  }

  if (userMessage.includes("비용") || userMessage.includes("가격")) {
    return "비용 문의 테스트 응답입니다. 백엔드 없이 로컬 상태로만 표시됩니다.";
  }

  return "테스트 상담원이 자동 응답했습니다. 이 메시지는 서버에 저장되지 않습니다.";
}

export default function FloatingChatWidget({
  conversations = defaultConversations,
  accountType,
  mockMode = false,
  initialOpen = false,
  mockUser = { userId: "test-member", name: "테스트 회원" },
}) {
  const [isChatOpen, setIsChatOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const [inquiryOpenedAt, setInquiryOpenedAt] = useState(null);
  const [chatRooms, setChatRooms] = useState(() => (mockMode ? [mockSupportRoom] : []));
  const [roomMessages, setRoomMessages] = useState(() => (mockMode ? { [MOCK_ROOM_ID]: mockInitialMessages } : {}));
  const [roomDrafts, setRoomDrafts] = useState({});
  const [roomScrollPositions, setRoomScrollPositions] = useState({});
  const [chatError, setChatError] = useState("");
  const [currentUserId, setCurrentUserId] = useState(mockMode ? mockUser.userId : localStorage.getItem("userId") || "");
  const [currentUserName, setCurrentUserName] = useState(mockMode ? mockUser.name : localStorage.getItem("userName") || "");
  const [userDisplayNames, setUserDisplayNames] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState("ko");
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [languageSearchTerm, setLanguageSearchTerm] = useState("");
  const [languageScrollbar, setLanguageScrollbar] = useState({ top: 0, height: 96, visible: false });
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(() => (
    getStoredNotificationSoundEnabled(mockMode ? mockUser.userId : localStorage.getItem("userId") || "")
  ));
  const [unreadCounts, setUnreadCounts] = useState({});
  const [inAppNotification, setInAppNotification] = useState(null);
  const widgetRef = useRef(null);
  const chatRoomContentRef = useRef(null);
  const chatRoomTextareaRef = useRef(null);
  const chatRoomSendingRef = useRef({});
  const languageListRef = useRef(null);
  const languageScrollbarTimerRef = useRef(null);
  const supportRoomSnapshotRef = useRef(new Map());
  const inAppNotificationTimerRef = useRef(null);
  const text = getMessages(selectedLanguage);
  const normalizedAccountType = (accountType || getAccountType()).toUpperCase();
  const isSupportUser = currentUserId === SUPPORT_USER_ID;

  const closeChat = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    setIsNewInquiryOpen(false);
    setInquiryOpenedAt(null);
    setIsLanguageModalOpen(false);
  };

  const minimizeChat = () => {
    setIsChatOpen(false);
    setIsLanguageModalOpen(false);
  };

  const getConversationDisplayName = (conversation) => {
    if (!conversation) return "";

    if (conversation.supportId === SUPPORT_USER_ID && conversation.memberId !== SUPPORT_USER_ID) {
      return isSupportUser
        ? `${userDisplayNames[conversation.memberId] || conversation.memberId} 회원님`
        : conversation.partnerName || "밸런스핏 상담";
    }

    if (normalizedAccountType === "INSTRUCTOR") {
      return `${conversation.partnerName} 님`;
    }

    return conversation.partnerRole === "INSTRUCTOR"
      ? `${conversation.partnerName} 강사님`
      : `${conversation.partnerName} 님`;
  };

  const getMessageSenderDisplayName = (message, conversation) => {
    if (!message || !conversation) return "";

    if (message.senderId === conversation.supportId) {
      return conversation.partnerName || "밸런스핏 상담";
    }

    if (message.senderId === conversation.memberId) {
      return `${userDisplayNames[conversation.memberId] || conversation.memberId} 회원님`;
    }

    return message.senderId || "";
  };

  const sortedConversations = useMemo(() => {
    const conversationMap = new Map();

    conversations.forEach((conversation) => {
      conversationMap.set(conversation.roomId || conversation.id, conversation);
    });

    chatRooms.forEach((conversation) => {
      conversationMap.set(conversation.roomId || conversation.id, conversation);
    });

    return [...conversationMap.values()].sort((a, b) => {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [chatRooms, conversations]);

  const unreadTotal = Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  const formatUnreadCount = (count) => (count > 99 ? "99+" : String(count));
  const supportNewInquiryCount = isSupportUser
    ? sortedConversations.filter((conversation) => (
        conversation.unreadMessageSupport || unreadCounts[conversation.roomId || conversation.id] > 0
      )).length
    : 0;

  const getNotificationSenderName = useCallback((roomId, message) => {
    const conversation = sortedConversations.find((item) => (item.roomId || item.id) === roomId);

    if (!message) return text.brandName;

    if (message.senderId === SUPPORT_USER_ID || message.senderId === conversation?.supportId) {
      return conversation?.partnerName || "밸런스핏 상담";
    }

    if (message.senderId === conversation?.memberId) {
      return `${userDisplayNames[conversation.memberId] || conversation.memberId || text.memberFallback} 회원님`;
    }

    return message.senderName || message.senderId || text.brandName;
  }, [sortedConversations, text.brandName, text.memberFallback, userDisplayNames]);

  const emptyMessage = normalizedAccountType === "INSTRUCTOR"
    ? text.instructorEmpty
    : text.chatEmpty;

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

  useEffect(() => {
    return () => {
      window.clearTimeout(inAppNotificationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mockMode) return undefined;

    let isMounted = true;

    const syncAuthenticatedUser = () => {
      fetch(`${USER_API_BASE_URL}/me`, { credentials: "include" })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to load current user");
          return response.json();
        })
        .then((user) => {
          if (!isMounted) return;

          const nextUserId = user?.userId || "";
          const nextName = user?.name || nextUserId;
          setCurrentUserId(nextUserId);
          setCurrentUserName(nextName);
          if (nextUserId) localStorage.setItem("userId", nextUserId);
          if (nextName) localStorage.setItem("userName", nextName);
        })
        .catch(() => {
          if (!isMounted) return;
          setCurrentUserId(localStorage.getItem("userId") || "");
          setCurrentUserName(localStorage.getItem("userName") || "");
        });
    };

    syncAuthenticatedUser();
    window.addEventListener("focus", syncAuthenticatedUser);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", syncAuthenticatedUser);
    };
  }, [mockMode]);

  useEffect(() => {
    if (mockMode) return;

    setSelectedConversation(null);
    setIsNewInquiryOpen(false);
    setInquiryOpenedAt(null);
    setChatRooms([]);
    setRoomMessages({});
    setRoomDrafts({});
    setRoomScrollPositions({});
    setChatError("");
    setNotificationSoundEnabled(getStoredNotificationSoundEnabled(currentUserId));
  }, [currentUserId, mockMode]);

  useEffect(() => {
    if (mockMode) return undefined;
    if (!isChatOpen || !currentUserId) return undefined;

    let isMounted = true;

    fetch(`${CHAT_API_BASE_URL}/rooms`, { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load chat rooms");
        return response.json();
      })
      .then((rooms) => {
        if (isMounted) setChatRooms(Array.isArray(rooms) ? rooms : []);
      })
      .catch(() => {
        if (isMounted) setChatError("대화 목록을 불러오지 못했어요.");
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserId, isChatOpen, mockMode]);

  useEffect(() => {
    if (!isSupportUser || chatRooms.length === 0) return undefined;

    const missingMemberIds = [...new Set(chatRooms
      .map((room) => room.memberId)
      .filter((memberId) => memberId && memberId !== SUPPORT_USER_ID && !userDisplayNames[memberId]))];

    if (missingMemberIds.length === 0) return undefined;

    let isMounted = true;

    Promise.all(missingMemberIds.map((memberId) => (
      fetch(`${USER_API_BASE_URL}/${encodeURIComponent(memberId)}`)
        .then((response) => {
          if (!response.ok) throw new Error("Failed to load member");
          return response.json();
        })
        .then((user) => [memberId, user?.name || memberId])
        .catch(() => [memberId, memberId])
    ))).then((entries) => {
      if (!isMounted) return;
      setUserDisplayNames((names) => ({
        ...names,
        ...Object.fromEntries(entries),
      }));
    });

    return () => {
      isMounted = false;
    };
  }, [chatRooms, isSupportUser, userDisplayNames]);

  const playNotificationPreview = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch {
      // Notification sound preview is optional.
    }
  }, []);

  const showNotificationPreview = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    new Notification(text.brandName, {
      body: text.notificationPreviewBody,
    });
  }, [text.brandName, text.notificationPreviewBody]);

  const notifyIncomingMessage = useCallback((roomId, message) => {
    if (!notificationSoundEnabled || !message || message.senderId === currentUserId) return;

    playNotificationPreview();

    if (!("Notification" in window) || Notification.permission !== "granted") return;

    new Notification(getNotificationSenderName(roomId, message), {
      body: message.message || text.notificationPreviewBody,
    });
  }, [
    currentUserId,
    getNotificationSenderName,
    notificationSoundEnabled,
    playNotificationPreview,
    text.notificationPreviewBody,
  ]);

  const toggleNotificationSound = async () => {
    if (notificationSoundEnabled) {
      setNotificationSoundEnabled(false);
      localStorage.setItem(getNotificationSoundStorageKey(currentUserId), "false");
      return;
    }

    setNotificationSoundEnabled(true);
    localStorage.setItem(getNotificationSoundStorageKey(currentUserId), "true");
    playNotificationPreview();

    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert(text.notificationPermissionAlert);
        return;
      }
    }

    if ("Notification" in window && Notification.permission === "denied") {
      alert(text.notificationPermissionAlert);
      return;
    }

    showNotificationPreview();
  };

  const selectedLanguageOption = languageOptions.find((language) => language.value === selectedLanguage) || languageOptions[0];
  const filteredLanguageOptions = languageOptions.filter((language) => {
    const keyword = languageSearchTerm.trim().toLowerCase();
    if (!keyword) return true;

    return `${language.nativeLabel} ${language.englishLabel}`.toLowerCase().includes(keyword);
  });
  const groupedLanguageOptions = filteredLanguageOptions.reduce((groups, language) => {
    if (!groups[language.group]) groups[language.group] = [];
    groups[language.group].push(language);
    return groups;
  }, {});

  useEffect(() => {
    if (!isLanguageModalOpen) return undefined;

    window.requestAnimationFrame(() => updateLanguageScrollbar(false));

    return () => {
      window.clearTimeout(languageScrollbarTimerRef.current);
    };
  }, [isLanguageModalOpen, languageSearchTerm]);

  const updateLanguageScrollbar = (visible = true) => {
    const list = languageListRef.current;
    if (!list) return;

    const { clientHeight, scrollHeight, scrollTop } = list;
    if (scrollHeight <= clientHeight) {
      setLanguageScrollbar((current) => ({ ...current, visible: false }));
      return;
    }

    const maxThumbHeight = clientHeight * 0.34;
    const rawHeight = (clientHeight / scrollHeight) * clientHeight;
    const height = Math.max(56, Math.min(maxThumbHeight, rawHeight));
    const maxTop = clientHeight - height;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;

    setLanguageScrollbar({ top, height, visible });
  };

  const showLanguageScrollbarBriefly = () => {
    updateLanguageScrollbar(true);
    window.clearTimeout(languageScrollbarTimerRef.current);
    languageScrollbarTimerRef.current = window.setTimeout(() => {
      setLanguageScrollbar((current) => ({ ...current, visible: false }));
    }, 700);
  };

  const loadRoomMessages = async (roomId) => {
    if (!currentUserId) throw new Error("Missing userId");

    if (mockMode) {
      return roomMessages[roomId] || mockInitialMessages;
    }

    const response = await fetch(
      `${CHAT_API_BASE_URL}/rooms/${encodeURIComponent(roomId)}/messages`,
      { credentials: "include" }
    );

    if (!response.ok) throw new Error("Failed to load messages");

    return response.json();
  };

  const openConversation = async (conversation) => {
    setActiveTab("chat");
    setSelectedConversation(conversation);
    setIsNewInquiryOpen(false);
    setInquiryOpenedAt(null);
    setChatError("");

    const roomId = conversation.roomId || conversation.id;
    clearRoomUnread(roomId);

    try {
      const messages = await loadRoomMessages(roomId);
      setRoomMessages((currentMessages) => ({
        ...currentMessages,
        [roomId]: Array.isArray(messages) ? messages : [],
      }));
    } catch {
      setChatError("메시지를 불러오지 못했어요.");
    }
  };

  const openSupportInquiryRoom = async () => {
    if (isSupportUser) {
      setActiveTab("chat");
      setIsNewInquiryOpen(false);
      setChatError("");
      return;
    }

    if (!currentUserId) {
      setChatError("로그인이 필요합니다.");
      return;
    }

    setChatError("");

    if (mockMode) {
      const room = {
        ...mockSupportRoom,
        memberId: currentUserId,
        lastMessageAt: new Date().toISOString(),
      };
      setChatRooms((rooms) => {
        const nextRooms = rooms.filter((existingRoom) => existingRoom.roomId !== room.roomId);
        return [room, ...nextRooms];
      });
      setRoomMessages((messages) => ({
        ...messages,
        [MOCK_ROOM_ID]: messages[MOCK_ROOM_ID] || mockInitialMessages,
      }));
      await openConversation(room);
      return;
    }

    try {
      const response = await fetch(
        `${CHAT_API_BASE_URL}/rooms/support`,
        { method: "POST", credentials: "include" }
      );

      if (!response.ok) throw new Error("Failed to create support room");

      const room = await response.json();
      setChatRooms((rooms) => {
        const nextRooms = rooms.filter((existingRoom) => existingRoom.roomId !== room.roomId);
        return [room, ...nextRooms];
      });
      await openConversation(room);
    } catch {
      setChatError("상담방을 열지 못했어요.");
    }
  };

  const selectedRoomId = selectedConversation?.roomId || selectedConversation?.id;
  const selectedRoomMessages = selectedRoomId ? roomMessages[selectedRoomId] || [] : [];
  const selectedRoomDraft = selectedRoomId ? roomDrafts[selectedRoomId] || "" : "";

  const showInAppNotification = useCallback((roomId, message) => {
    if (!message || message.senderId === currentUserId) return;

    window.clearTimeout(inAppNotificationTimerRef.current);
    setInAppNotification({
      roomId,
      title: getNotificationSenderName(roomId, message),
      message: message.message || text.chatTitle,
    });

    inAppNotificationTimerRef.current = window.setTimeout(() => {
      setInAppNotification(null);
    }, 3600);
  }, [currentUserId, getNotificationSenderName, text.chatTitle]);

  const handleIncomingMessage = useCallback((roomId, message) => {
    if (!roomId || !message || message.senderId === currentUserId) return;

    notifyIncomingMessage(roomId, message);

    if (roomId === selectedRoomId && isChatOpen) return;

    setUnreadCounts((counts) => ({
      ...counts,
      [roomId]: Math.min((counts[roomId] || 0) + 1, 99),
    }));
    showInAppNotification(roomId, message);
  }, [
    currentUserId,
    isChatOpen,
    notifyIncomingMessage,
    selectedRoomId,
    showInAppNotification,
  ]);

  const clearRoomUnread = (roomId) => {
    if (!roomId) return;

    setUnreadCounts((counts) => {
      if (!counts[roomId]) return counts;

      const nextCounts = { ...counts };
      delete nextCounts[roomId];
      return nextCounts;
    });
  };

  useEffect(() => {
    if (mockMode || !currentUserId) return undefined;

    let isMounted = true;

    const syncRoomsForInAppNotification = () => {
      fetch(`${CHAT_API_BASE_URL}/rooms`, { credentials: "include" })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to load chat rooms");
          return response.json();
        })
        .then((rooms) => {
          if (!isMounted) return;

          const nextRooms = Array.isArray(rooms) ? rooms : [];
          const previousSnapshot = supportRoomSnapshotRef.current;
          const nextSnapshot = new Map();
          let notificationMessage = "";
          let notificationRoomId = "";

          nextRooms.forEach((room) => {
            const roomId = room.roomId || room.id;
            if (!roomId) return;

            const marker = `${room.lastMessageAt || ""}|${room.lastMessage || ""}`;
            const previousMarker = previousSnapshot.get(roomId);
            nextSnapshot.set(roomId, marker);

            if (roomId === selectedRoomId) return;

            if (previousSnapshot.size > 0 && (!previousMarker || previousMarker !== marker)) {
              notificationMessage = room.lastMessage || text.chatTitle;
              notificationRoomId = roomId;
            }
          });

          supportRoomSnapshotRef.current = nextSnapshot;
          setChatRooms(nextRooms);

          if (notificationMessage) {
            handleIncomingMessage(notificationRoomId, {
              senderId: isSupportUser
                ? nextRooms.find((room) => (room.roomId || room.id) === notificationRoomId)?.memberId
                : nextRooms.find((room) => (room.roomId || room.id) === notificationRoomId)?.supportId,
              message: notificationMessage,
            });
          }
        })
        .catch(() => {
          // Background notification polling should not interrupt the chat UI.
        });
    };

    syncRoomsForInAppNotification();
    window.addEventListener("focus", syncRoomsForInAppNotification);
    const intervalId = window.setInterval(syncRoomsForInAppNotification, 1000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", syncRoomsForInAppNotification);
      window.clearInterval(intervalId);
    };
  }, [
    currentUserId,
    handleIncomingMessage,
    isSupportUser,
    mockMode,
    selectedRoomId,
    text.chatTitle,
  ]);

  const appendRoomMessage = (roomId, message) => {
    if (!roomId || !message) return;

    setRoomMessages((messages) => {
      const currentMessages = messages[roomId] || [];
      const exists = currentMessages.some((currentMessage) => (
        currentMessage.messageId && currentMessage.messageId === message.messageId
      ));

      if (exists) return messages;

      return {
        ...messages,
        [roomId]: [...currentMessages, message],
      };
    });

    setChatRooms((rooms) => rooms.map((room) => (
      room.roomId === roomId
        ? {
            ...room,
            lastMessage: message.message,
            lastMessageAt: message.createdAt,
          }
        : room
    )));
  };

  const resizeChatRoomTextarea = () => {
    const textarea = chatRoomTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 110)}px`;
  };

  const handleChatRoomDraftChange = (event) => {
    if (!selectedRoomId) return;

    setRoomDrafts((drafts) => ({
      ...drafts,
      [selectedRoomId]: event.target.value,
    }));
  };

  const handleChatRoomDraftKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    sendChatRoomMessage();
  };

  const handleChatRoomScroll = () => {
    if (!selectedRoomId || !chatRoomContentRef.current) return;

    setRoomScrollPositions((positions) => ({
      ...positions,
      [selectedRoomId]: chatRoomContentRef.current.scrollTop,
    }));
  };

  const sendChatRoomMessage = () => {
    if (!selectedRoomId) return;

    const trimmedMessage = selectedRoomDraft.trim();

    if (!trimmedMessage || chatRoomSendingRef.current[selectedRoomId]) return;

    chatRoomSendingRef.current[selectedRoomId] = true;

    if (mockMode) {
      const savedMessage = createMockMessage(currentUserId, trimmedMessage);
      appendRoomMessage(selectedRoomId, savedMessage);
      setRoomDrafts((drafts) => ({ ...drafts, [selectedRoomId]: "" }));

      window.requestAnimationFrame(() => {
        if (!chatRoomContentRef.current) return;
        chatRoomContentRef.current.scrollTop = chatRoomContentRef.current.scrollHeight;
        resizeChatRoomTextarea();
      });

      window.setTimeout(() => {
        const replyMessage = createMockMessage(SUPPORT_USER_ID, createMockReply(trimmedMessage));
        appendRoomMessage(selectedRoomId, replyMessage);
        handleIncomingMessage(selectedRoomId, replyMessage);
        chatRoomSendingRef.current[selectedRoomId] = false;
      }, 450);
      return;
    }

    fetch(
      `${CHAT_API_BASE_URL}/rooms/${encodeURIComponent(selectedRoomId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmedMessage }),
      }
    )
      .then((response) => {
        if (!response.ok) throw new Error("Failed to send message");
        return response.json();
      })
      .then((savedMessage) => {
        appendRoomMessage(selectedRoomId, savedMessage);
        setRoomDrafts((drafts) => ({ ...drafts, [selectedRoomId]: "" }));

        window.requestAnimationFrame(() => {
          if (!chatRoomContentRef.current) return;
          chatRoomContentRef.current.scrollTop = chatRoomContentRef.current.scrollHeight;
          resizeChatRoomTextarea();
        });
      })
      .catch(() => {
        setChatError("메시지를 보내지 못했어요.");
      })
      .finally(() => {
        chatRoomSendingRef.current[selectedRoomId] = false;
      });
  };

  useEffect(() => {
    if (mockMode) return undefined;
    if (!selectedRoomId || !currentUserId || !selectedConversation) return undefined;

    const stream = new EventSource(
      `${CHAT_API_BASE_URL}/rooms/${encodeURIComponent(selectedRoomId)}/stream`,
      { withCredentials: true }
    );

    stream.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        appendRoomMessage(selectedRoomId, message);
        handleIncomingMessage(selectedRoomId, message);

        window.requestAnimationFrame(() => {
          if (!chatRoomContentRef.current) return;
          chatRoomContentRef.current.scrollTop = chatRoomContentRef.current.scrollHeight;
        });
      } catch {
        // Ignore malformed stream events.
      }
    });

    stream.onerror = () => {
      // Let EventSource retry automatically when the connection briefly drops.
    };

    return () => {
      stream.close();
    };
  }, [currentUserId, selectedConversation, selectedRoomId, mockMode, notifyIncomingMessage]);

  useEffect(() => {
    resizeChatRoomTextarea();
  }, [selectedRoomDraft]);

  useEffect(() => {
    if (!selectedRoomId || !chatRoomContentRef.current) return;

    const savedScrollTop = roomScrollPositions[selectedRoomId];
    chatRoomContentRef.current.scrollTop = typeof savedScrollTop === "number"
      ? savedScrollTop
      : chatRoomContentRef.current.scrollHeight;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId || !chatRoomContentRef.current) return;

    window.requestAnimationFrame(() => {
      if (!chatRoomContentRef.current) return;
      chatRoomContentRef.current.scrollTop = chatRoomContentRef.current.scrollHeight;
    });
  }, [selectedRoomId, selectedRoomMessages.length]);

  const renderHome = () => {
    if (isSupportUser) {
      return (
        <div className="floating-chat-home">
          <header className="floating-chat-brand floating-chat-admin-brand">
            <div className="floating-chat-brand-mark" aria-hidden="true">B</div>
            <div>
              <h2>{text.brandName}</h2>
              <p className="floating-chat-brand-hours">실시간 상담 관리</p>
            </div>
          </header>

          <section className="floating-chat-welcome-card floating-chat-admin-card">
            <div className="floating-chat-admin-card-head">
              <div>
                <span className="floating-chat-admin-status">
                  <span aria-hidden="true"></span>
                  상담 대기 중
                </span>
                <strong>상담 데스크</strong>
                <p>회원 문의를 확인하고 응답해주세요.</p>
              </div>
              <button
                type="button"
                className="floating-chat-admin-action"
                onClick={() => setActiveTab("chat")}
              >
                문의함 보기 <FaPaperPlane aria-hidden="true" />
              </button>
            </div>
            <div className="floating-chat-admin-metrics" aria-label="상담 요약">
              새 문의 <strong>{supportNewInquiryCount}</strong>
              <span aria-hidden="true">·</span>
              읽지 않음 <strong>{unreadTotal}</strong>
              <span aria-hidden="true">·</span>
              전체 <strong>{sortedConversations.length}</strong>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="floating-chat-home">
        <header className="floating-chat-brand">
          <div className="floating-chat-brand-mark" aria-hidden="true">B</div>
          <div>
            <h2>{text.brandName}</h2>
            <p className="floating-chat-brand-hours">{text.operatingHours}</p>
          </div>
        </header>

        <section className="floating-chat-welcome-card">
          <p>
            {text.greeting}
            <br />
            {text.helpQuestion}
          </p>
          <button
            type="button"
            className="floating-chat-primary-action"
            onClick={openNewInquiry}
          >
            {text.inquiryButton} <FaPaperPlane aria-hidden="true" />
          </button>
          <div className="floating-chat-hours">
            <FaRegClock aria-hidden="true" />
            <span>{text.operatingHours}</span>
          </div>
        </section>
      </div>
    );
  };

  const openNewInquiry = () => {
    if (isSupportUser) {
      setActiveTab("chat");
      setIsNewInquiryOpen(false);
      return;
    }

    setActiveTab("chat");
    setSelectedConversation(null);
    setInquiryOpenedAt(new Date());
    setIsNewInquiryOpen(true);
  };

  const renderNewInquiry = () => (
    <div className="floating-chat-inquiry-room">
      <header className="floating-chat-inquiry-header">
        <button
          type="button"
          className="floating-chat-back-button"
          onClick={() => setIsNewInquiryOpen(false)}
          aria-label={text.backToConversations}
        >
          <FaChevronRight aria-hidden="true" />
        </button>
        <div className="floating-chat-inquiry-brand-mark" aria-hidden="true">B</div>
        <div>
          <h2>{text.brandName}</h2>
          <p>{text.operatingHours}</p>
        </div>
      </header>

      <section className="floating-chat-inquiry-message">
        <span className="floating-chat-inquiry-eyebrow">{text.inquiryStarted}</span>
        <p>
          {text.greeting}
          <br />
          {text.inquiryIntro}
          <br />
          <br />
          {text.inquiryQuestion}
        </p>
        <div className="floating-chat-message-meta">
          <span>{text.brandName}, {formatMessageTime(inquiryOpenedAt, selectedLanguage)}</span>
        </div>
      </section>

      <div className="floating-chat-inquiry-choice-header">
        <strong>{text.inquiryChoiceTitle}</strong>
        <span>{text.inquiryChoiceGuide}</span>
      </div>

      <div className="floating-chat-inquiry-options">
        {inquiryOptions.map((option) => (
          <button
            type="button"
            key={option.label}
            onClick={option.label === "기타 문의" ? openSupportInquiryRoom : undefined}
          >
            <span className="floating-chat-option-icon" aria-hidden="true">{option.icon}</span>
            <span>{text.inquiryOptions[option.label] || option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderChatRoom = () => (
    <div className="floating-chat-room">
      <header className="floating-chat-room-header">
        <button
          type="button"
          className="floating-chat-room-back"
          onClick={() => setSelectedConversation(null)}
          aria-label={text.backToConversations}
        >
          <FaChevronRight aria-hidden="true" />
        </button>
        <strong>{getConversationDisplayName(selectedConversation)}</strong>
        <span aria-hidden="true"></span>
      </header>

      <div
        className="floating-chat-room-content"
        ref={chatRoomContentRef}
        onScroll={handleChatRoomScroll}
      >
        {chatError && <div className="floating-chat-room-error">{chatError}</div>}
        {selectedRoomMessages.map((message) => {
          const isMine = message.senderId === currentUserId;

          return (
            <div
              className={`floating-chat-message-row ${isMine ? "is-mine" : "is-partner"}`}
              key={message.messageId || message.id}
            >
              {!isMine && (
                <span className="floating-chat-message-sender">
                  {getMessageSenderDisplayName(message, selectedConversation)}
                </span>
              )}
              <div className="floating-chat-message-line">
                {isMine && (
                  <time dateTime={new Date(message.createdAt).toISOString()}>{formatLastMessageTime(message.createdAt)}</time>
                )}
                <p className="floating-chat-message-bubble">{message.message}</p>
                {!isMine && (
                  <time dateTime={new Date(message.createdAt).toISOString()}>{formatLastMessageTime(message.createdAt)}</time>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="floating-chat-room-input"
        onSubmit={(event) => {
          event.preventDefault();
          sendChatRoomMessage();
        }}
      >
        <textarea
          ref={chatRoomTextareaRef}
          value={selectedRoomDraft}
          onChange={handleChatRoomDraftChange}
          onKeyDown={handleChatRoomDraftKeyDown}
          rows={1}
          placeholder="메시지를 입력하세요"
        />
        <button type="submit">전송</button>
      </form>
    </div>
  );

  const renderChat = () => (
    <div className={`floating-chat-tab-page ${selectedConversation ? "floating-chat-room-page" : ""}`}>
      {isNewInquiryOpen ? renderNewInquiry() : selectedConversation ? (
        renderChatRoom()
      ) : sortedConversations.length > 0 ? (
        <>
          <div className="floating-chat-list" role="list">
            {sortedConversations.map((conversation) => {
              const conversationRoomId = conversation.roomId || conversation.id;
              const unreadCount = unreadCounts[conversationRoomId] || 0;

              return (
                <button
                  type="button"
                  className="floating-chat-list-row"
                  key={conversationRoomId}
                  onClick={() => openConversation(conversation)}
                >
                  <span className="floating-chat-partner-name">{getConversationDisplayName(conversation)}</span>
                  <span className="floating-chat-list-meta">
                    {unreadCount > 0 && (
                      <span className="floating-chat-unread-badge">{formatUnreadCount(unreadCount)}</span>
                    )}
                    <time dateTime={conversation.lastMessageAt}>
                      {formatLastMessageTime(conversation.lastMessageAt)}
                    </time>
                  </span>
                </button>
              );
            })}
          </div>
          {!isSupportUser && (
            <button type="button" className="floating-chat-new-inquiry" onClick={openNewInquiry}>
              {text.newInquiryButton} <FaPaperPlane aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <div className="floating-chat-chat-empty">
          <h2 className="floating-chat-page-title">{text.chatTitle}</h2>
          <FaCommentDots aria-hidden="true" />
          {chatError && <p className="floating-chat-chat-error">{chatError}</p>}
          <strong>{emptyMessage}</strong>
          {!isSupportUser && (
            <button type="button" className="floating-chat-new-inquiry" onClick={openNewInquiry}>
              {text.newInquiryButton} <FaPaperPlane aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="floating-chat-tab-page floating-chat-settings">
      <h2 className="floating-chat-page-title">{text.settingsTitle}</h2>
      <section className="floating-chat-profile">
        <div className="floating-chat-profile-avatar" aria-hidden="true">B</div>
        <strong>{currentUserName || localStorage.getItem("userId") || text.memberFallback}</strong>
      </section>

      <section className="floating-chat-settings-list" aria-label={text.supportSettings}>
        <h3>{text.supportSettings}</h3>
        <button
          type="button"
          className="floating-chat-setting-row"
          onClick={() => {
            setLanguageSearchTerm("");
            setIsLanguageModalOpen(true);
          }}
        >
          <span><FaGlobe aria-hidden="true" /> {text.language}</span>
          <strong>{selectedLanguageOption.nativeLabel} <FaChevronRight aria-hidden="true" /></strong>
        </button>
        <div className="floating-chat-setting-row">
          <span><FaBell aria-hidden="true" /> {text.notificationSound}</span>
          <button
            type="button"
            className={`floating-chat-toggle ${notificationSoundEnabled ? "is-on" : ""}`}
            onClick={toggleNotificationSound}
            aria-pressed={notificationSoundEnabled}
            aria-label={notificationSoundEnabled ? text.turnSoundOff : text.turnSoundOn}
          ></button>
        </div>
      </section>

      {isLanguageModalOpen && (
        <div className="floating-chat-language-overlay" role="dialog" aria-modal="true" aria-label={text.languageDialog}>
          <div className="floating-chat-language-modal">
            <header className="floating-chat-language-header">
              <h3>{text.language}</h3>
              <button
                type="button"
                className="floating-chat-language-close"
                onClick={() => setIsLanguageModalOpen(false)}
                aria-label={text.closeLanguage}
              >
                <CloseIcon />
              </button>
            </header>
            <div className="floating-chat-language-search">
              <FaSearch aria-hidden="true" />
              <input
                type="search"
                placeholder={text.languageSearchPlaceholder}
                value={languageSearchTerm}
                onChange={(event) => setLanguageSearchTerm(event.target.value)}
              />
            </div>
            <div className="floating-chat-language-scroll">
              <div
                className="floating-chat-language-list"
                ref={languageListRef}
                onMouseEnter={() => updateLanguageScrollbar(true)}
                onMouseLeave={() => setLanguageScrollbar((current) => ({ ...current, visible: false }))}
                onScroll={showLanguageScrollbarBriefly}
                onWheel={showLanguageScrollbarBriefly}
              >
                {Object.entries(groupedLanguageOptions).map(([groupName, languages]) => (
                  <section key={groupName}>
                    <h4>{groupName === "모든 번역 지원" ? text.languageGroups.all : text.languageGroups.message}</h4>
                    {languages.map((language) => (
                      <button
                        type="button"
                        className={`floating-chat-language-option ${selectedLanguage === language.value ? "is-selected" : ""}`}
                        key={language.value}
                        onClick={() => {
                          setSelectedLanguage(language.value);
                          setIsLanguageModalOpen(false);
                        }}
                      >
                      <span>
                        <strong>{language.nativeLabel}</strong>
                        <i aria-hidden="true">·</i>
                        <em>{language.englishLabel}</em>
                      </span>
                        {selectedLanguage === language.value && <ThinCheckIcon />}
                      </button>
                    ))}
                  </section>
                ))}
              </div>
              <span
                className={`floating-chat-language-scrollbar ${languageScrollbar.visible ? "is-visible" : ""}`}
                style={{
                  height: `${languageScrollbar.height}px`,
                  transform: `translateY(${languageScrollbar.top}px)`,
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "chat") return renderChat();
    if (activeTab === "settings") return renderSettings();
    return renderHome();
  };

  const shouldRenderPanelContent = isChatOpen || activeTab !== "settings";

  return (
    <div className="floating-chat-widget" ref={widgetRef}>
      <section
        className={`floating-chat-panel ${isChatOpen ? "" : "is-hidden"} ${isNewInquiryOpen ? "is-inquiry-open" : ""} ${selectedConversation ? "is-room-open" : ""} ${isLanguageModalOpen ? "is-language-open" : ""}`}
        aria-label="Chat panel"
        aria-hidden={!isChatOpen}
      >
        {shouldRenderPanelContent && (
          <div className="floating-chat-panel-body" aria-live="polite">
            {renderActiveTab()}
          </div>
        )}

        {shouldRenderPanelContent && !isNewInquiryOpen && !selectedConversation && !isLanguageModalOpen && (
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
                  <span className="floating-chat-tab-icon-wrap">
                    <Icon aria-hidden="true" />
                    {tab.id === "chat" && unreadTotal > 0 && (
                      <span className="floating-chat-unread-badge floating-chat-tab-badge">
                        {formatUnreadCount(unreadTotal)}
                      </span>
                    )}
                  </span>
                  <span>{text.tabs[tab.id]}</span>
                </button>
              );
            })}
          </nav>
        )}
      </section>

      {inAppNotification && (
        <button
          type="button"
          className="floating-chat-in-app-notification"
          onClick={() => {
            const targetRoom = sortedConversations.find((conversation) => (
              (conversation.roomId || conversation.id) === inAppNotification.roomId
            ));
            setInAppNotification(null);
            setIsChatOpen(true);
            setActiveTab("chat");
            if (targetRoom) openConversation(targetRoom);
          }}
        >
          <strong>{inAppNotification.title}</strong>
          <span>{inAppNotification.message}</span>
        </button>
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
        {unreadTotal > 0 && !isChatOpen && (
          <span className="floating-chat-unread-badge floating-chat-button-badge">
            {formatUnreadCount(unreadTotal)}
          </span>
        )}
      </button>
    </div>
  );
}
