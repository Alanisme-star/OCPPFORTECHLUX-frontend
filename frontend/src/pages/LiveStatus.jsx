import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const LiveStatus = () => {
  const [cardId, setCardId] = useState("");
  const [balance, setBalance] = useState(null);
  const [pricePerKWh, setPricePerKWh] = useState(null);
  const [cardList, setCardList] = useState([]);

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

  // 取得餘額與電價
  const fetchLiveStatus = async () => {
    if (!cardId) return;

    try {
      const [balanceRes, priceRes] = await Promise.all([
        axios.get(`/api/card_balance/${cardId}`),
        axios.get("/api/current_price")  //⚠️ 請確認 main.py 中有此 API
      ]);

      setBalance(balanceRes.data.balance);
      setPricePerKWh(priceRes.data.price);
    } catch (error) {
      console.error("讀取即時狀態失敗：", error);
    }
  };

  useEffect(() => {
    fetchCardList();
  }, []);

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000); // 每5秒更新
    return () => clearInterval(interval);
  }, [cardId]);

  return (
    <div style={{ padding: "20px", color: "#fff" }}>
      <h2>📡 即時狀態</h2>

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

      <p>💰 餘額：{balance !== null ? balance.toFixed(2) : "載入中..."} 元</p>
      <p>⚡ 每度電價：{pricePerKWh !== null ? pricePerKWh + " 元/kWh" : "載入中..."}</p>
    </div>
  );
};

export default LiveStatus;
