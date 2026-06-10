import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./ClassList.css";
import "./InstructorClassDashboard.css";

const INSTRUCTOR_API_URL = "http://localhost:8080/instructor/classes";

export default function InstructorClassDashboard() {
  const instructorName = localStorage.getItem("userName") || localStorage.getItem("userId") || "";
  const today = new Date();
  const [classes, setClasses] = useState([]);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState("all");
  const [loading, setLoading] = useState(Boolean(instructorName));
  const [errorMessage, setErrorMessage] = useState("");
  const searchInputRef = useRef(null);
  const timeSelectRef = useRef(null);
  const displayErrorMessage = !instructorName ? "강사 계정 정보를 찾을 수 없습니다." : errorMessage;

  useEffect(() => {
    if (!instructorName) return;

    axios.get(INSTRUCTOR_API_URL, {
      params: { instructorName },
      withCredentials: true,
    })
      .then((res) => {
        setClasses(Array.isArray(res.data) ? res.data : []);
        setErrorMessage("");
      })
      .catch(() => setErrorMessage("강사 수업 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [instructorName]);

  const allCalendarDays = useMemo(() => generateMonthCalendar(currentYear, currentMonth), [currentYear, currentMonth]);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const hasActiveFilter = normalizedSearchTerm.length > 0 || selectedTimeFilter !== "all";

  const availableTimeFilters = useMemo(() => Array.from(
    new Set(classes.map((item) => getClassTimeKey(item)).filter(Boolean))
  ).sort(), [classes]);

  const displayedClasses = useMemo(() => {
    return classes.filter((item) => {
      const date = new Date(item.startTime);
      if (Number.isNaN(date.getTime())) return false;

      const matchesSelectedDate = (
        date.getFullYear() === currentYear &&
        date.getMonth() + 1 === currentMonth &&
        date.getDate() === selectedDate
      );
      const matchesSearch = !normalizedSearchTerm ||
        `${item.title || ""} ${item.instructor || ""}`.toLowerCase().includes(normalizedSearchTerm);
      const matchesTime = selectedTimeFilter === "all" || getClassTimeKey(item) === selectedTimeFilter;

      return matchesSelectedDate && matchesSearch && matchesTime;
    });
  }, [classes, currentMonth, currentYear, normalizedSearchTerm, selectedDate, selectedTimeFilter]);

  const groupedData = groupByTime(displayedClasses);

  const getDisplayedDays = () => {
    if (isExpanded) return allCalendarDays;
    const selectedIndex = allCalendarDays.findIndex((day) => day === selectedDate);
    if (selectedIndex === -1) return allCalendarDays.slice(0, 7);
    const rowStart = Math.floor(selectedIndex / 7) * 7;
    return allCalendarDays.slice(rowStart, rowStart + 7);
  };

  const resetFilters = () => {
    if (searchInputRef.current) searchInputRef.current.value = "";
    if (timeSelectRef.current) timeSelectRef.current.value = "all";
    setSearchTerm("");
    setSelectedTimeFilter("all");
  };

  return (
    <div className="container instructor-dashboard">
      <div className="header">
        <h1 className="title">강사 수업 관리</h1>
        <p className="instructor-dashboard-subtitle">
          {instructorName ? `${instructorName} 강사님의 수업 일정과 참여 현황입니다.` : "강사 계정으로 로그인해주세요."}
        </p>
      </div>

      <div className="top-calendar-row-zone">
        <div className="calendar-top-bar">
          <div className="calendar-title-group">
            <button className="month-nav-btn" onClick={() => currentMonth === 1 ? (setCurrentMonth(12), setCurrentYear((year) => year - 1)) : setCurrentMonth((month) => month - 1)}>&lt;</button>
            <h2 className="calendar-year-month">{currentYear}년 {currentMonth}월</h2>
            <button className="month-nav-btn" onClick={() => currentMonth === 12 ? (setCurrentMonth(1), setCurrentYear((year) => year + 1)) : setCurrentMonth((month) => month + 1)}>&gt;</button>
          </div>
          <div className="calendar-action-group">
            <button className="today-badge-btn" onClick={() => { const now = new Date(); setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth() + 1); setSelectedDate(now.getDate()); }}>오늘</button>
            <button className="toggle-expand-btn" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? "▲ 접기" : "▼ 펼치기"}</button>
          </div>
        </div>

        <div className="calendar-weekday-grid">
          <span className="sun-head">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="sat-head">토</span>
        </div>

        <div className="calendar-days-grid">
          {getDisplayedDays().map((date, index) => {
            if (date === null) return <div key={`empty-${index}`} className="day-cell empty"></div>;
            const globalIndex = allCalendarDays.findIndex((day) => day === date);
            return (
              <div
                key={`date-${date}`}
                className={`day-cell ${selectedDate === date ? "selected" : ""} ${globalIndex % 7 === 0 ? "sunday" : ""} ${globalIndex % 7 === 6 ? "saturday" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                {date}
              </div>
            );
          })}
        </div>
      </div>

      <div className="class-search-filter-bar">
        <div className="class-search-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="내 수업명 검색"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <select
          ref={timeSelectRef}
          className="class-time-filter-select"
          value={selectedTimeFilter}
          onChange={(event) => setSelectedTimeFilter(event.target.value)}
          aria-label="시간대 선택"
        >
          <option value="all">전체 시간</option>
          {availableTimeFilters.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
        {hasActiveFilter && (
          <button type="button" className="class-filter-reset-btn" onClick={resetFilters}>
            초기화
          </button>
        )}
      </div>

      <div className="bottom-cards-row-zone">
        {loading ? (
          <p className="empty-placeholder">수업 일정을 불러오는 중입니다.</p>
        ) : displayErrorMessage ? (
          <p className="empty-placeholder">{displayErrorMessage}</p>
        ) : Object.keys(groupedData).length === 0 ? (
          <p className="empty-placeholder">
            {currentMonth}월 {selectedDate}일에 담당 수업이 없습니다.
          </p>
        ) : (
          Object.keys(groupedData).sort().map((timeKey) => (
            <div key={timeKey} className="time-group-block">
              <div className="time-section-header">
                <span className="time-section-title">{getTimeRange(timeKey)}</span>
              </div>

              <div className="time-group-cards-stack">
                {groupedData[timeKey].map((classItem) => (
                  <section key={classItem.classId} className="timeline-program-card instructor-class-card">
                    <div className="program-left-contents">
                      <div className="program-top-row">
                        <img
                          src={`/images/instructors/${classItem.instructor}.png`}
                          alt={classItem.instructor}
                          className="instructor-thumbnail"
                          onError={(event) => {
                            if (!event.target.src.endsWith(".jpg")) {
                              event.target.src = `/images/instructors/${classItem.instructor}.jpg`;
                            } else {
                              event.target.src = "/images/instructors/default.jpg";
                            }
                          }}
                        />
                        <div className="program-title-group">
                          <h4 className="program-title-text">{classItem.title}</h4>
                          <span className="instructor-name-label">{formatClassDate(classItem.startTime)}</span>
                        </div>
                      </div>
                      <div className="program-sub-details">
                        <span className="capacity-count-badge">
                          참여 <span className="highlight-count">{classItem.confirmedCount}/{classItem.maxCapacity}명</span>
                        </span>
                        <span className="capacity-count-badge">
                          대기 <span className="highlight-count">{classItem.waitingCount}명</span>
                        </span>
                      </div>
                    </div>

                    <div className="instructor-participant-panel">
                      <ParticipantList title="참여 회원" people={classItem.confirmedParticipants} emptyText="참여 회원이 없습니다." />
                      <ParticipantList title="대기 회원" people={classItem.waitingParticipants} emptyText="대기 회원이 없습니다." />
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ParticipantList({ title, people, emptyText }) {
  return (
    <div className="instructor-participant-list">
      <strong>{title}</strong>
      {people && people.length > 0 ? (
        <ul>
          {people.map((person) => (
            <li key={person.reservationId || `${person.userId}-${person.status}`}>
              <span>{person.userName || person.userId}</span>
              <small>{person.email || person.userId}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </div>
  );
}

function generateMonthCalendar(year, month) {
  const startDay = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 0; i < startDay; i += 1) days.push(null);
  for (let day = 1; day <= totalDays; day += 1) days.push(day);
  return days;
}

function groupByTime(list) {
  return list.reduce((groups, item) => {
    const timeKey = getClassTimeKey(item);
    if (!groups[timeKey]) groups[timeKey] = [];
    groups[timeKey].push(item);
    return groups;
  }, {});
}

function getClassTimeKey(item) {
  if (!item || !item.startTime) return "";
  return item.startTime.includes("T")
    ? item.startTime.split("T")[1].substring(0, 5)
    : "10:00";
}

function getTimeRange(timeKey) {
  const [hour, minute] = timeKey.split(":").map(Number);
  const endDate = new Date(2000, 0, 1, hour, minute + 50);
  return `${timeKey} ~ ${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
}

function formatClassDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${getClassTimeKey({ startTime: value })}`;
}
