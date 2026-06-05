import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ClassList from "./pages/ClassList";
import MyPage from "./pages/MyPage";
import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/classes"
          element={
            <PrivateRoute>
              <ClassList />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function PrivateRoute({ children }) {
  const userId = localStorage.getItem("userId");
  return userId ? children : <Navigate to="/login" />;
}

export default App;