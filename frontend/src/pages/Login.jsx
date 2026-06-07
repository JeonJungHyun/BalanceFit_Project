import { useState } from "react";
import axios from "axios";
import "./Login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = () => {
    if (!userId) { alert("아이디를 입력해주세요."); return; }
    if (!password) { alert("비밀번호를 입력해주세요."); return; }

    axios.post("http://localhost:8080/users/login", { userId, password }, { withCredentials: true })
      .then((res) => {
        localStorage.setItem("userId", res.data.userId);
        navigate("/classes");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          alert(err.response.data);
        } else {
          alert("로그인에 실패했습니다. 다시 시도해주세요.");
        }
      });
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h1>반가워요🧘‍♀️</h1>
        <p>오늘도 건강한 하루를 시작해볼까요?</p>

        <input
          placeholder="아이디를 입력해주세요."
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호를 입력해주세요."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />

        <button onClick={login}>로그인</button>

        <p className="signup-link">
          아직 회원이 아니신가요?{" "}
          <span onClick={() => navigate("/signup")}>회원가입</span>
        </p>
      </div>
    </div>
  );
}
