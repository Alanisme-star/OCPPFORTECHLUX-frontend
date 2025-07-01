// src/axiosInstance.js
import axios from "axios";  // ✅ 正確：引用原生 axios 套件

const instance = axios.create({
  baseURL: "https://ocppfortechlux.onrender.com/api", // 替換為你實際的後端網址
  timeout: 10000,
});

export default instance;
