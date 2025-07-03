import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "",
  timeout: 10000,
});

// request 攔截器
instance.interceptors.request.use(
  (config) => {
    console.log("📤 [Axios Request]", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("❌ [Axios Request Error]", error);
    return Promise.reject(error);
  }
);

// response 攔截器（✅ 加強顯示錯誤細節）
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.message;
    const url = error.config?.url;

    console.error("❌ [Axios Response Error]", {
      url,
      status,
      detail,
    });

    return Promise.reject(error);
  }
);

export default instance;
