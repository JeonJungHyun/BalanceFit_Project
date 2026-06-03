import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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

  const logout = () => {
    localStorage.removeItem("userId");
    window.location.href = "/login";
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

  useEffect(() => {
    fetchClasses();
    fetchMyReservations();
  }, []);

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

  const groupedData = groupByTime(filteredClassesByDate);

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

  // 오늘 날짜 (시간 제거, 날짜만 비교용)
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

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

      <div className="bottom-cards-row-zone">
        {Object.keys(groupedData).length === 0 ? (
          <p className="empty-placeholder">{currentMonth}월 {selectedDate}일에 등록된 클래스 일정이 없습니다.</p>
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
                            <span className="capacity-count-badge">
                              예약인원/최대수강인원 <span className="highlight-count">{c.currentReservations}/{c.maxCapacity}명</span>
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
    </div>
  );
}