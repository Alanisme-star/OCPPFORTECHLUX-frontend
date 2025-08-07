import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const LiveStatus = () => {
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);

  const [startTime, setStartTime] = useState(null);
  const [initialBalance, setInitialBalance] = useState(100); // 假設初始餘額（可由儲值頁面同步）
  const [simulatedBalance, setSimulatedBalance] = useState(100); // 初始模擬餘額
  const [pricePerKWh, setPricePerKWh] = useState(6); // 假設固定電價（元/kWh）
  const [power, setPower] = useState(7.2); // 假設充電功率（kW）

  // 模擬是否正在充電（實務可由 API 判斷）
  const [charging, setCharging] = useState(true); //⚠️ 若需模擬非充電中，改為 false

  // 取得所有卡片清單
  const fetchCardList = async () => {
    try {
      const res = await axios.get("/api/cards");
      setCardList(res.data || []);
      if (res.data.length > 0) {
        setCardId(res.data[0].card_id);
      }
    } catch (error) {
      console.error("讀取卡片清單失敗：", error);
    }
  };

  useEffect(() => {
    fetchCardList();
  }, []);

  // 初始化模擬時間
  useEffect(() => {
    if (charging) {
      setStartTime(new Date());
    } else {
      setStartTime(null);
    }
  }, [charging]);

  // 模擬餘額每秒遞減
  useEffect(() => {
    const interval = setInterval(() => {
      if (charging && startTime && pricePerKWh !== null) {
        const now = new Date();
        const durationHours = (now - new Date(startTime)) / (1000 * 3600);
        const consumedKWh = durationHours * power;
        const cost = consumedKWh * pricePerKWh;
        const newBalance = Math.max(initialBalance - cost, 0);
        setSimulatedBalance(newBalance);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [charging, startTime, pricePerKWh, power, initialBalance]);

  return (
    <div style={{ padding: "20px", color: "#fff" }}>
      <h2>📡 即時狀態（前端模擬）</h2>

      <label htmlFor="card">卡片 ID：</label>
      <select
        id="card"
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          margin: "8px 0",
          backgroundColor: "#1e1e1e",
          color: "#fff",
          border: "1px solid #ccc"
        }}
      >
        {cardList.map((card) => (
          <option key={card.card_id} value={card.card_id}>
            {card.card_id}
          </option>
        ))}
      </select>

      <p>💰 初始餘額：{initialBalance.toFixed(2)} 元</p>
      <p>⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh</p>
      <p>🔌 假設功率：{power} kW</p>
      <p>⏱️ 充電開始時間：{startTime ? new Date(startTime).toLocaleTimeString() : "未啟動"}</p>
      <p>🧮 模擬餘額：{simulatedBalance.toFixed(2)} 元</p>
    </div>
  );
};

export default LiveStatus;
