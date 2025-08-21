import React, { useEffect, useState } from "react";
import axios from "../axiosInstance"; // ← 依你的專案實際路徑調整

export default function LiveStatus() {
  // 卡片 / 充電樁
  const [cardId, setCardId] = useState("");
  const [cardList, setCardList] = useState([]);
  const [cpList, setCpList] = useState([]);
  const [cpId, setCpId] = useState("");

  // 電價
  const [pricePerKWh, setPricePerKWh] = useState(6);
  const [priceLabel, setPriceLabel] = useState("");
  const [priceFallback, setPriceFallback] = useState(false);

  // 即時量測
  const [livePowerKw, setLivePowerKw] = useState(0);
  const [liveVoltageV, setLiveVoltageV] = useState(0);
  const [liveCurrentA, setLiveCurrentA] = useState(0);
  const [liveEnergyKWh, setLiveEnergyKWh] = useState(0);

  // 電費
  const [liveCost, setLiveCost] = useState(0);

  // 樁態
  const [cpStatus, setCpStatus] = useState("Unknown");

  // 餘額（raw 後端；display 視覺估算）
  const [rawBalance, setRawBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  // 自動停樁：避免重複觸發
  const [sentAutoStop, setSentAutoStop] = useState(false);
  // UI 提示訊息（一次性）
  const [stopMsg, setStopMsg] = useState("");

  // ---------- 初始化：卡片 / 充電樁清單 ----------
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

  // ---------- 電價：每 60 秒更新 ----------
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
    const t = setInterval(fetchPrice, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // ---------- 樁態：同時取 DB 與快取，選較新；每 2 秒 ----------
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
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-status`), // DB(status_logs)
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/status`),        // Cache(mock-status)
        ]);

        // DB 結果
        let dbStatus = "Unknown", dbTs = 0;
        if (dbRes.status === "fulfilled") {
          const d = dbRes.value?.data;
          dbStatus = (d?.status ?? d ?? "Unknown") || "Unknown";
          dbTs = safeParseTime(d?.timestamp);
        }

        // 快取結果
        let cacheStatus = "Unknown", cacheTs = 0;
        if (cacheRes.status === "fulfilled") {
          const c = cacheRes.value?.data;
          if (typeof c === "string") {
            cacheStatus = c || "Unknown";
          } else {
            cacheStatus = c?.status || "Unknown";
            cacheTs = safeParseTime(c?.timestamp);
          }
        }

        // 選擇邏輯：
        // 1) 其中一個 Unknown → 用另一個
        // 2) 兩者皆有值 → 用 timestamp 較新者
        // 3) 無法判斷 → 若 DB=Available 且 Cache=Charging，優先 Charging；否則預設 DB
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
    const t = setInterval(fetchStatus, 2_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [cpId, pricePerKWh]);

  // ---------- 即時量測：每 1 秒 ----------
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const [p, v, a, e] = await Promise.all([
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-power`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-voltage`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-current`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-energy`), // ★ 新增：抓用電量
        ]);

        const kw = Number(p.data?.value ?? p.data);
        const vv = Number(v.data?.value ?? v.data);
        const aa = Number(a.data?.value ?? a.data);

        // total 或 session 二擇一顯示：優先顯示本次充電用電量，否則顯示總表值
        const session = Number(e.data?.sessionEnergyKWh);
        const total = Number(e.data?.totalEnergyKWh ?? e.data?.value ?? e.data);

        if (!cancelled) {
          setLivePowerKw(Number.isFinite(kw) ? kw : 0);
          setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
          setLiveCurrentA(Number.isFinite(aa) ? aa : 0);

          const energyVal = Number.isFinite(session)
            ? session
            : (Number.isFinite(total) ? total : 0);
          setLiveEnergyKWh(energyVal);


          // 電費 = 用電量(kWh) × 單價(元/kWh)
          const fee = (Number.isFinite(energyVal) ? energyVal : 0) * (Number.isFinite(pricePerKWh) ? pricePerKWh : 0);
          setLiveCost(fee);

        }
      } catch (err) {
        // 忽略一次，保持前次值
      }
    };

    tick();
    const t = setInterval(tick, 1_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [cpId]);

  // ---------- 餘額：切卡即抓 & 每 5 秒校正（充電中僅往下夾） ----------
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
          // 充電中避免把畫面餘額往上拉，僅向下夾；停止後再一次性對齊
          setDisplayBalance((prev) => (cpStatus === "Charging" ? Math.min(prev, bal) : bal));
        }
      } catch (err) {
        // 忽略一次，保持前次值
      }
    };

    fetchBalance();
    const t = setInterval(fetchBalance, 5_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [cardId, cpStatus]);

  // ---------- 視覺每秒估算扣款（Charging 且有功率） ----------
  useEffect(() => {
    const t = setInterval(() => {
      const charging = cpStatus === "Charging" && livePowerKw > 0;
      if (!charging) return;
      const delta = (livePowerKw * pricePerKWh) / 3600; // 元/秒
      setDisplayBalance((prev) => Math.max(0, prev - delta));
    }, 1_000);
    return () => clearInterval(t);
  }, [cpStatus, livePowerKw, pricePerKWh]);

  // ---------- 餘額歸零自動停樁（RemoteStopTransaction） ----------
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
          setSentAutoStop(true);
          setStopMsg("已送出停止充電指令（RemoteStopTransaction）。");
          console.log("Auto stop sent:", res.data);
        } catch (e) {
          setStopMsg(`停止充電指令失敗：${e?.response?.status || ""} ${e?.response?.data || ""}`);
          console.warn("Auto stop failed:", e?.response?.status, e?.response?.data);
        }
      })();
    }
  }, [displayBalance, rawBalance, cpStatus, cpId, sentAutoStop]);

  // ---------- 切換樁時重置 ----------
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
    setSentAutoStop(false); // 換樁重置 auto-stop 鎖
    setStopMsg("");         // 清除提示
  }, [cpId]);

  // 狀態中文
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

  // Styles
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

      {/* 如需加入充電樁下拉，可在此補一個 select。此處維持自動選第一支 */}

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceFallback ? "（預設）" : ""}
      </p>

      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>
      <p style={hint}>（每秒估算扣款 = 即時功率 × 電價 ÷ 3600；充電中每 5 秒以下夾對齊後端）</p>

      <p>🔌 功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔧 電流：{liveCurrentA.toFixed(2)} A</p>
      <p>🏷️ 樁態：{statusLabel(cpStatus)}</p>
      <p>🔋 用電量：{liveEnergyKWh.toFixed(4)} kWh</p>
      <p>💰 電費：{liveCost.toFixed(2)} 元</p>

      {stopMsg && <p style={{ color: "#ffd54f", marginTop: 8 }}>🔔 {stopMsg}</p>}
    </div>
  );
}
