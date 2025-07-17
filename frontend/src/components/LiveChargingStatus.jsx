import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(null);       // ✅ 充電時間秒數
  const [power, setPower] = useState(null);
  const [currentAmp, setCurrentAmp] = useState(null);   // ✅ 即時電流
  const [currentKWh, setCurrentKWh] = useState(null);   // ✅ 累積度數
  const [costInfo, setCostInfo] = useState(null);       // ✅ 本次充電金額
  const [transactionDebug, setTransactionDebug] = useState(null);  // Debug
  const [stopTime, setStopTime] = useState(null);

  useEffect(() => {
    if (!chargePointId || !idTag) return;

    const fetchStatus = () => {
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch(() => setLatest(null));

      axios.get(`/api/charge-points/${chargePointId}/current-transaction`)
        .then((res) => {
          setTransactionDebug(res.data);
          setIsActive(res.data.active);
          setStartTime(res.data.start_time);
          setStopTime(res.data.stop_time);

          if (res.data.start_time) {
            const start = new Date(res.data.start_time);
            const end = res.data.stop_time ? new Date(res.data.stop_time) : new Date();
            const seconds = Math.floor((end - start) / 1000);
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

      axios.get(`/api/charge-points/${chargePointId}/latest-current`) // ✅ 新增 API 呼叫
        .then((res) => setCurrentAmp(res.data))
        .catch(() => setCurrentAmp(null));

      axios.get(`/api/charge-points/${chargePointId}/current-kwh`)
        .then((res) => setCurrentKWh(res.data.kwh))
        .catch(() => setCurrentKWh(null));

      axios.get(`/api/charge-points/${chargePointId}/current-cost`)
        .then((res) => setCostInfo(res.data))
        .catch(() => setCostInfo(null));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const start = new Date(startTime);
      const end = stopTime ? new Date(stopTime) : new Date();
      const seconds = Math.floor((end - start) / 1000);
      setDuration(seconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, stopTime]);

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

        {isActive && power && power.value !== undefined ? (
          <p><strong>即時功率：</strong>{power.value} {power.unit}</p>
        ) : (
          <p className="text-gray-400">尚無功率資料</p>
        )}

        {isActive && currentAmp && currentAmp.value !== undefined ? (
          <p><strong>即時電流：</strong>{currentAmp.value} {currentAmp.unit}</p>
        ) : (
          <p className="text-gray-400">尚無電流資料</p>
        )}

        {isActive && currentKWh !== null ? (
          <p><strong>本次累積度數：</strong>{currentKWh} kWh</p>
        ) : (
          <p className="text-gray-400">尚無累積資料</p>
        )}

        {isActive && costInfo && costInfo.cost !== undefined ? (
          <p><strong>即時金額：</strong>{costInfo.cost} 元</p>
        ) : (
          <p className="text-gray-400">尚無金額資料</p>
        )}

        {isActive && duration !== null ? (
          <p><strong>本次充電時間：</strong>{Math.floor(duration / 60)} 分 {duration % 60} 秒</p>
        ) : (
          <p className="text-gray-400">尚無充電時間資料</p>
        )}
      </div>
    </div>
  );
}

export default LiveChargingStatus;
