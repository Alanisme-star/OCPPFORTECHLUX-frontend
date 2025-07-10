import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [balance, setBalance] = useState(null);
  const [price, setPrice] = useState(10); // 預設 10 元/度

  // 取得今日單價（或根據需求自訂）
  useEffect(() => {
    if (!chargePointId) return;
    const today = new Date().toISOString().slice(0, 10);
    axios.get(`/api/daily-pricing?date=${today}`)
      .then(res => {
        if (res.data.length > 0) setPrice(res.data[0].price);
      })
      .catch(() => setPrice(10)); // 查不到時預設
  }, [chargePointId]);

  useEffect(() => {
    if (!chargePointId || !idTag) return;
    const fetchStatus = () => {
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch((err) => setLatest(null));
      axios.get(`/api/cards/${idTag}`)
        .then((res) => setBalance(res.data.balance))
        .catch((err) => setBalance(null));
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  if (!chargePointId || !idTag) {
    return <div className="text-gray-500">請先選擇充電樁和用戶卡片</div>;
  }

  // 取得即時消耗度數與預估已消耗金額
  let chargedKWh = 0;
  let usedAmount = 0;
  if (latest) {
    // 你的 latest.value 是 Wh，需除 1000 得 kWh
    chargedKWh = Number(latest.value) / 1000;
    usedAmount = chargedKWh * price;
  }
  let dynamicBalance = balance !== null ? balance - usedAmount : null;

  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">🔌 即時充電狀態</h2>
      <div className="space-y-2">
        <p><strong>充電樁 ID：</strong>{chargePointId}</p>
        <p><strong>用戶 ID：</strong>{idTag}</p>
        {latest ? (
          <>
            <p><strong>時間：</strong>{new Date(latest.timestamp).toLocaleString()}</p>
            <p><strong>累積充電度數：</strong>{chargedKWh.toFixed(3)} kWh</p>
            <p><strong>功率：</strong>{latest.value} {latest.unit}</p>
          </>
        ) : (
          <p className="text-gray-500">尚無電量資料</p>
        )}
        {balance !== null ? (
          <p>
            <strong>即時剩餘金額：</strong>
            <span className={dynamicBalance < 100 ? 'text-red-600 font-semibold' : ''}>
              {dynamicBalance.toFixed(2)} 元
            </span>
            <span className="ml-2 text-gray-400 text-xs">
              (原始餘額 {Number(balance).toFixed(2)} 元, 單價 {price} 元/度)
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
