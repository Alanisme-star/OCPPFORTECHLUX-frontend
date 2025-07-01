// src/axiosInstance.js
import axios from "axios";

const instance = axios.create({
  baseURL: "https://ocppfortechlux-backend.onrender.com/api",  // ✅ 正確後端 API 網域
  timeout: 10000,
});

export default instance;
