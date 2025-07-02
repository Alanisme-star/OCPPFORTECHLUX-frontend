import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const fetchStatus = () => {
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch((err) => console.error("⚠️ 無法取得即時瓦數", err));

      axios.get(`/api/cards/${idTag}`)
        .then((res) => setBalance(res.data.balance))
        .catch((err) => console.error("⚠️ 無法取得卡片餘額", err));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">🔌 即時充電狀態</h2>

      <div className="space-y-2">
        <p><strong>充電樁 ID：</strong>{chargePointId}</p>
        <p><strong>用戶 ID：</strong>{idTag}</p>

        {latest ? (
          <>
            <p><strong>時間：</strong>{new Date(latest.timestamp).toLocaleString()}</p>
            <p><strong>功率：</strong>{latest.value} {latest.unit}</p>
          </>
        ) : (
          <p className="text-gray-500">尚無電量資料</p>
        )}

        {balance !== null ? (
          <p><strong>剩餘金額：</strong>
            <span className={balance < 100 ? 'text-red-600 font-semibold' : ''}>
              {balance} 元
            </span>
          </p>
        ) : (
          <p className="text-gray-500">查詢餘額中...</p>
        )}
      </div>
    </div>
  );
}

export default LiveChargingStatus;
