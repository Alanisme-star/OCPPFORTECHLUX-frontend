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

  // 餘額
  const [rawBalance, setRawBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  // 停充後畫面凍結
  const [frozenAfterStop, setFrozenAfterStop] = useState(false);
  const [frozenCost, setFrozenCost] = useState(0);
  const [rawAtFreeze, setRawAtFreeze] = useState(null);
  const prevStatusRef = useRef(cpStatus);

  // 自動停樁
  const [sentAutoStop, setSentAutoStop] = useState(false);
  const [stopMsg, setStopMsg] = useState("");

  // 交易時間
  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");

  // ⭐ 新增：本次充電累積時間
  const [elapsedTime, setElapsedTime] = useState("—");

  // ⭐ 新增：手動輸入欄位（localStorage 支援）
  const [cpName, setCpName] = useState(() => localStorage.getItem("cpName") || "");
  const [residentName, setResidentName] = useState(() => localStorage.getItem("residentName") || "");
  const [residentFloor, setResidentFloor] = useState(() => localStorage.getItem("residentFloor") || "");

  // 當值變更時寫入 localStorage
  useEffect(() => {
    localStorage.setItem("cpName", cpName);
  }, [cpName]);

  useEffect(() => {
    localStorage.setItem("residentName", residentName);
  }, [residentName]);

  useEffect(() => {
    localStorage.setItem("residentFloor", residentFloor);
  }, [residentFloor]);

  // ---------- 格式化時間 ----------
  const formatTime = (isoString) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  // ---------- 初始化 ----------
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
  // ---------- 電價 ----------
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

  // ---------- 樁態 ----------
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

  // ---------- 即時量測 ----------
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

        const live = liveRes.data || {};
        const kw = Number(live?.power ?? 0);
        const vv = Number(live?.voltage ?? 0);
        const aa = Number(live?.current ?? 0);
        setLivePowerKw(Number.isFinite(kw) ? kw : 0);
        setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
        setLiveCurrentA(Number.isFinite(aa) ? aa : 0);

        const e = energyRes.data || {};
        const session = Number(
          e?.sessionEnergyKWh ??
            e?.totalEnergyKWh ??
            live?.estimated_energy ?? 0   // ⭐ 修改：改用 estimated_energy
        );
        let kwh = Number.isFinite(session) ? session : 0;

        // ⭐ 保護條件：若狀態是 Available，強制歸零
        if (cpStatus === "Available" && kwh > 0) {
          console.debug(
            `[DEBUG] 前端保護觸發：狀態=Available 但電量=${kwh} → 強制改為 0`
          );
          kwh = 0;
        }

        setLiveEnergyKWh(kwh);

        if (Number.isFinite(live?.estimated_amount)) {
          setLiveCost(live.estimated_amount);
        } else {
          const price = Number.isFinite(pricePerKWh) ? pricePerKWh : 0;
          setLiveCost(kwh * price);
        }
      } catch {}
    };

    tick();
    const t = setInterval(tick, 1_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId, pricePerKWh]);

  // ---------- 餘額 ----------
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
      } catch {}
    };

    fetchBalance();
    const t = setInterval(fetchBalance, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cardId]);
  // ---------- 狀態切換 ----------
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === "Charging" && cpStatus !== "Charging") {
      setFrozenAfterStop(true);
      setFrozenCost(Number.isFinite(liveCost) ? liveCost : 0);
      setRawAtFreeze(Number.isFinite(rawBalance) ? rawBalance : 0);
      setStopMsg("充電已自動停止（餘額不足或後端命令）");
    }
    prevStatusRef.current = cpStatus;
  }, [cpStatus, liveCost, rawBalance]);

  // ⭐ 當狀態從非 Charging → Charging，重置交易時間
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== "Charging" && cpStatus === "Charging") {
      setStartTime("");
      setStopTime("");
    }
    prevStatusRef.current = cpStatus;
  }, [cpStatus]);

  // ⭐ 新增：當開始新一輪充電時，重置所有即時量測與預估
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== "Charging" && cpStatus === "Charging") {
      setLiveEnergyKWh(0);
      setLiveCost(0);
      setLivePowerKw(0);
      setLiveVoltageV(0);
      setLiveCurrentA(0);
    }
  }, [cpStatus]);


  // ---------- 扣款後解除凍結 ----------
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



  // ---------- 切換樁時重置 ----------
  useEffect(() => {
    setLivePowerKw(0);
    setLiveVoltageV(0);
    setLiveCurrentA(0);
    setSentAutoStop(false);
    setStopMsg("");
    setStartTime("");
    setStopTime("");
    setElapsedTime("—"); // ⭐ 新增：切換時也重置
  }, [cpId]);

  // ---------- 抓取交易時間 ----------
  useEffect(() => {
    if (!cpId) return;

    const fetchTxInfo = async () => {
      try {
        // ⭐ 改成只打 /current-transaction/summary
        const res = await axios.get(
          `/api/charge-points/${encodeURIComponent(cpId)}/current-transaction/summary`
        );

        if (res.data?.found && res.data.start_timestamp) {
          // ⭐ 保護條件：如果已經有 startTime，且目前狀態是 Charging，就不要再覆蓋
          setStartTime((prev) => {
            if (prev && cpStatus === "Charging") {
              return prev; // 不跳動，保持現有的
            }
            return res.data.start_timestamp;
          });
          setStopTime(""); // 進行中交易沒有 stopTime
        } else {
          // ⭐ 沒有進行中交易 → 歸零
          setStartTime("");
          setStopTime("");
          setElapsedTime("—");
        }
      } catch (err) {
        console.error("讀取交易資訊失敗:", err);
      }
    };

    fetchTxInfo();
    const t = setInterval(fetchTxInfo, 5_000);
    return () => clearInterval(t);
  }, [cpId, cpStatus]);  // ⭐ 保持依賴 cpId / cpStatus


  // ---------- ⭐ 最終改良版：計算本次充電累積時間（停止後歸零 + 新充電重新計算） ----------
  useEffect(() => {
    let timer;

    if (startTime && cpStatus === "Charging") {
      // 充電中 → 開始計時
      timer = setInterval(() => {
        const start = Date.parse(startTime);
        if (!isNaN(start)) {
          const now = stopTime ? Date.parse(stopTime) : Date.now();
          const diff = Math.max(0, now - start);
          const hh = String(Math.floor(diff / 3600000)).padStart(2, "0");
          const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
          const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
          setElapsedTime(`${hh}:${mm}:${ss}`);
        }
      }, 1000);
    } else {
      // 非充電中 → 停止計時並歸零
      clearInterval(timer);
      setElapsedTime("—");

      // ⭐ 同步重置起止時間，避免下次重啟用到舊資料
      setStartTime("");
      setStopTime("");
    }

    return () => clearInterval(timer);
  }, [startTime, stopTime, cpStatus]);


  // ---------- 餘額歸零自動停樁（RemoteStopTransaction） ----------
  useEffect(() => {
    if (sentAutoStop) return;
    if (!cpId) return;

    // 🧩 僅在「充電中」狀態下才允許自動停樁
    if (cpStatus !== "Charging") return;

    const nearZero = (x) => Number.isFinite(x) && x <= 0.001;
    if (nearZero(displayBalance) || nearZero(rawBalance)) {
      (async () => {
        try {
          const res = await axios.post(`/api/charge-points/${encodeURIComponent(cpId)}/stop`);
          setSentAutoStop(true);
          setStopMsg("🔔 餘額為零，自動停止充電（RemoteStopTransaction 已送出）。");
          console.log("Auto stop sent:", res.data);
        } catch (e) {
          setStopMsg(`❌ 停止充電指令失敗：${e?.response?.status || ""} ${e?.response?.data || ""}`);
          console.warn("Auto stop failed:", e?.response?.status, e?.response?.data);
        }
      })();
    }
  }, [displayBalance, rawBalance, cpStatus, cpId, sentAutoStop]);





  // ---------- 狀態顯示 ----------
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

      {/* ⭐ 新增：手動輸入欄位 */}
      <label>充電樁名稱：</label>
      <input
        type="text"
        value={cpName}
        onChange={(e) => setCpName(e.target.value)}
        style={inputStyle}
        placeholder="請輸入充電樁名稱"
      />

      <label>住戶姓名：</label>
      <input
        type="text"
        value={residentName}
        onChange={(e) => setResidentName(e.target.value)}
        style={inputStyle}
        placeholder="請輸入住戶姓名"
      />

      <label>住戶樓號：</label>
      <input
        type="text"
        value={residentFloor}
        onChange={(e) => setResidentFloor(e.target.value)}
        style={inputStyle}
        placeholder="請輸入住戶樓號"
      />

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceFallback ? "（預設）" : ""} {priceLabel ? `｜${priceLabel}` : ""}
      </p>

      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>

      <p>🔌 狀態：{statusLabel(cpStatus)}</p>

      <p>🏠 充電樁名稱：{cpName || "—"}</p>
      <p>👤 住戶姓名：{residentName || "—"}</p>
      <p>🏢 住戶樓號：{residentFloor || "—"}</p>
      <p>💳 選擇卡片 ID：{cardId || "—"}</p>

      <p>⚡ 即時功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 本次充電累積電量：{liveEnergyKWh.toFixed(3)} kWh</p>
      <p>💰 預估電費：{liveCost.toFixed(3)} 元</p>

      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔌 電流：{liveCurrentA.toFixed(1)} A</p>

      <p>⏱️ 充電開始時間：{formatTime(startTime)}</p>
      <p>⏱️ 充電結束時間：{formatTime(stopTime)}</p>
      <p>⏳ 本次充電累積時間：{elapsedTime}</p>

      {stopMsg && (
        <p style={{ color: "#ffd54f", marginTop: 8 }}>🔔 {stopMsg}</p>
      )}
    </div>
  );
}