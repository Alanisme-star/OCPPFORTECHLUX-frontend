import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "./axiosInstance"; // ← 依你的專案實際路徑

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

  // 樁態
  const [cpStatus, setCpStatus] = useState("Unknown");

  // 餘額（raw 後端；display 視覺估算）
  const [rawBalance, setRawBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  // 自動停樁：避免重複觸發
  const [sentAutoStop, setSentAutoStop] = useState(false);
  // UI 提示訊息（一次性）
  const [stopMsg, setStopMsg] = useState("");

  // === 新增：充電時間（秒） ===
  const [chargeSeconds, setChargeSeconds] = useState(0);
  // 以 ms 保存校正後的起點時間（UTC）
  const chargeStartMsRef = useRef(null);

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

        // 選擇邏輯
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
  }, [cpId]);

  // ---------- 即時量測：每 1 秒 ----------
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
  }, [cpStatus, livePowerKw, pricePerKWh]); // :contentReference[oaicite:2]{index=2}

  // ---------- 新增：充電時間（從交易開始計秒） ----------
  // 1) 每 5 秒校正「進行中交易」的 startTimestamp
  useEffect(() => {
    let cancelled = false;

    const fetchOngoingStart = async () => {
      if (cpStatus !== "Charging" || !cpId) return;
      try {
        const { data } = await axios.get(
          `/api/transactions`,
          { params: { chargePointId: cpId } }
        );
        // data 是 {txnId: { startTimestamp, stopTimestamp, ...}, ...}
        let latestStartMs = null;
        for (const k of Object.keys(data || {})) {
          const tx = data[k];
          if (!tx?.stopTimestamp) {
            const ms = Date.parse(tx.startTimestamp);
            if (Number.isFinite(ms)) {
              // 選擇最新一筆尚未結束的交易
              if (latestStartMs === null || ms > latestStartMs) latestStartMs = ms;
            }
          }
        }
        if (!cancelled) {
          if (latestStartMs) {
            chargeStartMsRef.current = latestStartMs;
          } else {
            // 沒有進行中 → 清空
            chargeStartMsRef.current = null;
            setChargeSeconds(0);
          }
        }
      } catch (e) {
        // 忽略一次
      }
    };

    fetchOngoingStart();
    const t = setInterval(fetchOngoingStart, 5_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [cpId, cpStatus]); // 依賴狀態與樁

  // 2) 每秒累積顯示（Charging 且有起點）
  useEffect(() => {
    const tick = () => {
      if (cpStatus !== "Charging") {
        setChargeSeconds(0);
        return;
      }
      const startMs = chargeStartMsRef.current;
      if (startMs && Number.isFinite(startMs)) {
        const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setChargeSeconds(sec);
      } else {
        setChargeSeconds(0);
      }
    };
    tick();
    const t = setInterval(tick, 1_000);
    return () => clearInterval(t);
  }, [cpStatus]);

  // ---------- 切換樁時重置 ----------
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
    setSentAutoStop(false);
    setStopMsg("");
    // 新增：重置計時
    chargeStartMsRef.current = null;
    setChargeSeconds(0);
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

  const hhmmss = useMemo(() => {
    const s = Math.max(0, Number(chargerSafeInt(chargeSeconds)));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }, [chargeSeconds]);

  function chargerSafeInt(n) {
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }

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

      <p>🔌 即時功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔧 電流：{liveCurrentA.toFixed(2)} A</p>

      {/* 新增：充電時間 */}
      <p>⏱️ 充電時間：{hhmmss}</p>

      <p>🏷️ 樁態：{statusLabel(cpStatus)}</p>

      {stopMsg && <p style={{ color: "#ffd54f", marginTop: 8 }}>🔔 {stopMsg}</p>}
    </div>
  );
}
