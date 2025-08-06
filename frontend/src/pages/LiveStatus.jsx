import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const LiveStatus = () => {
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);
  const [balance, setBalance] = useState(null);
  const [pricePerKWh, setPricePerKWh] = useState(null);
  const power = 7; // kW，固定功率
  const [intervalId, setIntervalId] = useState(null);

  // 取得所有卡片清單
  useEffect(() => {
    const fetchCardList = async () => {
      try {
        const res = await axios.get("/api/cards");
        setCardList(res.data || []);
        if (res.data.length > 0) setCardId(res.data[0].card_id);
      } catch (error) {
        console.error("載入卡片列表失敗：", error);
      }
    };
    fetchCardList();
  }, []);

  // 根據 cardId 載入餘額與電價
  useEffect(() => {
    if (!cardId) return;

    const fetchBalance = async () => {
      try {
        const res = await axios.get(`/api/card-balance/${cardId}`);
        setBalance(res.data.balance);
      } catch (error) {
        console.error("讀取卡片餘額失敗：", error);
      }
    };

    const fetchPricing = async () => {
      try {
        const res = await axios.get("/api/daily-pricing");
        const hour = new Date().getHours();
        const hourStr = hour.toString().padStart(2, "0");
        const matched = res.data.find((item) => item.start_hour === hourStr);
        if (matched) setPricePerKWh(matched.price);
      } catch (error) {
        console.error("讀取電價失敗：", error);
      }
    };

    fetchBalance();
    fetchPricing();
  }, [cardId]);

  // 模擬餘額扣款邏輯（每秒依據電價扣除費用）
  useEffect(() => {
    if (!cardId || balance === null || pricePerKWh === null) return;

    const id = setInterval(() => {
      const energyUsedPerSecond = power / 3600; // kWh
      const costPerSecond = energyUsedPerSecond * pricePerKWh;
      setBalance((prev) => Math.max(0, prev - costPerSecond));
    }, 1000);

    setIntervalId(id);
    return () => clearInterval(id);
  }, [cardId, balance, pricePerKWh]);

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
          border: "1px sol
