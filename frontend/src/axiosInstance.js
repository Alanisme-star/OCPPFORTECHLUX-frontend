// src/axiosInstance.js
import axios from "axios";

// ✅ 將 baseURL 設為純主機，不加 /api，避免路徑重複
const instance = axios.create({
  baseURL: "https://ocppfortechlux-backend.onrender.com",
  timeout: 10000,
});

export default instance;
