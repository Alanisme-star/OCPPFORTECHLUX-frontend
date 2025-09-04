import React, { useEffect, useState, useRef } from "react";
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

  // 餘額（raw 後端；display 顯示值 = rawBalance - liveCost）
  const [rawBalance, setRawBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  // 停充後畫面凍結：避免回彈
  const [frozenAfterStop, setFrozenAfterStop] = useState(false);
  const [frozenCost, setFrozenCost] = useState(0);
  const [rawAtFreeze, setRawAtFreeze] = useState(null);
  const prevStatusRef = useRef(cpStatus);

  // UI 提示訊息（一次性）
  const [stopMsg, setStopMsg] = useState("");
  // 小工具：判斷接近 0（避免浮點誤差）
  const nearZero = (v) => v !== null && v !== undefined && Number(v) <= 0.001;

  // 新增：目前交易 ID
  const [transactionId, setTransactionId] = useState(null);

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
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // ---------- 樁態：每 2 秒 ----------
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
          axios.get(
            `/api/charge-points/${encodeURIComponent(cpId)}/latest-status`
          ),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/status`),
        ]);

        let dbStatus = "Unknown",
          dbTs = 0;
        if (dbRes.status === "fulfilled") {
          const d = dbRes.value?.data;
          dbStatus = (d?.status ?? d ?? "Unknown") || "Unknown";
          dbTs = safeParseTime(d?.timestamp);
        }

        let cacheStatus = "Unknown",
          cacheTs = 0;
        if (cacheRes.status === "fulfilled") {
          const c = cacheRes.value?.data;
          if (typeof c === "string") {
            cacheStatus = c || "Unknown";
          } else {
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

        if (!cancelled) {
          if (chosen === "未知") chosen = "Unknown";
          setCpStatus(chosen);
        }
      } catch {
        if (!cancelled) setCpStatus("Unknown");
      }
    };

    fetchStatus();
    const t = setInterval(fetchStatus, 2_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId]);

  // ---------- 取得當前交易 ID ----------
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;

    const fetchTx = async () => {
      try {
        const { data } = await axios.get(
          `/api/charge-points/${encodeURIComponent(cpId)}/last-transaction/summary`
        );
        if (!cancelled && data?.found) {
          setTransactionId(data.transaction_id);
        }
      } catch {
        // 忽略
      }
    };

    fetchTx();
    const t = setInterval(fetchTx, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId]);

  // ---------- 即時量測：透過 live-cost API ----------
  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const { data } = await axios.get(
          `/api/transactions/${transactionId}/live-cost`
        );
        if (cancelled) return;

        if (data?.final) {
          setFrozenAfterStop(true);
          setFrozenCost(data.cost_so_far ?? 0);
          setRawBalance(data.balance ?? 0);
          setLiveEnergyKWh(data.used_kwh ?? 0);
          setLiveCost(data.cost_so_far ?? 0);
        } else {
          setLiveEnergyKWh(data.used_kwh ?? 0);
          setLiveCost(data.cost_so_far ?? 0);
          setRawBalance(data.balance ?? 0);
        }
      } catch {
        // 忽略一次
      }
    };

    tick();
    const t = setInterval(tick, 1_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [transactionId]);

  // ---------- 餘額：每 5 秒 ----------
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
          setRawBalance(Number.isFinite(bal) ? bal : 0);
        }
      } catch {
        // 忽略一次
      }
    };

    fetchBalance();
    const t = setInterval(fetchBalance, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cardId]);

  // ---------- 停充凍結處理 ----------
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === "Charging" && cpStatus !== "Charging") {
      setFrozenAfterStop(true);
      setFrozenCost(Number.isFinite(liveCost) ? liveCost : 0);
      setRawAtFreeze(Number.isFinite(rawBalance) ? rawBalance : 0);

      const nearZeroDisp =
        (Number.isFinite(displayBalance) ? displayBalance : 0) <= 0.01;
      if (nearZeroDisp) {
        setStopMsg("充電已自動停止（餘額不足）");
      } else {
        setStopMsg("充電已停止");
      }
    }
    prevStatusRef.current = cpStatus;
  }, [cpStatus, liveCost, rawBalance, displayBalance, cpId]);

  // 後端扣款後解除凍結
  useEffect(() => {
    if (!frozenAfterStop || rawAtFreeze == null) return;
    if (Number.isFinite(rawBalance) && rawBalance < rawAtFreeze - 0.01) {
      setFrozenAfterStop(false);
      setFrozenCost(0);
      setRawAtFreeze(null);
    }
  }, [rawBalance, frozenAfterStop, rawAtFreeze]);

  // ---------- 顯示餘額 ----------
  useEffect(() => {
    const base =
      frozenAfterStop && rawAtFreeze != null ? rawAtFreeze : rawBalance;
    const cost = frozenAfterStop ? frozenCost : liveCost;
    const nb =
      (Number.isFinite(base) ? base : 0) -
      (Number.isFinite(cost) ? cost : 0);
    setDisplayBalance(nb > 0 ? nb : 0);
  }, [rawBalance, liveCost, frozenAfterStop, frozenCost, rawAtFreeze]);

  // ---------- 餘額警告 ----------
  useEffect(() => {
    if (!cpId) return;
    if (cpStatus !== "Charging") return;

    const disp = Number.isFinite(displayBalance) ? displayBalance : 0;
    const raw = Number.isFinite(rawBalance) ? rawBalance : 0;

    if (nearZero(disp) || nearZero(raw)) {
      setStopMsg("⚠️ 餘額即將不足，後端可能隨時自動停止充電");
    }
  }, [cpId, cpStatus, displayBalance, rawBalance]);

  // ---------- 切換樁時重置 ----------
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
    setStopMsg("");
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

      <label>充電樁：</label>
      <select
        value={cpId}
        onChange={(e) => setCpId(e.target.value)}
        style={inputStyle}
      >
        {cpList.map((c) => {
          const id = c.chargePointId ?? c.id ?? "";
          return (
            <option key={id} value={id}>
              {id}
            </option>
          );
        })}
      </select>

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceFallback ? "（預設）" : ""} {priceLabel ? `｜${priceLabel}` : ""}
      </p>

      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>
      <p style={{ opacity: 0.7, fontSize: 12 }}>
        （顯示餘額 = 卡片最後金額 − 電費；電費由後端 API 提供）
      </p>

      <p>🔌 功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔧 電流：{liveCurrentA.toFixed(2)} A</p>
      <p>🏷️ 樁態：{statusLabel(cpStatus)}</p>
      <p>🔋 電量：{liveEnergyKWh.toFixed(4)} kWh</p>
      <p>💰 電費：{liveCost.toFixed(2)} 元</p>

      {stopMsg && (
        <p style={{ color: "#ffd54f", marginTop: 8 }}>🔔 {stopMsg}</p>
      )}
    </div>
  );
}
