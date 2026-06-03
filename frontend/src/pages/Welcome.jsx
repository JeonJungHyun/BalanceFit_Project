import { useNavigate } from "react-router-dom";
import "./Welcome.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome">
      <div className="hero">
        <h1>당신의 하루에 밸런스를, BalanceFit</h1>
        <p>오늘의 건강한 루틴을 지금 바로 시작해보세요!</p>

        <button onClick={() => navigate("/login")}>
          시작하기
        </button>
      </div>
    </div>
  );
}