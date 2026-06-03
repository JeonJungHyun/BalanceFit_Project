import { useState } from "react";
import axios from "axios";
import "./Signup.css";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Signup() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [idStatus, setIdStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const idChecks = {
    length: userId.length >= 5,
    alphanumeric: /^[a-zA-Z0-9]+$/.test(userId) && userId.length > 0,
  };

  const pwChecks = {
    length: password.length >= 8,
    alphanumeric: /(?=.*[a-zA-Z])(?=.*[0-9])/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };

  const checkUserId = () => {
    if (!idChecks.length || !idChecks.alphanumeric) {
      alert("아이디 형식을 확인해주세요.");
      return;
    }
    axios.get(`http://localhost:8080/users/check/${userId}`)
      .then(() => setIdStatus("available"))
      .catch(() => setIdStatus("taken"));
  };

  const validate = () => {
    const nameRegex = /^[가-힣a-zA-Z]{2,10}$/;
    if (!idChecks.length || !idChecks.alphanumeric) {
      alert("아이디 조건을 확인해주세요.");
      return false;
    }
    if (idStatus !== "available") {
      alert("아이디 중복확인을 해주세요.");
      return false;
    }
    if (!pwChecks.length || !pwChecks.alphanumeric || !pwChecks.special) {
      alert("비밀번호 조건을 확인해주세요.");
      return false;
    }
    if (!nameRegex.test(name)) {
      alert("이름은 한글 또는 영문 2~10자로 입력해주세요.");
      return false;
    }
    return true;
  };

  const signup = () => {
    if (!validate()) return;
    axios.post("http://localhost:8080/users/signup", { userId, password, name })
      .then(() => {
        alert("회원가입이 완료되었습니다!");
        navigate("/login");
      })
      .catch((err) => {
        if (err.response?.status === 409) {
          alert("이미 사용 중인 아이디입니다.");
        } else {
          alert("회원가입에 실패했습니다. 다시 시도해주세요.");
        }
      });
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">
        <h1>회원가입</h1>
        <p className="subtitle">BalanceFit 멤버가 되어보세요.</p>

        {/* 이름 */}
        <div className="input-group">
          <label>이름</label>
          <input
            placeholder="이름을 입력해주세요."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* 아이디 */}
        <div className="input-group">
          <label>아이디</label>
          <div className="input-with-btn">
            <input
              placeholder="아이디를 입력해주세요."
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setIdStatus(""); }}
            />
            <button className="check-btn" onClick={checkUserId}>중복확인</button>
          </div>
          {idStatus === "available" && <span className="id-ok">✓ 사용 가능한 아이디입니다.</span>}
          {idStatus === "taken" && <span className="id-fail">✗ 이미 사용 중인 아이디입니다.</span>}
          <div className="check-list">
            <span className={`check-item ${idChecks.length ? "pass" : ""}`}>✓ 5자 이상</span>
            <span className={`check-item ${idChecks.alphanumeric ? "pass" : ""}`}>✓ 영문 또는 숫자</span>
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="input-group">
          <label>비밀번호</label>
          <div className="input-with-btn">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호를 입력해주세요."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signup()}
            />
            <button className="check-btn" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
          </div>
          <div className="check-list">
            <span className={`check-item ${pwChecks.length ? "pass" : ""}`}>✓ 8자 이상</span>
            <span className={`check-item ${pwChecks.alphanumeric ? "pass" : ""}`}>✓ 영문+숫자 포함</span>
            <span className={`check-item ${pwChecks.special ? "pass" : ""}`}>✓ 특수문자 포함</span>
          </div>
        </div>

        <button className="signup-submit-btn" onClick={signup}>가입하기</button>

        <div className="divider">또는</div>

        <p className="login-link">
          이미 회원이신가요?{" "}
          <span onClick={() => navigate("/login")}>로그인</span>
        </p>
      </div>
    </div>
  );
}