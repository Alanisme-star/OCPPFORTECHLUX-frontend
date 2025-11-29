import React, { useEffect, useState, useRef } from "react";
import axios from "../axiosInstance";

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

  // 交易時間
  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");

  // 累積時間
  const [elapsedTime, setElapsedTime] = useState("—");

  // 分段電價
  const [priceBreakdown, setPriceBreakdown] = useState([]);

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
    const t = setInterval(fetchPrice, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // ---------- 樁狀態抓取 ----------
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
          const d = dbRes.value.data;
          dbStatus = (d?.status ?? d ?? "Unknown") || "Unknown";
          dbTs = safeParseTime(d?.timestamp);
        }

        let cacheStatus = "Unknown", cacheTs = 0;
        if (cacheRes.status === "fulfilled") {
          const c = cacheRes.value.data;
          if (typeof c === "string") {
            cacheStatus = c || "Unknown";
          } else {
            cacheStatus = c?.status || "Unknown";
            cacheTs = safeParseTime(c?.timestamp);
          }
        }

        let chosen = "Unknown";
        if (dbStatus === "Unknown" && cacheStatus !== "Unknown") chosen = cacheStatus;
        else if (cacheStatus === "Unknown" && dbStatus !== "Unknown") chosen = dbStatus;
        else if (dbStatus !== "Unknown" && cacheStatus !== "Unknown") {
          chosen = cacheTs >= dbTs ? cacheStatus : dbStatus;
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
    const t = setInterval(fetchStatus, 2000);
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
          live?.estimated_energy ??
          0
        );

        let kwh = Number.isFinite(session) ? session : 0;
        setLiveEnergyKWh(kwh);

        setLiveCost((prev) => {
          if (typeof live?.estimated_amount === "number") {
            return live.estimated_amount;
          }
          return prev;
        });
      } catch (err) {
        console.error("❌ 即時量測更新失敗：", err);
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId, pricePerKWh]);

  // ---------- 餘額抓取 ----------
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const { data } = await axios.get(
          `/api/cards/${encodeURIComponent(cardId)}/balance`
        );
        const bal = Number(data?.balance ?? data ?? 0);
        if (!cancelled) setRawBalance(bal);
      } catch {}
    };

    fetchBalance();
    const t = setInterval(fetchBalance, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cardId]);

  // ---------- 顯示餘額（不自動停充） ----------
  useEffect(() => {
    // liveCost 或 rawBalance 可能在頁面切換瞬間變成 0 → 造成誤判
    // 此版本：保留上一個有效值，不讓餘額突然跳到 0
    setDisplayBalance((prev) => {
      const nb = rawBalance - liveCost;

      // 若計算結果為 NaN → 保留上一個正常值
      if (Number.isNaN(nb)) return prev;

      // 若計算結果 < 0，但 rawBalance 並未真正為 0 → 永遠不自動停充
      if (nb < 0 && rawBalance > 0) return prev;

      // 若為正常值 → 更新
      return nb >= 0 ? nb : 0;
    });
  }, [rawBalance, liveCost]);

  // ============================================================
  // 🚫 **完全移除自動停充邏輯**
  // ============================================================
  // 以下邏輯原本長這樣：
  //
  // if (!sentAutoStop && cpStatus === "Charging" && displayBalance <= 0.01) {
  //   axios.post(`/api/charge-points/${cpId}/stop`);
  // }
  //
  // → 造成換頁瞬間 displayBalance = 0，就誤停充
  //
  // 🔥 已依方案 A 完全移除，不再做任何停充動作
  // ============================================================

  // ---------- 偵測 StopTransaction，凍結畫面 ----------
  useEffect(() => {
    if (!cpId) return;

    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = cpStatus;

    if (prevStatus === "Charging" && cpStatus !== "Charging") {
      // 樁端真的停充（不是前端觸發）
      setFrozenAfterStop(true);
      setFrozenCost(liveCost);
      setRawAtFreeze(rawBalance);
      setStopTime(new Date().toISOString());
    }
  }, [cpStatus]);

  // ---------- 若重新開始充電，解除凍結 ----------
  useEffect(() => {
    if (cpStatus === "Charging") {
      setFrozenAfterStop(false);
      setFrozenCost(0);
      setRawAtFreeze(null);
      setStartTime(new Date().toISOString());
    }
  }, [cpStatus]);

  // ---------- 點卡片抓餘額 ----------
  const onCardChange = (e) => {
    const newCard = e.target.value;
    setCardId(newCard);
  };

  // ---------- 點樁抓狀態 ----------
  const onCpChange = (e) => {
    const newCp = e.target.value;
    setCpId(newCp);
    setFrozenAfterStop(false);
    setFrozenCost(0);
    setRawAtFreeze(null);
  };

  // ---------- 分段電價統計 ----------
  useEffect(() => {
    if (!cpId) return;

    let cancelled = false;

    const fetchPriceBreakdown = async () => {
      try {
        const { data } = await axios.get(
          `/api/charge-points/${encodeURIComponent(cpId)}/price-breakdown`
        );
        if (!cancelled) {
          if (Array.isArray(data)) setPriceBreakdown(data);
          else setPriceBreakdown([]);
        }
      } catch {
        if (!cancelled) setPriceBreakdown([]);
      }
    };

    const t = setInterval(fetchPriceBreakdown, 3000);
    fetchPriceBreakdown();

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId]);

  // ---------- 累積時間顯示 ----------
  useEffect(() => {
    if (cpStatus !== "Charging") {
      setElapsedTime("—");
      return;
    }

    const startTs = Date.now();
    const timer = setInterval(() => {
      const diff = Date.now() - startTs;
      const sec = Math.floor(diff / 1000);
      const h = String(Math.floor(sec / 3600)).padStart(2, "0");
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      setElapsedTime(`${h}:${m}:${s}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [cpStatus]);

  // ============================================================
  //                       🔽 介面渲染 (UI) 🔽
  // ============================================================
  return (
    <div className="live-status-page" style={{ padding: "20px" }}>
      {/* 卡片選單 */}
      <div className="form-row">
        <label>卡片 ID：</label>
        <select value={cardId} onChange={onCardChange}>
          {cardList.map((c) => (
            <option key={c.card_id} value={c.card_id}>
              {c.card_id}
            </option>
          ))}
        </select>
      </div>

      {/* 樁選單 */}
      <div className="form-row">
        <label>充電樁：</label>
        <select value={cpId} onChange={onCpChange}>
          {cpList.map((cp) => (
            <option
              key={cp.chargePointId ?? cp.id}
              value={cp.chargePointId ?? cp.id}
            >
              {cp.name ?? cp.id ?? cp.chargePointId}
            </option>
          ))}
        </select>
      </div>

      <hr />

      {/* 電價 */}
      <div className="info">
        <span>⚡ 電價：</span>
        <b>{pricePerKWh.toFixed(2)} 元/kWh</b>
        {priceLabel && <span>｜{priceLabel}</span>}
        {priceFallback && <span style={{ color: "orange" }}>（fallback）</span>}
      </div>

      {/* 餘額 */}
      <div className="info">
        <span>💳 卡片餘額：</span>
        <b>{displayBalance.toFixed(3)} 元</b>
      </div>

      {/* 狀態 */}
      <div className="info">
        <span>🧍 狀態：</span>
        <b>{cpStatus}</b>
      </div>

      <hr />

      {/* 即時資料 */}
      <div className="info">
        <span>⚡ 即時功率：</span>
        <b>{livePowerKw.toFixed(2)} kW</b>
      </div>
      <div className="info">
        <span>🔌 電壓：</span>
        <b>{liveVoltageV.toFixed(1)} V</b>
      </div>
      <div className="info">
        <span>🔋 電流：</span>
        <b>{liveCurrentA.toFixed(1)} A</b>
      </div>

      {/* 累積電量 */}
      <div className="info">
        <span>🔄 本次充電累積電量：</span>
        <b>{liveEnergyKWh.toFixed(3)} kWh</b>
      </div>

      {/* 預估電費 */}
      <div className="info">
        <span>💰 預估電費：</span>
        <b>{liveCost.toFixed(3)} 元</b>
      </div>

      {/* 計時 */}
      <div className="info">
        <span>⏳ 累積時間：</span>
        <b>{elapsedTime}</b>
      </div>

      <hr />

      {/* 分段電價統計 */}
      <div style={{ marginTop: "20px" }}>
        <h3>分段電價統計</h3>

        {priceBreakdown.length === 0 ? (
          <div style={{ opacity: 0.5 }}>尚無分段資料</div>
        ) : (
          <table style={{ width: "100%", marginTop: "10px", color: "#fff" }}>
            <thead>
              <tr>
                <th align="left">時段</th>
                <th align="right">度數 (kWh)</th>
                <th align="right">電價</th>
                <th align="right">小計</th>
              </tr>
            </thead>
            <tbody>
              {priceBreakdown.map((p, idx) => (
                <tr key={idx}>
                  <td>
                    {p.start} ~ {p.end}
                  </td>
                  <td align="right">{p.kwh.toFixed(3)}</td>
                  <td align="right">{p.price.toFixed(2)}</td>
                  <td align="right">{p.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: "10px", textAlign: "right", fontSize: "20px" }}>
          合計金額：<b>{priceBreakdown.reduce((a, b) => a + b.cost, 0).toFixed(2)}</b> 元
        </div>
      </div>

      <hr />

      {/* 停止後凍結顯示 */}
      {frozenAfterStop && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            background: "#333",
            borderRadius: "5px",
          }}
        >
          <h3>本次充電已結束</h3>
          <div>🔋 本次電費：{frozenCost.toFixed(2)} 元</div>
          <div>💳 結束時餘額：{rawAtFreeze?.toFixed?.(2)} 元</div>
          <div>⏱ 充電結束時間：{formatTime(stopTime)}</div>
        </div>
      )}
    </div>
  );
}
