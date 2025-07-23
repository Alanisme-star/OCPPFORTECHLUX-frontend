import axios from "axios";

const instance = axios.create({
  baseURL: "https://ocppfortechlux-backend.onrender.com", // ✅ 已移除 /api
  timeout: 10000,
});

// ✅ 攔截 request
instance.interceptors.request.use(
  (config) => {
    console.log("📤 [Axios Request]", config);
    return config;
  },
  (error) => {
    console.error("❌ [Axios Request Error]", error);
    return Promise.reject(error);
  }
);

// ✅ 攔截 response
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("❌ [Axios Response Error]", error);
    return Promise.reject(error);
  }
);

export default instance;
