// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import techluxLogo from "../assets/techlux-logo-white.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "1234") {
      localStorage.setItem("auth", "true");
      navigate("/dashboard");
    } else {
      setError("登入失敗，帳號或密碼錯誤。");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="bg-gray-800 p-8 rounded-md shadow w-80 max-w-[calc(100%_-_2rem)] space-y-4"
      >
        <div className="flex flex-col items-center">
          <img
            src={techluxLogo}
            alt="TECHLUX Logo"
            className="h-auto w-[200px] max-w-full"
          />
          <p className="mt-2 text-center text-sm text-slate-300">
            社區充電能源管理系統
          </p>
        </div>
        <h2 className="text-xl font-bold text-white text-center">管理登入</h2>
        <input
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="帳號"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >登入</button>
      </form>
    </div>
  );
};

export default Login;
