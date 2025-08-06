import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const BACKEND_API = "https://ocppfortechlux-backend.onrender.com";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (!chargePointId || !idTag) return;

    const fetchStatus = () => {
      axios
        .get(`${BACKEND_API}/api/charge-points/${chargePointId}/current-transaction`)
        .then((res) => {
          setIsActive(res.data.active);
          setStartTime(res.data.start_time);
        })
        .catch(() => {
          setIsActive(false);
          setStartTime(null);
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // ⏲️ 每 10 秒刷新
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  const handleStopCharging = async () => {
    if (!chargePointId) {
      console.log("🔴 [Stop] 無 chargePointId，無法發送停止充電請求");
      return;
    }
    console.log("[Stop] 發送停止充電請求:", chargePointId);
    try {
      const res = await axios.post(
        `${BACKEND_API}/api/charge-points/${chargePointId}/stop`
      );
      console.log("[Stop] API回應:", res.data);
      alert(res.data.message);
    } catch (error) {
      console.error(error);
      alert(
        "⚠️ 停止充電失敗：" +
          (error?.response?.data?.detail || error.message || "Network Error")
      );
    }
  };

  const handleStartCharging = async () => {
    if (!chargePointId || !idTag) {
      alert("⚠️ 請先選擇充電樁與用戶卡片");
      return;
    }

    try {
      const res = await axios.post(
        `${BACKEND_API}/api/charge-points/${chargePointId}/start`,
        { idTag: idTag, connectorId: 1 }
      );
      console.log("[Start] API回應:", res.data);
      alert(res.data.message);
    } catch (error) {
      console.error(error);
      alert(
        "⚠️ 啟動充電失敗：" +
          (error?.response?.data?.detail || error.message || "Network Error")
      );
    }
  };

  if (!chargePointId || !idTag) {
    return <div className="text-gray-500">請先選擇充電樁和用戶卡片</div>;
  }

  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">📅 預約充電</h2>
      <div className="space-y-2">
        <p>
          <strong>充電樁 ID：</strong>
          {chargePointId}
        </p>
        <p>
          <strong>用戶 ID：</strong>
          {idTag}
        </p>
        {startTime && (
          <p>
            <strong>啟動時間：</strong>
            {startTime}
          </p>
        )}
        <button
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleStartCharging}
          disabled={isActive}
        >
          🚀 開始充電
        </button>
        <button
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ml-2"
          onClick={handleStopCharging}
          disabled={!isActive}
        >
          ⛔ 停止充電
        </button>
      </div>
    </div>
  );
}
export default LiveChargingStatus;
