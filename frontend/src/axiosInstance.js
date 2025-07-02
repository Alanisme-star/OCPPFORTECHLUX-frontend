import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 10000,
});

// ✅ 加入 debug 請求前/後的日誌
instance.interceptors.request.use((config) => {
  console.log("📤 [Axios Request]", {
    method: config.method,
    url: config.baseURL + config.url,
    params: config.params,
    data: config.data,
  });
  return config;
}, (error) => {
  console.error("❌ [Axios Request Error]", error);
  return Promise.reject(error);
});

instance.interceptors.response.use((response) => {
  console.log("✅ [Axios Response]", {
    url: response.config.url,
    status: response.status,
    data: response.data
  });
  return response;
}, (error) => {
  if (error.response) {
    console.error("❌ [Axios Response Error]", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
  } else {
    console.error("❌ [Axios Network Error]", error.message);
  }
  return Promise.reject(error);
});

export default instance;
