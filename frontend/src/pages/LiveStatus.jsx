import React, { useEffect, useRef, useState } from "react";
import axios from "../axiosInstance";

export default function LiveStatus() {
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);
  const [cpList, setCpList] = useState([]);
  const [cpId, setCpId] = useState("");              // 充電樁選擇

  const [pricePerKWh, setPricePerKWh] = useState(6); // 元/kWh（可改為後端取值）
  const [livePowerKw, setLivePowerKw] = useState(0); // ← 改為「實際功率（kW）」
  const [initialBalance, setInitialBalance] = useState(100);
  const [simBalance, setSimBalance] = useState(100);

  const [charging, setCharging] = useState(false);
  const startedAtRef = useRef(null);  // 充電開始時間（只在 active 開始時設定）
  const lastTickRef = useRef(null);   // 上次扣款時間（避免 tab 切走回來暴衝）

  // 初始化：載入卡片、充電樁清單
  useEffect(() => {
    (async () => {
      try {
        const [cards, cps] = await Promise.all([
          axios.get("/api/cards"),
          axios.get("/api/charge-points"),
        ]);
        const cardsData = cards.data || [];
        const cpsData = cps.data || [];
        setCardList(cardsData);
        setCpList(cpsData);
        if (cardsData.length) setCardId(cardsData[0].card_id || cardsData[0].cardId || "");
        if (cpsData.length) setCpId(cpsData[0].chargePointId || cpsData[0].id || "");
      } catch (e) {
        console.error("初始化清單失敗", e);
      }
    })();
  }, []);

  // 每 2 秒查詢是否在充電（只用來切換扣款狀態，不做金額計算）
  useEffect(() => {
    if (!cpId) return;
    const timer = setInterval(async () => {
      try {
        const res = await axios.get(`/api/charge-points/${cpId}/current-transaction`);
        const active = !!res.data?.active;
        setCharging((prev) => {
          // 邊界偵測：從不充電 -> 充電
          if (!prev && active) {
            startedAtRef.current = new Date();  // 設定起算點
            lastTickRef.current = new Date();
          }
          // 邊界偵測：從充電 -> 不充電
          if (prev && !active) {
            startedAtRef.current = null;
            lastTickRef.current = null;
            setLivePowerKw(0);
          }
          return active;
        });
      } catch (e) {
        console.error("查詢是否在充電失敗", e);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [cpId]);

  // 若在充電：每秒抓一次「最新功率」
  useEffect(() => {
    if (!charging || !cpId) return;
    const t = setInterval(async () => {
      try {
        const res = await axios.get(`/api/charge-points/${cpId}/latest-power`);
        // 後端會正規化為 kW；容錯處理一下數值
        const kw = Number(res.data?.value);
        setLivePowerKw(Number.isFinite(kw) ? kw : 0);
      } catch (e) {
        console.warn("讀取即時功率失敗", e);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [charging, cpId]);

  // 扣款：用「實際功率」計算
  useEffect(() => {
    if (!charging) return;
    const t = setInterval(() => {
      if (!startedAtRef.current || !lastTickRef.current) return;
      const now = new Date();
      const diffHr = (now - lastTickRef.current) / 3600000; // 毫秒 -> 小時
      lastTickRef.current = now;

      const kWh = livePowerKw * diffHr;     // ← 用實際功率
      const cost = kWh * pricePerKWh;
      setSimBalance((b) => Math.max(b - cost, 0));
    }, 1000);
    return () => clearInterval(t);
  }, [charging, livePowerKw, pricePerKWh]);

  // 切換卡片時重置模擬餘額
  useEffect(() => {
    setSimBalance(initialBalance);
  }, [cardId, initialBalance]);

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>📡 即時狀態（僅在實際充電時扣款）</h2>

      <label>卡片 ID：</label>
      <select
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        style={{ width: "100%", padding: 8, margin: "8px 0", background: "#1e1e1e", color: "#fff", border: "1px solid #ccc" }}
      >
        {cardList.map((c) => {
          const id = c.card_id ?? c.cardId ?? "";
          return (
            <option key={id} value={id}>{id}</option>
          );
        })}
      </select>

      <label>充電樁：</label>
      <select
        value={cpId}
        onChange={(e) => setCpId(e.target.value)}
        style={{ width: "100%", padding: 8, margin: "8px 0", background: "#1e1e1e", color: "#fff", border: "1px solid #ccc" }}
      >
        {cpList.map((cp) => {
          const id = cp.chargePointId ?? cp.id ?? "";
          return (
            <option key={id} value={id}>{id}</option>
          );
        })}
      </select>

      <p>💰 初始餘額：{initialBalance.toFixed(2)} 元</p>
      <p>⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh</p>
      <p>🔌 即時功率：{livePowerKw.toFixed(2)} kW</p> {/* ← 取代假設功率 */}
      <p>⏱️ 狀態：{charging ? "充電中（扣款進行中）" : "未充電（不扣款）"}</p>
      <p>🧮 模擬餘額：{simBalance.toFixed(2)} 元</p>
    </div>
  );
}
