import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1>🏋️ BalanceFit</h1>
      <p>나만의 운동 클래스를 예약하세요</p>

      <button onClick={() => navigate("/login")}>
        로그인 하기
      </button>
    </div>
  );
}