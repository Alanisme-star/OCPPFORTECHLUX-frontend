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
  const [liveSingleCpMaxPowerKw, setLiveSingleCpMaxPowerKw] = useState(7);


  // =======================
  // 🏘️ Smart Charging（後端裁決顯示）
  // 第一階段：功率分配模式
  // =======================
  const [smartEnabled, setSmartEnabled] = useState(false);
  const [communityKw, setCommunityKw] = useState(0);
  const [activeCars, setActiveCars] = useState(0);
  const [allocatedPowerKw, setAllocatedPowerKw] = useState(null);
  const [previewCurrentA, setPreviewCurrentA] = useState(null);
  const [singleCpMaxPowerKw, setSingleCpMaxPowerKw] = useState(7);
  const [smartManagedBy, setSmartManagedBy] = useState("power");
  const [smartReason, setSmartReason] = useState("");

  // Debug - 實際下發狀態（current_limit_state）
  // { cp_id, requested_limit_a, requested_power_kw, applied, last_error, ... }
  const [limitDebug, setLimitDebug] = useState(null);

  // live-status 補充欄位（由後端提供）
  const [liveAllocatedPowerKw, setLiveAllocatedPowerKw] = useState(null);
  const [livePreviewCurrentA, setLivePreviewCurrentA] = useState(null);
  const [liveManagedBy, setLiveManagedBy] = useState("power");


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

  // ⭐ 自動停充安全旗標（不受換頁影響）
  const seenPositiveBalanceRef = useRef(false);
  const autoStopUsedRef = useRef(false);

  // ✅ 新增：交易層級保護
  const currentTxIdRef = useRef(null);
  const warmupRef = useRef(true);

  // ✅ 新增：即時量測逾時保護（避免模擬器關閉後 UI 仍卡 Charging）
  const lastLiveOkAtRef = useRef(0);          // 最後一次成功拿到 live-status 的時間（ms）
  const [liveStale, setLiveStale] = useState(false);
  const LIVE_STALE_MS = 15_000;              // 15 秒沒更新就視為逾時（可自行調整）

  // =====================================================
  // ✅ Step4：有效充電狀態（state 後、useEffect 前）
  // =====================================================
  const isChargingEffective = cpStatus === "Charging" && !liveStale;

  // ✅ UI 顯示用狀態
  const uiStatus = isChargingEffective
    ? "Charging"
    : (liveStale ? "Unknown" : cpStatus);


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

  // =======================
  // ⭐ Overview（多樁總覽）模式
  // =======================
  const [viewMode, setViewMode] = useState("detail"); // "detail" | "overview"
  const [overviewRows, setOverviewRows] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  const getCpId = (cp) => cp?.chargePointId ?? cp?.id ?? cp?.charge_point_id ?? "";



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

  // ---------- ⭐ Overview：輪詢多樁摘要 ----------
  useEffect(() => {
    if (viewMode !== "overview") return;
    if (!cpList || cpList.length === 0) return;

    let cancelled = false;
    let inFlight = false;

    const safeParseTime = (ts) => {
      if (!ts) return 0;
      const v = Date.parse(ts);
      return Number.isFinite(v) ? v : 0;
    };

    const fetchOne = async (oneCpId) => {
      // 這裡只拿「總覽需要的最小資料」：status + power + session kWh + estimated cost
      // ✅ 完全不影響既有單樁詳情邏輯（單樁仍照原本 polling）。
      const row = {
        cpId: oneCpId,
        status: "Unknown",
        powerKw: 0,
        energyKWh: 0,
        cost: 0,
        ts: Date.now(),
      };

      try {
        const [dbRes, cacheRes, liveRes, energyRes] = await Promise.allSettled([
          axios.get(`/api/charge-points/${encodeURIComponent(oneCpId)}/latest-status`),
          axios.get(`/api/charge-points/${encodeURIComponent(oneCpId)}/status`),
          axios.get(`/api/charge-points/${encodeURIComponent(oneCpId)}/live-status`),
          axios.get(`/api/charge-points/${encodeURIComponent(oneCpId)}/latest-energy`),
        ]);

        // ---- status（沿用你原本的「DB vs cache」取用規則） ----
        let dbStatus = "Unknown", dbTs = 0;
        if (dbRes.status === "fulfilled") {
          const d = dbRes.value?.data;
          dbStatus = (d?.status ?? d ?? "Unknown") || "Unknown";
          dbTs = safeParseTime(d?.timestamp);
        }
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
        if (chosen === "未知") chosen = "Unknown";
        row.status = chosen;

        // ---- live ----
        if (liveRes.status === "fulfilled") {
          const live = liveRes.value?.data || {};
          const kw = Number(live?.power ?? 0);
          row.powerKw = Number.isFinite(kw) ? kw : 0;
          row.cost = typeof live?.estimated_amount === "number" ? live.estimated_amount : 0;
        }
        if (energyRes.status === "fulfilled") {
          const e = energyRes.value?.data || {};
          const session = Number(e?.sessionEnergyKWh ?? e?.totalEnergyKWh ?? 0);
          row.energyKWh = Number.isFinite(session) ? session : 0;
        }

        // 非 Charging：為了「總覽一眼看懂」，功率歸零
        if (row.status !== "Charging") {
          row.powerKw = 0;
        }

        row.ts = Date.now();
        return row;
      } catch (e) {
        return row;
      }
    };

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      setOverviewError("");
      setOverviewLoading(true);
      try {
        const ids = cpList.map(getCpId).filter(Boolean);
        const rows = await Promise.all(ids.map((id) => fetchOne(id)));
        if (!cancelled) setOverviewRows(rows);
      } catch (err) {
        if (!cancelled) setOverviewError("Overview 更新失敗");
      } finally {
        inFlight = false;
        if (!cancelled) setOverviewLoading(false);
      }
    };

    tick();
    const t = setInterval(tick, 2_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [viewMode, cpList]);

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

        // ✅ 只要成功拿到回應，就視為「即時資料有更新」
        lastLiveOkAtRef.current = Date.now();
        setLiveStale(false);

        const live = liveRes.data || {};
        setLiveAllocatedPowerKw(
          Number.isFinite(Number(live?.allocated_power_kw))
            ? Number(live.allocated_power_kw)
            : null
        );
        setLivePreviewCurrentA(
          Number.isFinite(Number(live?.preview_current_a))
            ? Number(live.preview_current_a)
            : null
        );
        setLiveManagedBy(live?.managed_by ?? "power");
        setLiveSingleCpMaxPowerKw(
          Number.isFinite(Number(live?.single_cp_max_power_kw))
            ? Number(live.single_cp_max_power_kw)
            : 7
        );

        // 🔒 Step4 Gate：非「有效充電」時，直接歸零並中斷
        if (!isChargingEffective) {
          setLivePowerKw(0);
          setLiveVoltageV(0);
          setLiveCurrentA(0);
          setLiveEnergyKWh(0);
          setLiveCost(0);
          return;
        }



        // ↓↓↓ 以下僅在 Charging 時才會執行 ↓↓↓
        const kw = Number(live?.power ?? 0);
        const vv = Number(live?.voltage ?? 0);
        const aa = Number(live?.current ?? 0);

        setLivePowerKw(Number.isFinite(kw) ? kw : 0);
        setLiveVoltageV(Number.isFinite(vv) ? vv : 0);
        setLiveCurrentA(Number.isFinite(aa) ? aa : 0);

        // ✅ 一旦成功收到「有效即時功率」，解除暖機
        if (Number.isFinite(kw) && kw > 0) {
          warmupRef.current = false;
        }

        const e = energyRes.data || {};
        const session = Number(
          e?.sessionEnergyKWh ??
          e?.totalEnergyKWh ??
          live?.estimated_energy ??
          0
        );
        const kwh = Number.isFinite(session) ? session : 0;

        setLiveEnergyKWh(kwh);
        setLiveCost(
          typeof live.estimated_amount === "number"
            ? live.estimated_amount
            : 0
        );

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
  }, [cpId, isChargingEffective]);


  // ✅ 新增：stale 偵測（Charging 但太久沒 live 更新 → 視為非充電中）
  useEffect(() => {
    let timer = null;

    const check = () => {
      if (cpStatus !== "Charging") {
        setLiveStale(false);
        return;
      }

      const last = Number(lastLiveOkAtRef.current || 0);
      if (!last) {
        // 還沒拿到任何一次 live-status（剛進頁/剛切換 cp）
        setLiveStale(false);
        return;
      }

      const stale = Date.now() - last > LIVE_STALE_MS;
      setLiveStale(stale);

      // 逾時時，順手把即時量測歸零（避免畫面殘留）
      if (stale) {
        setLivePowerKw(0);
        setLiveVoltageV(0);
        setLiveCurrentA(0);
      }
    };

    check();
    timer = setInterval(check, 2000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cpStatus, cpId]);




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


  // ⭐ 新增：當開始新一輪充電時，重置所有即時量測與預估
  useEffect(() => {
    const prev = prevStatusRef.current;

    if (prev !== "Charging" && cpStatus === "Charging") {
      setLiveEnergyKWh(0);
      setLiveCost(0);
      setLivePowerKw(0);
      setLiveVoltageV(0);
      setLiveCurrentA(0);

      // ✅ 新交易開始 → 重置所有自動停充狀態
      seenPositiveBalanceRef.current = false;
      autoStopUsedRef.current = false;
      currentTxIdRef.current = null;
      warmupRef.current = true;

      setStopMsg("");
      setStartTime("");
      setStopTime("");
    }

    prevStatusRef.current = cpStatus;
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

  // ⭐ 方案 B：Charging → Suspended 時凍結顯示餘額；恢復 Charging 自動解除
  useEffect(() => {
    const isSuspended =
      cpStatus === "SuspendedEV" || cpStatus === "SuspendedEVSE";

    // 進入 Suspended：如果尚未凍結，立刻凍結（用 rawBalance - liveCost）
    if (isSuspended && !frozenAfterStop) {
      const base = Number.isFinite(rawBalance) ? rawBalance : 0;
      const cost = Number.isFinite(liveCost) ? liveCost : 0;

      setFrozenAfterStop(true);
      setFrozenCost(cost);
      setRawAtFreeze(base);

      console.log(
        "[FREEZE][BALANCE]",
        "cpStatus=", cpStatus,
        "rawBalance=", base,
        "liveCost=", cost,
        "frozenDisplay=", Math.max(0, base - cost)
      );
      return;
    }

    // Suspended → Charging：解除凍結，回到即時計算
    if (cpStatus === "Charging" && frozenAfterStop) {
      setFrozenAfterStop(false);
      setFrozenCost(0);
      setRawAtFreeze(null);

      console.log("[FREEZE][RELEASE] resume charging");
    }
  }, [cpStatus, rawBalance, liveCost, frozenAfterStop]);


  // ---------- 顯示餘額（方案 B：Suspended 凍結顯示） ----------
  useEffect(() => {
    let nb = 0;

    // ✅ 如果目前處於凍結狀態（Suspended 時會被 Step1 設為 true）
    if (frozenAfterStop && rawAtFreeze != null) {
      nb = Math.max(
        0,
        rawAtFreeze - (Number.isFinite(frozenCost) ? frozenCost : 0)
      );
      setDisplayBalance(nb);
      return;
    }

    // 充電中：顯示即時預估扣款
    if (cpStatus === "Charging") {
      const base = Number.isFinite(rawBalance) ? rawBalance : 0;
      const cost = Number.isFinite(liveCost) ? liveCost : 0;
      nb = base - cost;

      // ⭐ 記錄：本交易中曾經看過餘額 > 0
      if (nb > 0) {
        seenPositiveBalanceRef.current = true;
      }
    } else {
      // 其它狀態：顯示後端餘額（例如 Available / Finishing）
      nb = Number.isFinite(rawBalance) ? rawBalance : 0;
    }

    setDisplayBalance(nb > 0 ? nb : 0);
  }, [
    rawBalance,
    liveCost,
    cpStatus,
    frozenAfterStop,
    rawAtFreeze,
    frozenCost,
  ]);




  // ---------- 🧩 自動停充判斷（交易級保護 + 換頁安全） ----------
  useEffect(() => {
    if (
      cpStatus === "Charging" &&
      cpId &&
      currentTxIdRef.current &&        // ✅ 必須綁定交易（避免換頁誤判）
      !warmupRef.current &&            // ✅ 已完成暖機（避免第一秒誤判）
      !autoStopUsedRef.current &&      // 本交易尚未停充
      seenPositiveBalanceRef.current &&// 曾經看過餘額 > 0
      Number.isFinite(displayBalance) &&
      displayBalance <= 0.01           // 現在才變成 0
    ) {
      console.log("⚠️ 偵測餘額由正轉零，自動停充（交易級）");

      autoStopUsedRef.current = true;  // 🔒 鎖定，只停一次
      setSentAutoStop(true);
      setStopMsg("⚠️ 餘額不足，自動發送停止充電命令…");

      axios
        .post(`/api/charge-points/${encodeURIComponent(cpId)}/stop`)
        .then(() => {
          setStopMsg("🔔 餘額不足，已自動停止充電。");
        })
        .catch(() => {
          // 若失敗，解除鎖定允許重試
          autoStopUsedRef.current = false;
          setSentAutoStop(false);
          setStopMsg("");
        });
    }
  }, [displayBalance, cpStatus, cpId]);



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

          // ✅ 新增：只在尚未設定時，記住本筆交易 ID
          if (res.data.transaction_id && !currentTxIdRef.current) {
            currentTxIdRef.current = res.data.transaction_id;
          }

          setStartTime((prev) => {
            if (prev && cpStatus === "Charging") {
              return prev;
            }
            return res.data.start_timestamp;
          });
          setStopTime("");
        
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
  }, [cpId, cpStatus, liveStale]);  // ⭐ 保持依賴 cpId / cpStatus

  // ---------- ⭐ 補強版：本次充電累積時間 ----------
  useEffect(() => {
    let timer = null;

    // ✅ 僅在「確認充電中」時才計時
    if (isChargingEffective && startTime) {
      timer = setInterval(() => {
        const start = Date.parse(startTime);
        if (!Number.isNaN(start)) {
          const now = Date.now();
          const diff = Math.max(0, now - start);
          const hh = String(Math.floor(diff / 3600000)).padStart(2, "0");
          const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
          const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
          setElapsedTime(`${hh}:${mm}:${ss}`);
        }
      }, 1000);
    } else {
      // 🔴 非 Charging（Available / Faulted / Suspended / Finishing）
      // → 一律停表
      setElapsedTime("—");
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cpStatus, liveStale, startTime]);


  // ⭐ 自動抓取分段電價明細（修正版）
  useEffect(() => {
    if (!cpId) return;
    let cancelled = false;

    const fetchBreakdown = async () => {
      try {
        const { data } = await axios.get(
          `/api/charge-points/${encodeURIComponent(cpId)}/current-transaction/price-breakdown`
        );

        if (cancelled) return;

        // ✅ Available 一律清空（避免殘留上一筆）
        if (cpStatus === "Available") {
          setPriceBreakdown([]);
          return;
        }

        // ✅ 僅 Charging / Finishing 且 found=true 才顯示
        if (
          (cpStatus === "Charging" || cpStatus === "Finishing") &&
          data?.found
        ) {
          setPriceBreakdown(data.segments || []);
          return;
        }

        // ✅ Preparing / Suspended / found=false → 強制清空
        setPriceBreakdown([]);

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


  useEffect(() => {
    if (cpStatus === "Available" || cpStatus === "Faulted") {
      console.log("🔄 交易已結束（狀態回到非 Charging）");

      // ✅ 僅清「交易生命週期相關狀態」
      setStartTime("");
      setStopTime("");
      setElapsedTime("—");

      // 顯示層資料（保留金額邏輯）
      setPriceBreakdown([]);

      setSentAutoStop(false);
      setStopMsg("");
    }
  }, [cpStatus]);




  // =======================
  // 🏘️ Smart Charging 狀態輪詢（後端裁決）
  // =======================
  useEffect(() => {
    let cancelled = false;

    const fetchSmartStatus = async () => {
      try {
        // 1) 契約 / 分配狀態
        const { data } = await axios.get("/api/community-settings");

        if (cancelled) return;

        setSmartEnabled(!!data.enabled);
        setCommunityKw(Number(data.contract_kw || 0));
        setActiveCars(Number(data.active_charging_count || 0));
        setAllocatedPowerKw(
          Number.isFinite(Number(data.allocated_power_kw))
            ? Number(data.allocated_power_kw)
            : null
        );
        setPreviewCurrentA(
          Number.isFinite(Number(data.preview_current_a))
            ? Number(data.preview_current_a)
            : null
        );
        setSingleCpMaxPowerKw(
          Number.isFinite(Number(data.single_cp_max_power_kw))
            ? Number(data.single_cp_max_power_kw)
            : 7
        );
        setSmartManagedBy(data.managed_by ?? "power");
        setSmartReason(data.blocked_reason || "");

        // 2) Debug：實際下發狀態（依目前選到的 cpId）
        if (cpId) {
          try {
            const dbg = await axios.get(
              `/api/debug/current-limit-state?cp_id=${encodeURIComponent(cpId)}`
            );
            const items = Array.isArray(dbg.data?.items) ? dbg.data.items : [];
            setLimitDebug(items[0] || null);
          } catch (e) {
            setLimitDebug(null);
          }
        } else {
          setLimitDebug(null);
        }
      } catch (err) {
        console.warn("[SMART][UI] fetch failed", err?.message);
      }
    };

    fetchSmartStatus();
    const t = setInterval(fetchSmartStatus, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [cpId]);




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

      {/* ====== View Mode Switch ====== */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "12px 0 16px" }}>
        <button
          onClick={() => setViewMode("detail")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: viewMode === "detail" ? "1px solid #fff" : "1px solid #666",
            background: viewMode === "detail" ? "#2a2a2a" : "#151515",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          🧾 單樁詳情
        </button>
        <button
          onClick={() => setViewMode("overview")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: viewMode === "overview" ? "1px solid #fff" : "1px solid #666",
            background: viewMode === "overview" ? "#2a2a2a" : "#151515",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          🧩 多樁總覽
        </button>
        <div style={{ opacity: 0.8, fontSize: 12 }}>
          {viewMode === "overview" ? "（總覽模式：每 2 秒更新一次摘要）" : ""}
        </div>
      </div>

      {viewMode === "overview" ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: "bold" }}>📋 多設備監控總覽</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {overviewLoading ? "更新中…" : ""} {overviewError ? `｜${overviewError}` : ""}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {(overviewRows || []).map((r) => (
              <div
                key={r.cpId}
                style={{
                  border: "1px solid #444",
                  borderRadius: 12,
                  padding: 12,
                  background: "#202020",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: "bold" }}>🔌 {r.cpId}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>{statusLabel(r.status)}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 10, fontSize: 14 }}>
                  <div>⚡ 功率</div>
                  <div style={{ textAlign: "right" }}>{Number(r.powerKw || 0).toFixed(2)} kW</div>
                  <div>🔋 本次電量</div>
                  <div style={{ textAlign: "right" }}>{Number(r.energyKWh || 0).toFixed(3)} kWh</div>
                  <div>💰 預估金額</div>
                  <div style={{ textAlign: "right" }}>{Number(r.cost || 0).toFixed(2)} 元</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    更新：{new Date(r.ts || Date.now()).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                  <button
                    onClick={() => {
                      setCpId(r.cpId);
                      setViewMode("detail");
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #666",
                      background: "#151515",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    查看
                  </button>
                </div>
              </div>
            ))}
          </div>

          {(!overviewRows || overviewRows.length === 0) && (
            <div style={{ marginTop: 12, opacity: 0.8 }}>尚無充電樁資料</div>
          )}
        </div>
      ) : (
        <>

        {/* ===================== */}
        {/* 🏘️ Smart Charging 狀態 */}
        {/* ===================== */}
        {smartEnabled && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#243028",
              border: "1px solid #4caf50",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 10 }}>
              🏘️ 社區 Smart Charging
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
                fontSize: 14,
              }}
            >
              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>管理模式</div>
                <div style={{ color: "#7ec8ff", fontWeight: "bold" }}>
                  {smartManagedBy === "power" ? "功率分配" : smartManagedBy || "-"}
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>契約容量</div>
                <div style={{ color: "#fff", fontWeight: "bold" }}>
                  {communityKw} kW
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>目前充電台數</div>
                <div style={{ color: "#fff", fontWeight: "bold" }}>
                  {activeCars} 台
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>單樁固定上限</div>
                <div style={{ color: "#8cff9a", fontWeight: "bold" }}>
                  {singleCpMaxPowerKw ?? 7} kW
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>每樁分配功率</div>
                <div style={{ fontWeight: "bold" }}>
                  {allocatedPowerKw != null ? (
                    <span style={{ color: "#8cff9a" }}>{allocatedPowerKw} kW</span>
                  ) : (
                    <span style={{ color: "#ff8080" }}>—</span>
                  )}
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>預估下發電流</div>
                <div style={{ fontWeight: "bold" }}>
                  {previewCurrentA != null ? (
                    <span style={{ color: "#7ec8ff" }}>{previewCurrentA} A</span>
                  ) : (
                    <span style={{ color: "#ff8080" }}>—</span>
                  )}
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>本樁顯示分配功率</div>
                <div style={{ fontWeight: "bold" }}>
                  {liveAllocatedPowerKw != null ? (
                    <span style={{ color: "#8cff9a" }}>{liveAllocatedPowerKw} kW</span>
                  ) : (
                    <span style={{ color: "#ff8080" }}>—</span>
                  )}
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>本樁預估下發電流</div>
                <div style={{ fontWeight: "bold" }}>
                  {livePreviewCurrentA != null ? (
                    <span style={{ color: "#7ec8ff" }}>{livePreviewCurrentA} A</span>
                  ) : (
                    <span style={{ color: "#ff8080" }}>—</span>
                  )}
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>後端實際請求下發</div>
                <div style={{ fontWeight: "bold", color: "#fff" }}>
                  {limitDebug?.requested_limit_a != null
                    ? `${Number(limitDebug.requested_limit_a).toFixed(1)} A`
                    : "—"}
                </div>
                <div style={{ marginTop: 4, fontWeight: "bold" }}>
                  {limitDebug?.requested_power_kw != null ? (
                    <span style={{ color: "#8cff9a" }}>
                      {Number(limitDebug.requested_power_kw).toFixed(3)} kW
                    </span>
                  ) : (
                    <span style={{ color: "#ff8080" }}>—</span>
                  )}
                </div>
              </div>

              <div style={{ background: "#1f2a23", border: "1px solid #3f5a49", borderRadius: 8, padding: 10 }}>
                <div style={{ color: "#9fb7a7", marginBottom: 4 }}>是否已套用</div>
                <div
                  style={{
                    fontWeight: "bold",
                    color: limitDebug?.applied ? "#8cff9a" : "#ffd27f",
                  }}
                >
                  {limitDebug?.applied ? "是" : "否"}
                </div>
                <div style={{ marginTop: 4, color: "#ff9f9f", fontSize: 12 }}>
                  {limitDebug?.last_error || "—"}
                </div>
              </div>
            </div>

            {allocatedPowerKw == null && (
              <div style={{ marginTop: 10, color: "#ff8080", fontSize: 14 }}>
                ⛔ 條件不足，最後一台將被拒絕充電
              </div>
            )}

            {smartReason && (
              <div style={{ marginTop: 10, color: "#ffb74d", fontSize: 14 }}>
                ⚠️ 原因：{smartReason}
              </div>
            )}
          </div>
        )}


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

      <label>充電樁 ID：</label>
      <select
        value={cpId}
        onChange={(e) => setCpId(e.target.value)}
        style={inputStyle}
      >
        {cpList.map((cp) => {
          const id = cp.chargePointId ?? cp.id ?? "";
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

      <p>
        🔌 狀態：{statusLabel(uiStatus)}
        {liveStale ? "（即時資料逾時/可能已離線）" : ""}
      </p>
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
      <div style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: "#bbb", lineHeight: 1.7 }}>
        <div>🏘️ 管理模式：{liveManagedBy === "power" ? "功率分配" : liveManagedBy || "-"}</div>
        <div>🔒 本樁固定上限：{liveSingleCpMaxPowerKw ?? 7} kW</div>
        <div>
          ⚖️ 本樁顯示分配功率：
          {liveAllocatedPowerKw != null ? ` ${liveAllocatedPowerKw} kW` : " —"}
        </div>
        <div>
          🔽 本樁預估下發電流：
          {livePreviewCurrentA != null ? ` ${livePreviewCurrentA} A` : " —"}
        </div>
      </div>




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
      <p>⚡ 電壓：{liveVoltageV.toFixed(1)} V</p>
      <p>🔌 電流：{liveCurrentA.toFixed(1)} A</p>

      <p>⏱️ 充電開始時間：{formatTime(startTime)}</p>
      <p>⏱️ 充電結束時間：{formatTime(stopTime)}</p>

      
      <p>⏳ 本次充電累積時間：{elapsedTime}</p>

        </>
      )}
    </div>
  );
}
