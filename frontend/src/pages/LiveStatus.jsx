import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function LiveStatus() {
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);
  const [cpList, setCpList] = useState([]);
  const [cpId, setCpId] = useState("");

  const [pricePerKWh, setPricePerKWh] = useState(6);
  const [priceLabel, setPriceLabel] = useState("");
  const [priceFallback, setPriceFallback] = useState(false);

  const [livePowerKw, setLivePowerKw] = useState(0);
  const [liveVoltageV, setLiveVoltageV] = useState(0);
  const [liveCurrentA, setLiveCurrentA] = useState(0);

  const [cpStatus, setCpStatus] = useState("Unknown");

  const [rawBalance, setRawBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  // 餘額歸零自動停樁 flag
  const [sentAutoStop, setSentAutoStop] = useState(false);

  // 初始化清單
  useEffect(() => {
    (async () => {
      try {
        const [cards, cps] = await Promise.all([
          axios.get("/api/cards"),
          axios.get("/api/charge-points"),
        ]);
        const cardsData = Array.isArray(cards.data) ? cards.data : [];
        const cpsData = Array.isArray(cps.data) ? cps.data : [];

        setCardList(cardsData);
        setCpList(cpsData);

        if (cardsData.length) {
          const firstId = cardsData[0].card_id ?? cardsData[0].cardId ?? "";
          setCardId(firstId);
        }
        if (cpsData.length) {
          const firstCp = cpsData[0].chargePointId ?? cpsData[0].id ?? "";
          setCpId(firstCp);
        }
      } catch (err) {
        console.error("初始化清單失敗：", err);
      }
    })();
  }, []);

  // 電價
  useEffect(() => {
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        const { data } = await axios.get("/api/pricing/price-now");
        const p = Number(data?.price);
        if (!cancelled && Number.isFinite(p)) {
          setPricePerKWh(p);
          setPriceLabel(data?.label || "");
          setPriceFallback(!!data?.fallback);
        }
      } catch (err) {
        console.warn("讀取電價失敗：", err);
      }
    };
    fetchPrice();
    const t = setInterval(fetchPrice, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // 樁態
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;
    const safeParseTime = (ts) => {
      if (!ts) return 0;
      const v = Date.parse(ts);
      return Number.isFinite(v) ? v : 0;
    };
    const fetchStatus = async () => {
      try {
        const [dbRes, cacheRes] = await Promise.allSettled([
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-status`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/status`),
        ]);
        let dbStatus = "Unknown", dbTs = 0;
        if (dbRes.status === "fulfilled") {
          const d = dbRes.value?.data;
          dbStatus = (d?.status ?? d ?? "Unknown") || "Unknown";
          dbTs = safeParseTime(d?.timestamp);
        }
        let cacheStatus = "Unknown", cacheTs = 0;
        if (cacheRes.status === "fulfilled") {
          const c = cacheRes.value?.data;
          if (typeof c === "string") cacheStatus = c || "Unknown";
          else {
            cacheStatus = c?.status || "Unknown";
            cacheTs = safeParseTime(c?.timestamp);
          }
        }
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
            chosen = dbStatus;
          }
        }
        if (!cancelled) setCpStatus(chosen);
      } catch {
        if (!cancelled) setCpStatus("Unknown");
      }
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId]);

  // 即時量測
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const [p, v, a] = await Promise.all([
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-power`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-voltage`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-current`),
        ]);
        const kw = Number(p.data?.value ?? p.data);
        const vv = Number(v.data?.value ?? v.data);
        const aa = Number(a.data?.value ?? a.data);
        if (!cancelled) {
          setLivePowerKw(Number.isFinite(kw) ? kw : 0);
          setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
          setLiveCurrentA(Number.isFinite(aa) ? aa : 0);
        }
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId]);

  // 餘額校正
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
          setDisplayBalance(bal);
        }
      } catch {}
    };
    fetchBalance();
    const t = setInterval(fetchBalance, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cardId]);

  // 每秒估算扣款
  useEffect(() => {
    const t = setInterval(() => {
      const charging = cpStatus === "Charging" && livePowerKw > 0;
      if (!charging) return;
      const delta = (livePowerKw * pricePerKWh) / 3600;
      setDisplayBalance((prev) => Math.max(0, prev - delta));
    }, 1000);
    return () => clearInterval(t);
  }, [cpStatus, livePowerKw, pricePerKWh]);

  // 餘額歸零自動停樁
  useEffect(() => {
    if (sentAutoStop) return;
    if (cpStatus !== "Charging") return;
    const nearZero = (x) => Number.isFinite(x) && x <= 0.001;
    if (nearZero(displayBalance) || nearZero(rawBalance)) {
      (async () => {
        try {
          const res = await axios.post(
            `/api/charge-points/${encodeURIComponent(cpId)}/stop`
          );
          console.log("Auto stop sent:", res.data);
          setSentAutoStop(true);
        } catch (e) {
          console.warn("Auto stop failed:", e?.response?.status, e?.response?.data);
        }
      })();
    }
  }, [displayBalance, rawBalance, cpStatus, cpId, sentAutoStop]);

  // 切換樁時重置
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
    setSentAutoStop(false); // 換樁重置 flag
  }, [cpId]);

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

  const wrap = { padding: 20, color: "#fff" };
  const inputStyle = {
    width: "100%",
    padding: 8,
    margin: "8px 0",
    background: "#1e1e1e",
    color: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
  };
  const hint = { opacity: 0.7, fontSize: 12 };

  return (
    <div style={wrap}>
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

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceLabel ? `（${priceLabel}）` : ""}
        {priceFallback ? "（預設）" : ""}
      </p>

      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>
      <p style={hint}>（每秒估算扣款 = 即時功率 × 電價 ÷ 3600）</p>

      <p>🔌 即時功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔧 電流：{liveCurrentA.toFixed(2)} A</p>
      <p>🏷️ 樁態：{statusLabel(cpStatus)}</p>
    </div>
  );
}
