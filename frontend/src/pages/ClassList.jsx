import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FloatingChatWidget from "../chat/FloatingChatWidget";
import "./ClassList.css";

export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const navigate = useNavigate();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("all");
  const [filterResetKey, setFilterResetKey] = useState(0);
  const searchInputRef = useRef(null);
  const timeSelectRef = useRef(null);
  const chatWidgetRef = useRef(null);
  const ignoreSearchChangeUntilRef = useRef(0);
  const [openingChatClassId, setOpeningChatClassId] = useState("");

  const logout = () => {
    axios.post("http://localhost:8080/users/logout", null, { withCredentials: true })
      .finally(() => {
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        window.location.href = "/login";
      });
  };

  const goMyPage = () => navigate("/mypage");

  const fetchClasses = () => {
    axios.get("http://localhost:8080/classes")
      .then((res) => setClasses(res.data || []))
      .catch((err) => console.log("에러:", err));
  };

  const fetchMyReservations = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) { setMyReservations([]); return; }
    axios.get(`http://localhost:8080/reservations/user/${userId}`)
      .then((res) => setMyReservations(res.data || []))
      .catch(() => setMyReservations([]));
  };

  const reserve = (classId) => {
    const userId = localStorage.getItem("userId");
    if (!userId) { alert("로그인이 필요합니다."); return; }
    axios.post(`http://localhost:8080/reservations?userId=${userId}&classId=${classId}`)
      .then(async (res) => {
        alert(res.data.status === "WAITING" ? "대기 신청 완료" : "예약 완료");
        await fetchClasses();
        await fetchMyReservations();
      })
      .catch(() => alert("예약 실패"));
  };

  const consultInstructor = async (classItem) => {
    const userId = localStorage.getItem("userId");
    if (!userId) { alert("로그인이 필요합니다."); return; }
    if (!chatWidgetRef.current?.openInstructorRoom) { alert("상담방을 열지 못했어요."); return; }

    setOpeningChatClassId(classItem.classId);
    try {
      await chatWidgetRef.current.openInstructorRoom({
        classId: classItem.classId,
        instructorName: classItem.instructor,
      });
    } finally {
      setOpeningChatClassId("");
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchMyReservations();
  }, []);

  // 오늘 날짜 (시간 제거, 날짜만 비교용)
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const filteredClassesByDate = classes.filter((c) => {
    if (!c || !c.startTime) return false;
    const d = new Date(c.startTime);
    return (
      d.getFullYear() === currentYear &&
      d.getMonth() + 1 === currentMonth &&
      d.getDate() === selectedDate
    );
  });

  const groupByTime = (list) => {
    return list.reduce((acc, obj) => {
      if (!obj || !obj.startTime) return acc;
      const timeKey = obj.startTime.includes("T")
        ? obj.startTime.split("T")[1].substring(0, 5)
        : "10:00";
      if (!acc[timeKey]) acc[timeKey] = [];
      acc[timeKey].push(obj);
      return acc;
    }, {});
  };

  const getClassTimeKey = (item) => {
    if (!item || !item.startTime) return "10:00";
    return item.startTime.includes("T")
      ? item.startTime.split("T")[1].substring(0, 5)
      : "10:00";
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const hasActiveFilter = normalizedSearchTerm.length > 0 || selectedTimeFilter !== "all";
  const upcomingClasses = classes.filter((item) => {
    if (!item || !item.startTime) return false;
    const classDate = new Date(item.startTime);
    return new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate()) >= todayDateOnly;
  });
  const filterSourceClasses = hasActiveFilter ? upcomingClasses : filteredClassesByDate;
  const availableTimeFilters = Array.from(
    new Set(upcomingClasses.map((item) => getClassTimeKey(item)))
  ).sort();

  const filteredClasses = filterSourceClasses.filter((item) => {
    if (!item) return false;

    const matchesSearch = !normalizedSearchTerm ||
      `${item.title || ""} ${item.instructor || ""}`.toLowerCase().includes(normalizedSearchTerm);
    const matchesTime = selectedTimeFilter === "all" || getClassTimeKey(item) === selectedTimeFilter;

    return matchesSearch && matchesTime;
  });

  const groupedData = groupByTime(filteredClasses);

  const formatClassDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const resetClassFilters = () => {
    ignoreSearchChangeUntilRef.current = Date.now() + 300;
    if (searchInputRef.current) searchInputRef.current.value = "";
    if (timeSelectRef.current) timeSelectRef.current.value = "all";
    setSearchTerm("");
    setSelectedTimeFilter("all");
    setFilterResetKey((current) => current + 1);
  };

  const handleSearchTermChange = (event) => {
    if (Date.now() < ignoreSearchChangeUntilRef.current) {
      event.currentTarget.value = "";
      setSearchTerm("");
      return;
    }

    setSearchTerm(event.currentTarget.value);
  };

  const handleFilterBarResetCapture = (event) => {
    if (!event.target.closest("[data-filter-reset='true']")) return;

    event.preventDefault();
    event.stopPropagation();
    resetClassFilters();
  };

  const generateMonthCalendar = (year, month) => {
    const startDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const daysArray = [];
    for (let i = 0; i < startDay; i++) daysArray.push(null);
    for (let d = 1; d <= totalDays; d++) daysArray.push(d);
    return daysArray;
  };

  const allCalendarDays = generateMonthCalendar(currentYear, currentMonth);

  const getDisplayedDays = () => {
    if (isExpanded) return allCalendarDays;
    const selectedIndex = allCalendarDays.findIndex((d) => d === selectedDate);
    if (selectedIndex === -1) return allCalendarDays.slice(0, 7);
    const rowStart = Math.floor(selectedIndex / 7) * 7;
    return allCalendarDays.slice(rowStart, rowStart + 7);
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">클래스 목록</h1>
        <div className="top-buttons">
          <button className="mypage-btn" onClick={goMyPage}>마이페이지</button>
          <button className="logout-btn" onClick={logout}>로그아웃</button>
        </div>
      </div>

      <div className="top-calendar-row-zone">
        <div className="calendar-top-bar">
          <div className="calendar-title-group">
            <button className="month-nav-btn" onClick={() => currentMonth === 1 ? (setCurrentMonth(12), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)}>&lt;</button>
            <h2 className="calendar-year-month">{currentYear}년 {currentMonth}월</h2>
            <button className="month-nav-btn" onClick={() => currentMonth === 12 ? (setCurrentMonth(1), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)}>&gt;</button>
          </div>
          <div className="calendar-action-group">
            <button className="today-badge-btn" onClick={() => { const n = new Date(); setCurrentYear(n.getFullYear()); setCurrentMonth(n.getMonth() + 1); setSelectedDate(n.getDate()); }}>오늘</button>
            <button className="toggle-expand-btn" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? "▲ 접기" : "▼ 펼치기"}</button>
          </div>
        </div>

        <div className="calendar-weekday-grid">
          <span className="sun-head">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="sat-head">토</span>
        </div>

        <div className="calendar-days-grid">
          {getDisplayedDays().map((date, index) => {
            if (date === null) return <div key={`empty-${index}`} className="day-cell empty"></div>;
            const globalIdx = allCalendarDays.findIndex((d) => d === date);
            return (
              <div
                key={`date-${date}`}
                className={`day-cell ${selectedDate === date ? "selected" : ""} ${globalIdx % 7 === 0 ? "sunday" : ""} ${globalIdx % 7 === 6 ? "saturday" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                {date}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="class-search-filter-bar"
        onPointerDownCapture={handleFilterBarResetCapture}
        onMouseDownCapture={handleFilterBarResetCapture}
      >
        <div className="class-search-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            key={`search-${filterResetKey}`}
            ref={searchInputRef}
            type="search"
            placeholder="수업명 또는 강사명 검색"
            value={searchTerm}
            onInput={handleSearchTermChange}
            onChange={handleSearchTermChange}
            onCompositionEnd={(e) => {
              if (Date.now() < ignoreSearchChangeUntilRef.current) {
                e.currentTarget.value = "";
                setSearchTerm("");
              }
            }}
          />
        </div>
        <select
          key={`time-${filterResetKey}`}
          ref={timeSelectRef}
          className="class-time-filter-select"
          value={selectedTimeFilter}
          onChange={(e) => setSelectedTimeFilter(e.target.value)}
          aria-label="시간대 선택"
        >
          <option value="all">전체 시간</option>
          {availableTimeFilters.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            type="button"
            className="class-filter-reset-btn"
            data-filter-reset="true"
            onClick={resetClassFilters}
          >
            초기화
          </button>
        )}
      </div>

      <div className="bottom-cards-row-zone">
        {Object.keys(groupedData).length === 0 ? (
          <p className="empty-placeholder">
            {hasActiveFilter
              ? "검색 조건에 맞는 클래스가 없습니다."
              : `${currentMonth}월 ${selectedDate}일에 등록된 클래스 일정이 없습니다.`}
          </p>
        ) : (
          Object.keys(groupedData).sort().map((timeKey) => {
            const [hour, min] = timeKey.split(":");
            const endHour = parseInt(min) + 50 >= 60 ? String(parseInt(hour) + 1).padStart(2, "0") : hour;
            const endMin = parseInt(min) + 50 >= 60 ? String((parseInt(min) + 50) % 60).padStart(2, "0") : String(parseInt(min) + 50).padStart(2, "0");
            const timeRangeString = `${timeKey} ~ ${endHour}:${endMin}`;

            return (
              <div key={timeKey} className="time-group-block">
                <div className="time-section-header">
                  <span className="time-section-title">{timeRangeString}</span>
                </div>

                <div className="time-group-cards-stack">
                  {groupedData[timeKey].map((c) => {
                    const isFull = c.currentReservations >= c.maxCapacity;
                    const alreadyBooked = myReservations.some(
                      (r) => r.classId === c.classId && (r.status === "CONFIRMED" || r.status === "WAITING")
                    );

                    // 선택된 날짜가 오늘보다 이전인지 확인
                    const isPast = new Date(currentYear, currentMonth - 1, selectedDate) < todayDateOnly;

                    return (
                      <div key={c.classId} className="timeline-program-card">
                        <div className="program-left-contents">
                          <div className="program-top-row">
                            <img
                              src={`/images/instructors/${c.instructor}.png`}
                              alt={c.instructor}
                              className="instructor-thumbnail"
                              onError={(e) => {
                                if (!e.target.src.endsWith('.jpg')) {
                                  e.target.src = `/images/instructors/${c.instructor}.jpg`;
                                } else {
                                  e.target.src = "/images/instructors/default.jpg";
                                }
                              }}
                            />
                            <div className="program-title-group">
                              <h4 className="program-title-text">{c.title}</h4>
                              <span className="instructor-name-label">{c.instructor} 강사</span>
                            </div>
                          </div>
                          <div className="program-sub-details">
                            {hasActiveFilter && (
                              <span className="class-search-date-label">{formatClassDate(c.startTime)}</span>
                            )}
                            <span className="capacity-count-badge">
                              정원 <span className="highlight-count">{c.currentReservations}/{c.maxCapacity}명</span>
                            </span>
                          </div>
                        </div>

                        <div className="program-right-actions">
                          <span className={`status-badge-label ${isFull ? "is-full" : "is-available"}`}>
                            {isPast ? "종료" : isFull ? "인원마감" : "예약가능"}
                          </span>
                          <button
                            className="main-reserve-action-btn"
                            disabled={alreadyBooked || isPast}
                            onClick={() => reserve(c.classId)}
                          >
                            {isPast
                              ? "마감"
                              : myReservations.find(r => r.classId === c.classId)?.status === "WAITING"
                              ? "대기완료"
                              : alreadyBooked ? "예약완료"
                              : isFull ? "대기하기"
                              : "예약하기"}
                          </button>
                          <button
                            className="main-reserve-action-btn"
                            disabled={openingChatClassId === c.classId}
                            onClick={() => consultInstructor(c)}
                          >
                            상담
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      <FloatingChatWidget ref={chatWidgetRef} />
    </div>
  );
}
