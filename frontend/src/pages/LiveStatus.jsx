import React, { useEffect, useState } from "react";
import axios from "../axiosInstance"; // 路徑依專案調整

export default function LiveStatus() {
  // 卡片
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);

  // 充電樁（背景自動選第一支）
  const [cpList, setCpList] = useState([]);
  const [cpId, setCpId] = useState("");

  // 電價（每日電價設定）
  const [pricePerKWh, setPricePerKWh] = useState(6);
  const [priceLabel, setPriceLabel] = useState("");
  const [priceFallback, setPriceFallback] = useState(false);

  // 即時數據
  const [livePowerKw, setLivePowerKw] = useState(0);   // kW
  const [liveVoltageV, setLiveVoltageV] = useState(0); // V
  const [liveCurrentA, setLiveCurrentA] = useState(0); // A
  const [cpStatus, setCpStatus] = useState("Unknown"); // OCPP 樁態

  // 餘額（raw：從後端來；display：畫面估算用）
  const [rawBalance, setRawBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  // 初始化：卡片與充電樁清單（自動選第一個）
  // 2 秒抓一次：樁態（同時抓 DB 與快取，選較新的）
useEffect(() => {
  if (!cpId) return;
  let cancelled = false;

  const fetchStatus = async () => {
    try {
      const [dbRes, cacheRes] = await Promise.allSettled([
        axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-status`), // DB: status_logs
        axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/status`),        // Cache: mock-status
      ]);

      // 解析 DB 結果
      let dbStatus = "Unknown", dbTs = 0;
      if (dbRes.status === "fulfilled") {
        const s = dbRes.value?.data?.status ?? dbRes.value?.data ?? "Unknown";
        const t = dbRes.value?.data?.timestamp;
        dbStatus = s || "Unknown";
        dbTs = t ? Date.parse(t) || 0 : 0;
      }

      // 解析快取結果
      let cacheStatus = "Unknown", cacheTs = 0;
      if (cacheRes.status === "fulfilled") {
        const d = cacheRes.value?.data || {};
        // 兼容 {status: 'Charging', timestamp: '...'} 或直接字串
        cacheStatus = (typeof d === "string" ? d : (d.status || "Unknown")) || "Unknown";
        const ct = typeof d === "string" ? undefined : d.timestamp;
        cacheTs = ct ? Date.parse(ct) || 0 : 0;
      }

      // 選擇邏輯：
      // 1) 兩者其一為 Unknown，就選另一個
      // 2) 兩者皆有值 → 取時間較新者
      // 3) 若時間無法判斷 → 若 DB 是 Available 但快取是 Charging，優先用快取
      let chosen = "Unknown";
      if (dbStatus === "Unknown" && cacheStatus !== "Unknown") {
        chosen = cacheStatus;
      } else if (cacheStatus === "Unknown" && dbStatus !== "Unknown") {
        chosen = dbStatus;
      } else if (dbStatus !== "Unknown" && cacheStatus !== "Unknown") {
        if (cacheTs && dbTs) {
          chosen = cacheTs >= dbTs ? cacheStatus : dbStatus;
        } else if (dbStatus === "Available" && cacheStatus === "Charging") {
          chosen = cacheStatus;
        } else {
          chosen = dbStatus; // 預設回 DB
        }
      }

      if (!cancelled) setCpStatus(chosen);
    } catch {
      if (!cancelled) setCpStatus("Unknown");
    }
  };

  fetchStatus();
  const t = setInterval(fetchStatus, 2000);
  return () => { cancelled = true; clearInterval(t); };
}, [cpId]);

  // 1 秒抓一次：功率 / 電壓 / 電流
  useEffect(() => {
    if (!cpId) return;
    const t = setInterval(async () => {
      try {
        const [p, v, a] = await Promise.all([
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-power`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-voltage`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-current`),
        ]);
        const kw = Number(p.data?.value ?? p.data);
        const vv = Number(v.data?.value ?? v.data);
        const aa = Number(a.data?.value ?? a.data);
        setLivePowerKw(Number.isFinite(kw) ? kw : 0);
        setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
        setLiveCurrentA(Number.isFinite(aa) ? aa : 0);
      } catch (e) {
        console.warn("讀取即時功率/電壓/電流失敗", e);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [cpId]);

  // 取得卡片餘額：切換卡片立即抓、並且每 5 秒校正一次
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const { data } = await axios.get(
          `/api/cards/${encodeURIComponent(cardId)}/balance`
        );
        const bal = Number(data?.balance ?? data ?? 0);
        if (!cancelled) {
          setRawBalance(bal);
          setDisplayBalance(bal); // 每次校正時，把顯示值拉回真實餘額
        }
      } catch (e) {
        console.warn("讀取卡片餘額失敗", e);
      }
    };

    fetchBalance();
    const timer = setInterval(fetchBalance, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [cardId]);

  // 每秒「估算」扣款：Charging 且有功率時才遞減顯示餘額
  useEffect(() => {
    const t = setInterval(() => {
      const charging = cpStatus === "Charging" && livePowerKw > 0;
      if (!charging) return;
      const delta = (livePowerKw * pricePerKWh) / 3600; // 元/秒
      setDisplayBalance((prev) => Math.max(0, prev - delta));
    }, 1000);
    return () => clearInterval(t);
  }, [cpStatus, livePowerKw, pricePerKWh]);

  // 切樁時歸零即時量測
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
  }, [cpId]);

  // OCPP 樁態中文顯示
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
    width: "100%",
    padding: 8,
    margin: "8px 0",
    background: "#1e1e1e",
    color: "#fff",
    border: "1px solid #ccc",
  };

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h2>📡 即時狀態</h2>

      <label>卡片 ID：</label>
      <select
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        style={inputStyle}
      >
        {cardList.map((c) => {
          const id = c.card_id ?? c.cardId ?? "";
          return (
            <option key={id} value={id}>
              {id}
            </option>
          );
        })}
      </select>

      {/* 背景自動選第一支充電樁（不顯示下拉） */}

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceLabel ? `（${priceLabel}）` : ""}
        {priceFallback ? "（預設）" : ""}
      </p>

      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>
      <p style={{ opacity: 0.7, fontSize: 12 }}>
        （每秒估算扣款 = 即時功率 × 電價 ÷ 3600）
      </p>

      <p>🔌 即時功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔧 電流：{liveCurrentA.toFixed(2)} A</p>
      <p>🏷️ 樁態：{statusLabel(cpStatus)}</p>
    </div>
  );
}
