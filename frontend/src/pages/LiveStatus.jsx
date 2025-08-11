import React, { useEffect, useState } from "react";
import axios from "../axiosInstance"; // 若路徑不同請調整

export default function LiveStatus() {
  // 基本選單
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);
  const [cpList, setCpList] = useState([]);
  const [cpId, setCpId] = useState("");

  // 電價（從後端「每日電價設定」即時取得）
  const [pricePerKWh, setPricePerKWh] = useState(6);
  const [priceLabel, setPriceLabel] = useState("");
  const [priceFallback, setPriceFallback] = useState(false);

  // 即時數據
  const [livePowerKw, setLivePowerKw] = useState(0);   // kW
  const [liveVoltageV, setLiveVoltageV] = useState(0); // V
  const [liveCurrentA, setLiveCurrentA] = useState(0); // A
  const [cpStatus, setCpStatus] = useState("Unknown"); // OCPP 樁態

  // 初始化清單
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
        if (cardsData.length) setCardId(cardsData[0].card_id ?? cardsData[0].cardId ?? "");
        if (cpsData.length) setCpId(cpsData[0].chargePointId ?? cpsData[0].id ?? "");
      } catch (e) {
        console.error("初始化清單失敗", e);
      }
    })();
  }, []);

  // 60 秒抓一次：現在的電價（依每日電價設定）
  useEffect(() => {
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        const res = await axios.get("/api/pricing/price-now");
        const p = Number(res.data?.price);
        if (!cancelled && Number.isFinite(p)) {
          setPricePerKWh(p);
          setPriceLabel(res.data?.label || "");
          setPriceFallback(!!res.data?.fallback);
        }
      } catch (e) {
        console.warn("讀取現在電價失敗", e);
      }
    };
    fetchPrice();
    const timer = setInterval(fetchPrice, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  // 2 秒抓一次：OCPP 樁態
  useEffect(() => {
    if (!cpId) return;
    const t = setInterval(async () => {
      try {
        const res = await axios.get(`/api/charge-points/${cpId}/latest-status`);
        setCpStatus(res.data?.status || "Unknown");
      } catch (e) {
        console.warn("讀取樁態失敗", e);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [cpId]);

  // 1 秒抓一次：功率 / 電壓 / 電流
  useEffect(() => {
    if (!cpId) return;
    const t = setInterval(async () => {
      try {
        const [p, v, a] = await Promise.all([
          axios.get(`/api/charge-points/${cpId}/latest-power`),
          axios.get(`/api/charge-points/${cpId}/latest-voltage`),
          axios.get(`/api/charge-points/${cpId}/latest-current`),
        ]);
        const kw = Number(p.data?.value);
        const vv = Number(v.data?.value);
        const aa = Number(a.data?.value);
        setLivePowerKw(Number.isFinite(kw) ? kw : 0);
        setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
        setLiveCurrentA(Number.isFinite(aa) ? aa : 0);
      } catch (e) {
        console.warn("讀取即時功率/電壓/電流失敗", e);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [cpId]);

  // 切換樁時先清空顯示值
  useEffect(() => {
    setLivePowerKw(0); setLiveVoltageV(0); setLiveCurrentA(0);
  }, [cpId]);

  // 中文顯示
  const statusLabel = (s) => {
    const map = {
      Available: "可用",
      Preparing: "準備中",
      Charging: "充電中",
      SuspendedEV: "暫停（車端）",
      SuspendedEVSE: "暫停（樁端）",
      Finishing: "結束中",
      Faulted: "故障",
      Unavailable: "停用",
      Unknown: "未知",
    };
    return map[s] || s || "未知";
  };

  const inputStyle = {
    width: "100%", padding: 8, margin: "8px 0",
    background: "#1e1e1e", color: "#fff", border: "1px solid #ccc"
  };

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>📡 即時狀態</h2>

      <label>卡片 ID：</label>
      <select value={cardId} onChange={(e) => setCardId(e.target.value)} style={inputStyle}>
        {cardList.map((c) => {
          const id = c.card_id ?? c.cardId ?? "";
          return <option key={id} value={id}>{id}</option>;
        })}
      </select>

      <label>充電樁：</label>
      <select value={cpId} onChange={(e) => setCpId(e.target.value)} style={inputStyle}>
        {cpList.map((cp) => {
          const id = cp.chargePointId ?? cp.id ?? "";
          return <option key={id} value={id}>{id}</option>;
        })}
      </select>

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceLabel ? `（${priceLabel}）` : ""}
        {priceFallback ? "（預設）" : ""}
      </p>

      <p>🔌 即時功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔧 電流：{liveCurrentA.toFixed(2)} A</p>
      <p>🏷️ 樁態：{statusLabel(cpStatus)}</p>
    </div>
  );
}
