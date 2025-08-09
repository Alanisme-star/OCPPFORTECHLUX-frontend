import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "../axiosInstance";

export default function LiveStatus() {
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);
  const [cpList, setCpList] = useState([]);
  const [cpId, setCpId] = useState("");            // 充電樁選擇
  const [pricePerKWh, setPricePerKWh] = useState(6); // 元/kWh（可改成後端取值）
  const [powerKw, setPowerKw] = useState(7.2);       // kW（可改成後端取值）
  const [initialBalance, setInitialBalance] = useState(100);
  const [simBalance, setSimBalance] = useState(100);

  const [charging, setCharging] = useState(false);
  const startedAtRef = useRef(null);      // 充電開始時間（只在 active 開始時設定）
  const lastTickRef = useRef(null);       // 上次扣款時間（避免 tab 切走回來暴衝）

  // 讀卡片/充電樁
  useEffect(() => {
    (async () => {
      try {
        const [cards, cps] = await Promise.all([
          axios.get("/api/cards"),
          axios.get("/api/charge-points"),
        ]);
        setCardList(cards.data || []);
        setCpList(cps.data || []);
        if ((cards.data || []).length) setCardId(cards.data[0].card_id);
        if ((cps.data || []).length) setCpId(cps.data[0].chargePointId);
      } catch (e) {
        console.error("初始化清單失敗", e);
      }
    })();
  }, []);

  // 輪詢：每 2 秒查一次是否在充電
  useEffect(() => {
    if (!cpId) return;
    let timer = setInterval(async () => {
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
          }
          return active;
        });
      } catch (e) {
        console.error("查詢是否在充電失敗", e);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [cpId]);

  // 只有「charging=true」時才扣款
  useEffect(() => {
    if (!charging) return;
    const t = setInterval(() => {
      if (!startedAtRef.current || !lastTickRef.current) return;

      const now = new Date();
      const diffHr = (now - lastTickRef.current) / 3600000; // 距上次扣款的秒差
      lastTickRef.current = now;

      const kWh = powerKw * diffHr;            // 這段時間消耗
      const cost = kWh * pricePerKWh;
      setSimBalance((b) => Math.max(b - cost, 0));
    }, 1000);
    return () => clearInterval(t);
  }, [charging, powerKw, pricePerKWh]);

  // 切換到新卡片時，把模擬餘額重置成初始值
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
        {cardList.map((c) => (
          <option key={c.card_id} value={c.card_id}>{c.card_id}</option>
        ))}
      </select>

      <label>充電樁：</label>
      <select
        value={cpId}
        onChange={(e) => setCpId(e.target.value)}
        style={{ width: "100%", padding: 8, margin: "8px 0", background: "#1e1e1e", color: "#fff", border: "1px solid #ccc" }}
      >
        {cpList.map((cp) => (
          <option key={cp.chargePointId} value={cp.chargePointId}>{cp.chargePointId}</option>
        ))}
      </select>

      <p>💰 初始餘額：{initialBalance.toFixed(2)} 元</p>
      <p>⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh</p>
      <p>🔌 假設功率：{powerKw} kW</p>
      <p>⏱️ 狀態：{charging ? "充電中（扣款進行中）" : "未充電（不扣款）"}</p>
      <p>🧮 模擬餘額：{simBalance.toFixed(2)} 元</p>
    </div>
  );
}
