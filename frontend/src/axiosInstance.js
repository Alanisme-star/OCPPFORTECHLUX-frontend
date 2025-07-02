// src/utils/axiosInstance.js
import axios from "axios";

console.log("🔥 baseURL =", import.meta.env.VITE_API_BASE_URL);

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 10000,
});

export default instance;
