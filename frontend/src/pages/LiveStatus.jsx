// src/pages/LiveStatus.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const LiveStatus = () => {
  const [cardId, setCardId] = useState("123456"); // 可改成輸入框
  const [balance, setBalance] = useState(null);
  const [pricePerKWh, setPricePerKWh] = useState(null);
  const [power, setPower] = useState(7); // 模擬 7kW
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      const now = new Date();
      const hour = now.getHours();
      try {
        const res = await axios.get("/api/daily-pricing");
        const prices = res.data || [];
        const match = prices.find((p) => {
          const [startHour, endHour] = p.time_range.split("~").map(Number);
          return hour >= startHour && hour < endHour;
        });
        if (match) setPricePerKWh(match.price);
      } catch (err) {
        console.error("❌ 讀取電價失敗", err);
      }
    };

    fetchPrice();
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await axios.get(`/api/card-balance/${cardId}`);
        setBalance(res.data.balance);
      } catch (err) {
        console.error("❌ 讀取餘額失敗", err);
      }
    };

    fetchBalance();
  }, [cardId]);

  useEffect(() => {
    if (!charging || balance === null || pricePerKWh === null) return;

    const interval = setInterval(() => {
      const energyPerSecond = power / 3600; // kWh 每秒
      const costPerSecond = energyPerSecond * pricePerKWh;

      setBalance((prev) => Math.max(0, prev - costPerSecond));
    }, 1000);

    return () => clearInterval(interval);
  }, [charging, balance, pricePerKWh]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📡 即時狀態</h2>
      <div className="space-y-4">
        <div>
          <label className="font-semibold">卡片 ID：</label>
          <input
            type="text"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="ml-2 px-2 py-1 border border-gray-300 rounded"
          />
        </div>
        <div>
          <p>💳 餘額：{balance !== null ? `${balance.toFixed(2)} 元` : "讀取中..."}</p>
          <p>⚡ 當前電價：{pricePerKWh !== null ? `${pricePerKWh} 元/kWh` : "讀取中..."}</p>
          <p>🔋 充電功率：{power} kW</p>
        </div>
        <button
          onClick={() => setCharging((prev) => !prev)}
          className={`px-4 py-2 rounded text-white ${
            charging ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {charging ? "停止充電" : "開始充電"}
        </button>
      </div>
    </div>
  );
};

export default LiveStatus;
