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

  // 自動停樁：避免重複觸發
  const [sentAutoStop, setSentAutoStop] = useState(false);
  // UI 提示訊息（一次性）
  const [stopMsg, setStopMsg] = useState("");
  // 小工具：判斷接近 0（避免浮點誤差）
  const nearZero = (v) => v !== null && v !== undefined && Number(v) <= 0.001;

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
          ), // DB(status_logs)
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/status`), // Cache(mock-status)
        ]);

        // DB 結果
        let dbStatus = "Unknown",
          dbTs = 0;
        if (dbRes.status === "fulfilled") {
          const d = dbRes.value?.data;
          dbStatus = (d?.status ?? d ?? "Unknown") || "Unknown";
          dbTs = safeParseTime(d?.timestamp);
        }

        // 快取結果
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

  // ---------- 即時量測：live-status + latest-energy，每 1 秒 ----------
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const [liveRes, energyRes] = await Promise.all([
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/live-status`),
          axios.get(`/api/charge-points/${encodeURIComponent(cpId)}/latest-energy`),
        ]);

        if (cancelled) return;

        // 即時功率/電壓/電流
        const live = liveRes.data || {};
        const kw = Number(live?.power ?? 0);
        const vv = Number(live?.voltage ?? 0);
        const aa = Number(live?.current ?? 0);
        setLivePowerKw(Number.isFinite(kw) ? kw : 0);
        setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
        setLiveCurrentA(Number.isFinite(aa) ? aa : 0);

        // 以 DB 的「本次用電量」為主；沒有時再退回其他來源
        const e = energyRes.data || {};
        const session = Number(
          e?.sessionEnergyKWh ??
          e?.totalEnergyKWh ?? // 退而求其次：總表
          live?.energy ??       // 再退：即時回傳的能量
          0
        );
        const kwh = Number.isFinite(session) ? session : 0;
        setLiveEnergyKWh(kwh);

        const price = Number.isFinite(pricePerKWh) ? pricePerKWh : 0;
        setLiveCost(kwh * price);
      } catch (err) {
        // 忽略一次，保留前次值
      }
    };

    tick();
    const t = setInterval(tick, 1_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId, pricePerKWh]);


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
      } catch (err) {
        // 忽略一次，保持前次值
      }
    };

    fetchBalance();
    const t = setInterval(fetchBalance, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cardId]);

  // 充電狀態由 Charging → 非 Charging 時才評估是否顯示提醒（加條件）
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === "Charging" && cpStatus !== "Charging") {
      // 凍結顯示，避免回彈
      setFrozenAfterStop(true);
      setFrozenCost(Number.isFinite(liveCost) ? liveCost : 0);
      setRawAtFreeze(Number.isFinite(rawBalance) ? rawBalance : 0);

      // 只有疑似「餘額用盡」或（未來）我們真的送過遠端停充才顯示黃字
      const nearZero =
        (Number.isFinite(displayBalance) ? displayBalance : 0) <= 0.01;

      if (nearZero || sentAutoStop) {
        setStopMsg(
          nearZero ? "充電已自動停止（餘額不足）" : "充電已自動停止（後端遠端命令）"
        );
      } else {
        // 其他原因（拔槍、車端停止、模擬器結束…）不顯示誤導訊息
        setStopMsg("充電已停止");
      }
    }
    prevStatusRef.current = cpStatus;
   }, [cpStatus, liveCost, rawBalance, displayBalance, sentAutoStop]);

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



  // ---------- 餘額到 0 立刻停樁（只送一次） ----------
  useEffect(() => {
    if (!cpId) return;
    if (sentAutoStop) return;                    // 已送過就不要重送
    if (cpStatus !== "Charging") return;         // 只在充電中才觸發

    const disp = Number.isFinite(displayBalance) ? displayBalance : 0;
    const raw  = Number.isFinite(rawBalance)     ? rawBalance     : 0;

    if (nearZero(disp) || nearZero(raw)) {
      (async () => {
        try {
          setSentAutoStop(true); // 先鎖住，避免重覆送
          await axios.post(`/api/charge-points/${encodeURIComponent(cpId)}/stop`, {
            reason: "balance_exhausted"
          });
          // 立刻給使用者回饋（真正停下來的黃字，仍由既有狀態轉換 effect 顯示）
          setStopMsg("已自動送出停止充電（餘額不足）");
        } catch (err) {
          console.error("auto stop failed:", err);
          // 視需求決定要不要解鎖重試；若留著 true，就交給後端保險機制處理
          // setSentAutoStop(false);
        }
      })();
    }
  }, [cpId, cpStatus, displayBalance, rawBalance, sentAutoStop]);



  // ---------- 切換樁時重置 ----------
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
    setSentAutoStop(false);
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
        {priceFallback ? "（預設）" : ""} {priceLabel ? `｜${priceLabel}` : ""}
      </p>

      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>
      <p style={{ opacity: 0.7, fontSize: 12 }}>
        （顯示餘額 = 卡片最後金額 − 電費；電費 = 用電量(kWh) × 單價）
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
