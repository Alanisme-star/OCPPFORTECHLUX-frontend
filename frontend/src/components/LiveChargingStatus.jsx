import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(null);       // ✅ 新增：充電時間秒數
  const [power, setPower] = useState(null);
  const [currentKWh, setCurrentKWh] = useState(null);   // ✅ 累積度數
  const [costInfo, setCostInfo] = useState(null);       // ✅ 本次充電金額
  // Debug: 儲存整個 current-transaction 回傳
  const [transactionDebug, setTransactionDebug] = useState(null);

  useEffect(() => {
    if (!chargePointId || !idTag) return;

    const fetchStatus = () => {
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch(() => setLatest(null));

      axios.get(`/api/charge-points/${chargePointId}/current-transaction`)
        .then((res) => {
          setTransactionDebug(res.data); // Debug
          setIsActive(res.data.active);
          setStartTime(res.data.start_time);

          if (res.data.active && res.data.start_time) {
            const start = new Date(res.data.start_time);
            const now = new Date();
            const seconds = Math.floor((now - start) / 1000);
            setDuration(seconds);
          } else {
            setDuration(null);
          }
        })
        .catch(() => {
          setIsActive(false);
          setStartTime(null);
          setDuration(null);
        });

      axios.get(`/api/charge-points/${chargePointId}/latest-power`)
        .then((res) => setPower(res.data))
        .catch(() => setPower(null));

      axios.get(`/api/charge-points/${chargePointId}/current-kwh`)
        .then((res) => setCurrentKWh(res.data.kwh))
        .catch(() => setCurrentKWh(null));

      axios.get(`/api/charge-points/${chargePointId}/current-cost`)
        .then((res) => setCostInfo(res.data))
        .catch(() => setCostInfo(null));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // ⏲️ 每 1 秒刷新
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  // 每秒更新 duration 顯示（不等後端重新回傳）
  useEffect(() => {
    if (!startTime || !isActive) return;
    const interval = setInterval(() => {
      const start = new Date(startTime);
      const now = new Date();
      const seconds = Math.floor((now - start) / 1000);
      setDuration(seconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isActive]);

  if (!chargePointId || !idTag) {
    return <div className="text-gray-500">請先選擇充電樁和用戶卡片</div>;
  }

  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">🔌 即時充電狀態</h2>
      <div className="space-y-2">
        <p><strong>充電樁 ID：</strong>{chargePointId}</p>
        <p><strong>用戶 ID：</strong>{idTag}</p>

        {/* DEBUG 區塊 */}
        <div style={{ background: "#f3f4f6", padding: "8px", borderRadius: "6px", fontSize: "13px" }}>
          <div><strong>Debug active:</strong> {JSON.stringify(isActive)}</div>
          <div><strong>Debug startTime:</strong> {startTime?.toString()}</div>
          <div><strong>Debug duration:</strong> {duration !== null ? duration : "null"}</div>
          <div><strong>Debug current-transaction API:</strong> {JSON.stringify(transactionDebug)}</div>
        </div>

        {power && power.value !== undefined ? (
          <p><strong>即時功率：</strong>{power.value} {power.unit}</p>
        ) : (
          <p className="text-gray-400">尚無功率資料</p>
        )}

        {currentKWh !== null ? (
          <p><strong>本次累積度數：</strong>{currentKWh} kWh</p>
        ) : (
          <p className="text-gray-400">尚無累積資料</p>
        )}

        {costInfo && costInfo.cost !== undefined ? (
          <p><strong>即時金額：</strong>{costInfo.cost} 元</p>
        ) : (
          <p className="text-gray-400">尚無金額資料</p>
        )}

        {duration !== null ? (
          <p><strong>本次充電時間：</strong>{Math.floor(duration / 60)} 分 {duration % 60} 秒</p>
        ) : (
          <p className="text-gray-400">尚無充電時間資料</p>
        )}
      </div>
    </div>
  );
}

export default LiveChargingStatus;
