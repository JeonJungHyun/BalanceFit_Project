import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./MyPage.css";

export default function MyPage() {
  const [reservations, setReservations] = useState([]);
  const [classesList, setClassesList] = useState([]); 
  const [activeTab, setActiveTab] = useState("CONFIRMED"); 
  const [isLoading, setIsLoading] = useState(true); 
  
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today.getDate());  
  const [isExpanded, setIsExpanded] = useState(true); 

  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();

  const goClassesList = () => {
    navigate("/classes"); 
  };

  const logout = () => {
    axios.post("http://localhost:8080/users/logout", null, { withCredentials: true })
      .finally(() => {
        localStorage.clear();
        navigate("/login");
      });
  };

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      axios
        .all([
          axios.get(`http://localhost:8080/reservations/user/${userId}`),
          axios.get(`http://localhost:8080/classes`) 
        ])
        .then(
          axios.spread((resReservations, resClasses) => {
            setReservations(resReservations.data || []);
            setClassesList(resClasses.data || []); 
            setIsLoading(false);
          })
        )
        .catch((err) => {
          console.log(err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const cancelReservation = (id) => {
    if(!window.confirm("선택하신 수업 예약을 취소하시겠습니까?")) return;
    axios
      .delete(`http://localhost:8080/reservations/${id}`)
      .then(() => {
        axios.all([
          axios.get(`http://localhost:8080/reservations/user/${userId}`),
          axios.get(`http://localhost:8080/classes`)
        ]).then(axios.spread((resReservations, resClasses) => {
          setReservations(resReservations.data || []);
          setClassesList(resClasses.data || []);
        }));
      });
  };

  const tabFiltered = reservations.filter(r => r && r.status === activeTab);

  const currentReservations = tabFiltered.filter((r) => {
    if (!r || !r.startTime) return false;
    const d = new Date(r.startTime);
    return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth && d.getDate() === selectedDate;
  });

  const groupByTime = (list) => {
    return list.reduce((acc, obj) => {
      if (!obj) return acc;
      let timeKey = "10:00";
      if (obj.startTime && obj.startTime.includes("T")) {
        timeKey = obj.startTime.split("T")[1].substring(0, 5);
      } else if (obj.classTime) {
        timeKey = obj.classTime;
      }
      if (!acc[timeKey]) acc[timeKey] = [];
      acc[timeKey].push(obj);
      return acc;
    }, {});
  };

  const groupedData = groupByTime(currentReservations);

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
    const selectedIndex = allCalendarDays.findIndex(d => d === selectedDate);
    if (selectedIndex === -1) return allCalendarDays.slice(0, 7);
    const rowStart = Math.floor(selectedIndex / 7) * 7;
    return allCalendarDays.slice(rowStart, rowStart + 7);
  };

  const displayedDays = getDisplayedDays();

  if (isLoading) {
    return (
      <div className="container">
        <p className="empty-placeholder">예약 내역을 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-main-title-row">
        <h1 className="title">내 예약 관리</h1>
        <div className="header-top-nav">
          <button className="nav-action-btn back-list-btn" onClick={goClassesList}>목록으로</button>
          <button className="nav-action-btn logout-btn" onClick={logout}>로그아웃</button>
        </div>
      </div>

      <div className="tab-menu">
        <button className={`tab-btn ${activeTab === "CONFIRMED" ? "active" : ""}`} onClick={() => setActiveTab("CONFIRMED")}>예정된 수업</button>
        <button className={`tab-btn ${activeTab === "WAITING" ? "active" : ""}`} onClick={() => setActiveTab("WAITING")}>예약대기 수업</button>
      </div>

      <div className="mypage-main-layout">
        <div className="left-calendar-zone">
          <div className="calendar-top-bar">
            <div className="calendar-title-group">
              <button className="month-nav-btn" onClick={() => currentMonth === 1 ? (setCurrentMonth(12), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)}>&lt;</button>
              <h2 className="calendar-year-month">{currentYear}년 {currentMonth}월</h2>
              <button className="month-nav-btn" onClick={() => currentMonth === 12 ? (setCurrentMonth(1), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)}>&gt;</button>
            </div>
            <div className="calendar-action-group">
              <button className="today-badge-btn" onClick={() => { const n = new Date(); setCurrentYear(n.getFullYear()); setCurrentMonth(n.getMonth()+1); setSelectedDate(n.getDate()); }}>오늘</button>
              <button className="toggle-expand-btn" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? "▲ 접기" : "▼ 펼치기"}</button>
            </div>
          </div>

          <div className="calendar-weekday-grid">
            <span className="sun-head">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span className="sat-head">토</span>
          </div>

          <div className="calendar-days-grid">
            {displayedDays.map((date, index) => {
              if (date === null) return <div key={`empty-${index}`} className="day-cell empty"></div>;
              const globalIdx = allCalendarDays.findIndex(d => d === date);
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

        <div className="right-timeline-zone">
          {Object.keys(groupedData).length === 0 ? (
            <p className="empty-placeholder">{currentMonth}월 {selectedDate}일에 해당하는 수업 일정이 존재하지 않습니다.</p>
          ) : (
            Object.keys(groupedData).sort().map((timeKey) => (
              <div key={timeKey} className="timeline-time-section-block">
                <div className="timeline-top-time-header">
                  <span className="time-header-text">⏰ {timeKey} ~ {parseInt(timeKey.split(":")[0]) + 1}:00</span>
                </div>

                <div className="timeline-cards-vertical-stack">
                  {groupedData[timeKey].map((r) => {
                    const matchedClass = classesList.find(c => c && c.classId === r.classId);
                    const realCurrentCount = matchedClass 
                      ? (matchedClass.currentCount ?? matchedClass.reservedCount ?? matchedClass.currentReservations ?? 1)
                      : 1;

                    return (
                      <div className="fitness-program-card-v2" key={r.reservationId}>
                        <div className="program-main-details">
                          <div className="instructor-avatar">
                            <img 
                              src={`/images/instructors/${r.instructor}.png`} 
                              alt={r.instructor} 
                              onError={(e) => { 
                                if (!e.target.src.endsWith('.jpg')) {
                                e.target.src = `/images/instructors/${r.instructor}.jpg`;
                              } else {
                                e.target.src = "/images/instructors/default.jpg"; // style.display none 대신 기본 이미지로
                              }
                              }}
                            />
                          </div>
                          <div className="program-meta-info">
                            <h4>{r.title || "필라테스"}</h4>
                            <div className="info-sub-row-group">
                              <span className="info-sub-item">👤 담당 강사: {r.instructor || "미지정"}</span>
                              <span className="status-capacity-badge">
                                정원 현황: {realCurrentCount} / {r.maxCapacity ?? matchedClass?.maxCapacity ?? 8}명
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="action-cancel-btn" onClick={() => cancelReservation(r.reservationId)}>예약취소</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
