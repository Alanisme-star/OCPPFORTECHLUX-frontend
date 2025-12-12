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

  // ⭐ 新增：分段電價明細
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

        // ⭐ 解析後端回傳
        const e = energyRes.data || {};
        const session = Number(
          e?.sessionEnergyKWh ??
          e?.totalEnergyKWh ??
          live?.estimated_energy ??
          0
        );
        const kwh = Number.isFinite(session) ? session : 0;

        // ⭐ Only update when Charging
        if (cpStatus === "Charging") {
          setLiveEnergyKWh(kwh);
          setLiveCost(
            typeof live.estimated_amount === "number"
              ? live.estimated_amount
              : 0
          );
        }

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
  }, [cpId, pricePerKWh, cpStatus]);




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




  // ⭐ 當樁狀態變成 Available（可用）時，重置分段電價統計
  useEffect(() => {
      const prev = prevStatusRef.current;

      // ⭐ 只有「充電結束後」回到 Available 才清空
      if (prev === "Charging" && cpStatus === "Available") {
          setPriceBreakdown([]);
          setLiveCost(0);
          setLiveEnergyKWh(0);
      }

      prevStatusRef.current = cpStatus;
  }, [cpStatus]);




  // ⭐ 當狀態從非 Charging → Charging，重置交易時間
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== "Charging" && cpStatus === "Charging") {
      setStopMsg("");   // ✅ 新開始充電 → 清除舊訊息
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


  // ---------- 🧩 自動停充判斷 ----------
  useEffect(() => {
    // 條件：尚未送出停充、目前正在充電、餘額接近零、確實有充電樁ID
    if (
        !sentAutoStop &&
        cpStatus === "Charging" &&
        Number.isFinite(displayBalance) &&
        displayBalance > 0 &&          // 🚫 避免 displayBalance=0 的瞬間誤判
        displayBalance <= 0.01 &&      // 真的到臨界點才停樁
        cpId
    ) {

      console.log("⚠️ 偵測餘額歸零，準備自動停充...");
      setSentAutoStop(true);
      setStopMsg("⚠️ 餘額不足，自動發送停止充電命令…");

      axios
        .post(`/api/charge-points/${encodeURIComponent(cpId)}/stop`)
        .then(() => {
          console.log("✅ 自動停充成功");
          setStopMsg("🔔 餘額不足，已自動停止充電。");
        })
        .catch((err) => {
          console.error("❌ 自動停充失敗：", err);
          setStopMsg("");
          // 若失敗，允許重新嘗試
          setSentAutoStop(false);
        });
    }
  }, [displayBalance, cpStatus, cpId, sentAutoStop]);




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
          // ✅ 僅在狀態真的是 Available 或 Finishing 時才清空
          if (["Available", "Finishing", "Faulted"].includes(cpStatus)) {
            setStartTime("");
            setStopTime("");
            setElapsedTime("—");
          } else {
            console.debug("⚠️ 保留 startTime 與 elapsedTime（避免跨日誤清）");
          }
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


  // ⭐ 自動抓取分段電價明細
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;

    const fetchBreakdown = async () => {
      try {
        const { data } = await axios.get(
          `/api/charge-points/${encodeURIComponent(cpId)}/current-transaction/price-breakdown`
        );

        // ⭐ Available 時禁止覆寫資料（維持前端清空）
        if (!cancelled && cpStatus !== "Available") {

          // ⭐ 只有 backend confirmed found=true 才更新
          if (data?.found) {
            setPriceBreakdown(data.segments || []);
          }
          // 🚫 不再在 found=false 時清空，避免跳動
        }

      } catch (err) {
        console.warn("❌ 分段電價取得失敗：", err);
      }
    };

    fetchBreakdown();
    const t = setInterval(fetchBreakdown, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId, cpStatus]);



  // ⭐ 當樁狀態變成 Available 時，清空分段電價（安全不跳動）
  useEffect(() => {
    if (cpStatus === "Available") {
      console.log("🔄 樁已回到 Available → 強制清空本次資料");

      setPriceBreakdown([]);   // 分段電價清空
      setLiveCost(0);          // 預估電費歸零
      setLiveEnergyKWh(0);     // 累積電量歸零

      setStartTime("");
      setStopTime("");
      setElapsedTime("—");

      // ⭐ 全部凍結狀態一併清除
      setFrozenAfterStop(false);
      setFrozenCost(0);
      setRawAtFreeze(null);

      setSentAutoStop(false);
      setStopMsg("");
    }
  }, [cpStatus]);





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

      <p>
        ⚡ 電價：{pricePerKWh.toFixed(2)} 元/kWh
        {priceFallback ? "（預設）" : ""} {priceLabel ? `｜${priceLabel}` : ""}
      </p>


      <p>💳 卡片餘額：{displayBalance.toFixed(3)} 元</p>

      <p>🔌 狀態：{statusLabel(cpStatus)}</p>
      {stopMsg && (
            <p style={{ color: "orange", position: "relative", paddingRight: "24px" }}>
                  {stopMsg}
                  <span
                        onClick={() => setStopMsg("")}
                        style={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              cursor: "pointer",
                              fontWeight: "bold"
                        }}
                  >
                        ✕
                  </span>
            </p>
      )}


      <p>💳 選擇卡片 ID：{cardId || "—"}</p>

      <p>⚡ 即時功率：{livePowerKw.toFixed(2)} kW</p>
      <p>🔋 本次充電累積電量：{liveEnergyKWh.toFixed(3)} kWh</p>
      <p>💰 預估電費（多時段）：{liveCost.toFixed(3)} 元</p>




      {/* ✅ 分段電價統計 */}
      <div style={{ marginTop: 20, padding: 12, background: "#333", borderRadius: 8 }}>
        <h3>分段電價統計</h3>

        {priceBreakdown.length === 0 ? (
          <p>尚無分段資料</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #666", textAlign: "left" }}>時間段</th>
                <th style={{ borderBottom: "1px solid #666", textAlign: "right" }}>用電量 (kWh)</th>
                <th style={{ borderBottom: "1px solid #666", textAlign: "right" }}>電價 (元/kWh)</th>
                <th style={{ borderBottom: "1px solid #666", textAlign: "right" }}>小計 (元)</th>
              </tr>
            </thead>


            <tbody>
              {priceBreakdown.map((seg, idx) => {
                const start = seg.start ? new Date(seg.start) : null;
                const end = seg.end ? new Date(seg.end) : null;

                const formatTime = (d) =>
                  d
                    ? d.toLocaleTimeString("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "—";

                return (
                  <tr key={idx}>
                    <td>
                      {formatTime(start)} → {formatTime(end)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(seg.kwh).toFixed(4)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(seg.price).toFixed(0)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(seg.subtotal).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>







          </table>
        )}

        <div style={{ marginTop: 10, fontWeight: "bold", fontSize: "1.2em", textAlign: "right" }}>
          合計金額：{liveCost.toFixed(2)} 元
        </div>
      </div>






      <p>🔋 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔌 電流：{liveCurrentA.toFixed(1)} A</p>

      <p>⏱️ 充電開始時間：{formatTime(startTime)}</p>
      <p>⏱️ 充電結束時間：{formatTime(stopTime)}</p>




      
      <p>⏳ 本次充電累積時間：{elapsedTime}</p>

    </div>
  );
}

