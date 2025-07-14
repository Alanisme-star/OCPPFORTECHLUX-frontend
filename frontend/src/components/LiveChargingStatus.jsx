import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [power, setPower] = useState(null); // ⬅️ 新增狀態欄位

  useEffect(() => {
    if (!chargePointId || !idTag) return;

    const fetchStatus = () => {
      // 取得即時電錶資料
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch(() => setLatest(null));

      // 取得目前交易狀態
      axios.get(`/api/charge-points/${chargePointId}/current-transaction`)
        .then((res) => {
          setIsActive(res.data.active);
          setStartTime(res.data.start_time);
        })
        .catch(() => {
          setIsActive(false);
          setStartTime(null);
        });

      // ⬇️ 取得即時功率
      axios.get(`/api/charge-points/${chargePointId}/latest-power`)
        .then((res) => setPower(res.data))
        .catch(() => setPower(null));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // 每秒刷新
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  if (!chargePointId || !idTag) {
    return <div className="text-gray-500">請先選擇充電樁和用戶卡片</div>;
  }

  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">🔌 即時充電狀態</h2>
      <div className="space-y-2">
        <p><strong>充電樁 ID：</strong>{chargePointId}</p>
        <p><strong>用戶 ID：</strong>{idTag}</p>

        {/* ⬇️ 顯示即時功率 */}
        {power && power.value !== undefined ? (
          <p><strong>即時功率：</strong>{power.value} {power.unit}</p>
        ) : (
          <p className="text-gray-400">尚無功率資料</p>
        )}
      </div>
    </div>
  );
}

export default LiveChargingStatus;
