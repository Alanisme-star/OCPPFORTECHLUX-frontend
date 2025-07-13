import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [balance, setBalance] = useState(null);
  const [price, setPrice] = useState(10);
  const [powerW, setPowerW] = useState(null);
  const [chargedKWh, setChargedKWh] = useState(0);

  useEffect(() => {
    if (!chargePointId) return;
    const today = new Date().toISOString().slice(0, 10);
    axios.get(`/api/daily-pricing?date=${today}`)
      .then(res => {
        if (res.data.length > 0) setPrice(res.data[0].price);
      })
      .catch(() => setPrice(10));
  }, [chargePointId]);

  useEffect(() => {
    if (!chargePointId || !idTag) return;
    const fetchStatus = () => {
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch(() => setLatest(null));

      axios.get(`/api/cards/${idTag}`)
        .then((res) => setBalance(res.data.balance))
        .catch(() => setBalance(null));

      axios.get(`/api/charge-points/${chargePointId}/realtime-status`)
        .then((res) => {
          if (res.data && typeof res.data.power_w === "number") {
            setPowerW(res.data.power_w);
          } else {
            setPowerW(null);
          }
        })
        .catch(() => setPowerW(null));

      axios.get(`/api/charge-points/${chargePointId}/current-transaction`)
        .then((res) => {
          if (typeof res.data.kwh === "number") {
            setChargedKWh(res.data.kwh);
          } else {
            setChargedKWh(0);
          }
        })
        .catch(() => setChargedKWh(0));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  if (!chargePointId || !idTag) {
    return <div className="text-gray-500">請先選擇充電樁和用戶卡片</div>;
  }

  const usedAmount = chargedKWh * price;
  const dynamicBalance = balance !== null ? balance - usedAmount : null;

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
            <p><strong>即時功率：</strong>
              <span className={powerW > 7200 ? 'text-red-600 font-bold' : ''}>
                {powerW !== null ? `${powerW.toFixed(2)} W` : "讀取中…"}
              </span>
              {powerW > 7200 && <span className="ml-2 text-xs text-red-500">(超過上限)</span>}
            </p>
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
