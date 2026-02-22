import React, { useEffect, useMemo, useState } from "react";
import axios from "../axiosInstance";

/**
 * ============================================================
 * ChargePoints.jsx
 * 充電樁管理（含電流限制）
 *
 * ✅ 本次修正重點：
 * 1) 修正「按下編輯時，最大電流下拉仍固定 16A」的問題
 *    - React <select> 的 value 會以字串比對
 *    - 因此我們統一在 form state 使用字串（"6"/"10"/"16"/"32"）
 *    - 只有在送到後端時才 Number(form.max_current)
 *
 * 2) 顯示與行為邏輯對齊 LiveStatus：
 *    - 管理頁：設定「上限」
 *    - 即時狀態：充電中可立即下發（樁支援 SmartCharging 才會立即生效）
 *
 * 3) 保持原本 API payload key 命名方式（chargePointId / maxCurrent）
 *
 * ============================================================
 */

/**
 * 充電樁狀態選項
 */
const STATUS_OPTIONS = [
  { value: "enabled", label: "啟用" },
  { value: "disabled", label: "停用" },
];

/**
 * 常用電流選項（業界實務）
 *
 * ⚠️ 注意：
 * - <select> 的 value 比對是「字串」為主
 * - 所以 value 統一用字串 "6" "10" "16" "32"
 * - 送出 API 時再 Number() 轉成數字
 */
const CURRENT_OPTIONS = [
  { value: "6", label: "6A（低負載 / 夜間）" },
  { value: "10", label: "10A（家用安全）" },
  { value: "16", label: "16A（標準）" },
  { value: "32", label: "32A（最大）" },
];

/**
 * 小工具：把後端回來的 maxCurrent / max_current 安全轉成字串
 * - 若後端沒給值，回 "16"
 * - 若後端給 16（number），回 "16"
 * - 若後端給 "16"（string），也回 "16"
 */
const normalizeMaxCurrentToString = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "16";
  return String(n);
};

/**
 * 小工具：把 chargePointId 轉成可比較的 id 字串
 */
const normalizeChargePointId = (row) => {
  return row?.chargePointId || row?.charge_point_id || "";
};

/**
 * 小工具：從 CURRENT_OPTIONS 取得顯示 label（用於列表顯示更清楚）
 */
const getCurrentLabel = (valueStr) => {
  const opt = CURRENT_OPTIONS.find((x) => String(x.value) === String(valueStr));
  return opt?.label || `${valueStr}A`;
};

const ChargePoints = () => {
  /**
   * 列表資料
   */
  const [list, setList] = useState([]);

  /**
   * loading 狀態
   */
  const [loading, setLoading] = useState(true);

  // =======================
  // 🏘️ 社區 Smart Charging 設定（契約容量）
  // =======================
  const [communityCfg, setCommunityCfg] = useState({
    enabled: true,
    contractKw: "",
    voltageV: 220,
    minCurrentA: 16,
    maxCurrentA: 32,
  });

  const [communityPreview, setCommunityPreview] = useState({
    totalCurrentA: 0,
    maxCarsByMin: 0,
    allowedCurrentA: null,
    activeChargingCount: 0,
  });

  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySaving, setCommunitySaving] = useState(false);
  const [communityMsg, setCommunityMsg] = useState("");




  /**
   * 表單 state
   *
   * ✅ max_current 全程使用「字串」
   *   - 例如 "16"
   *   - 可確保 <select value={form.max_current}> 能正確匹配 option
   */
  const [form, setForm] = useState({
    charge_point_id: "",
    name: "",
    status: "enabled",
    max_current: "16",
  });

  /**
   * 是否為編輯模式
   * - null 表示新增
   * - string 表示正在編輯的 chargePointId
   */
  const [editingId, setEditingId] = useState(null);

  /**
   * 畫面標題（可留作後續 UI 調整）
   */
  const pageTitle = useMemo(() => {
    return "社區充電管理（含單機保護上限）";
  }, []);

  /**
   * 取得充電樁列表
   */
  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/charge-points");
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert("讀取失敗：" + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);


  // =======================
  // 🏘️ 讀取社區 Smart Charging 設定
  // =======================
  const fetchCommunitySettings = async () => {
    setCommunityLoading(true);
    setCommunityMsg("");
    try {
      const res = await axios.get("/api/community-settings");
      const d = res?.data || {};

      // 表單用（給使用者可編輯的欄位）
      setCommunityCfg({
        enabled: true,
        contractKw: d.contract_kw ?? d.contractKw ?? "",
        voltageV: Number(d.voltage_v ?? d.voltageV ?? 220),
        minCurrentA: Number(d.min_current_a ?? d.minCurrentA ?? 16),
        maxCurrentA: Number(d.max_current_a ?? d.maxCurrentA ?? 32),
      });

      // 預覽用（純顯示）
      setCommunityPreview({
        totalCurrentA: Number(d.total_current_a ?? 0),
        maxCarsByMin: Number(d.max_cars_by_min ?? 0),
        allowedCurrentA:
          Number.isFinite(Number(d.allowed_current_a))
            ? Number(d.allowed_current_a)
            : null,
        activeChargingCount: Number(d.active_charging_count ?? 0),
      });

    } catch (err) {
      setCommunityMsg("❌ 讀取社區設定失敗：" + (err?.message || "unknown"));
    }
    setCommunityLoading(false);
  };

  useEffect(() => {
    fetchCommunitySettings();
  }, []);

  const handleCommunityChange = (e) => {
    const { name, value } = e.target;
    setCommunityCfg((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveCommunitySettings = async () => {
    setCommunitySaving(true);
    setCommunityMsg("");
    try {
      await axios.post("/api/community-settings", {
        enabled: true,
        contractKw: Number(communityCfg.contractKw || 0),
        voltageV: Number(communityCfg.voltageV || 220),
        phases: 1,
        minCurrentA: Number(communityCfg.minCurrentA || 16),
        maxCurrentA: Number(communityCfg.maxCurrentA || 32),
      });

      setCommunityMsg("✅ 設定已儲存，並已立即生效");
      // 儲存後重新拉一次，更新預覽數值
      await fetchCommunitySettings();

    } catch (err) {
      setCommunityMsg("❌ 儲存失敗：" + (err?.message || "unknown"));
    }
    setCommunitySaving(false);
  };



  /**
   * 表單欄位變動
   *
   * 注意：
   * - 這裡一律以 e.target.value 進來（字串）
   * - status / max_current 都會是字串
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * 重置表單（新增模式）
   */
  const resetFormToDefault = () => {
    setForm({
      charge_point_id: "",
      name: "",
      status: "enabled",
      max_current: "16",
    });
  };

  /**
   * 新增 / 編輯送出
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /**
     * payload：維持你原本設計
     * - chargePointId: string
     * - maxCurrent: number
     */
    const payload = {
      chargePointId: form.charge_point_id,
      name: form.name,
      status: form.status,
      maxCurrent: Number(form.max_current), // ✅ 送出時轉數字（與 LiveStatus 一致）
    };

    try {
      if (editingId) {
        await axios.put(`/api/charge-points/${editingId}`, payload);
        setEditingId(null);
      } else {
        await axios.post("/api/charge-points", payload);
      }

      // 成功後重置 & 刷新
      resetFormToDefault();
      fetchList();
    } catch (err) {
      alert("儲存失敗：" + err.message);
    }
  };

  /**
   * 開始編輯
   *
   * ✅ 修正關鍵在這裡：
   * - max_current 必須是字串
   * - 否則 select 無法匹配 option，會看起來像「永遠停在預設 16」
   */
  const startEdit = (row) => {
    const id = normalizeChargePointId(row);

    setForm({
      charge_point_id: id,
      name: row?.name || "",
      status: row?.status || "enabled",

      // ✅ 修正：一律轉字串（"16" / "32"）
      max_current: normalizeMaxCurrentToString(row?.maxCurrent ?? row?.max_current),
    });

    setEditingId(id);
  };

  /**
   * 取消編輯
   */
  const cancelEdit = () => {
    setEditingId(null);
    resetFormToDefault();
  };

  /**
   * 刪除
   */
  const handleDelete = async (id) => {
    if (!window.confirm("確定刪除？")) return;
    try {
      await axios.delete(`/api/charge-points/${id}`);
      fetchList();
    } catch (err) {
      alert("刪除失敗：" + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{pageTitle}</h2>


      {/* =========================
          🏘️ 社區 Smart Charging（契約容量）
         ========================= */}
      <div className="mb-6 p-4 rounded border border-green-700 bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">🏘️ 社區 Smart Charging（契約容量）</div>

          <div className="text-sm">
            目前狀態：<span className="text-green-300 font-semibold">啟用中</span>
            <span className="text-gray-400 ml-2">（儲存後立即生效）</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm">
              契約容量（kW）
              <input
                type="number"
                name="contractKw"
                className="input input-bordered ml-2 p-1 rounded text-black"
                value={communityCfg.contractKw}
                onChange={handleCommunityChange}
                placeholder="例如 100"
                min={0}
              />
            </label>
          </div>

          <div>
            <label className="text-sm">
              電壓（V）
              <input
                type="number"
                name="voltageV"
                className="input input-bordered ml-2 p-1 rounded text-black"
                value={communityCfg.voltageV}
                onChange={handleCommunityChange}
                min={1}
              />
            </label>
          </div>

          <div>
            <label className="text-sm">
              最低電流（A）
              <input
                type="number"
                name="minCurrentA"
                className="input input-bordered ml-2 p-1 rounded text-black"
                value={communityCfg.minCurrentA}
                onChange={handleCommunityChange}
                min={1}
              />
            </label>
            <div className="text-xs text-gray-400 mt-1">低於此值：最後一台將被拒絕</div>
          </div>

          <div>
            <label className="text-sm">
              單樁上限（A）
              <input
                type="number"
                name="maxCurrentA"
                className="input input-bordered ml-2 p-1 rounded text-black"
                value={communityCfg.maxCurrentA}
                onChange={handleCommunityChange}
                min={1}
              />
            </label>
            <div className="text-xs text-gray-400 mt-1">高於此值：仍以此上限充電</div>
          </div>

          <button
            type="button"
            className="px-4 py-1 rounded bg-green-700 text-white"
            onClick={saveCommunitySettings}
            disabled={communitySaving}
          >
            {communitySaving ? "儲存中…" : "儲存設定"}
          </button>

          <button
            type="button"
            className="px-4 py-1 rounded bg-gray-700 text-white"
            onClick={fetchCommunitySettings}
            disabled={communityLoading}
          >
            {communityLoading ? "更新中…" : "重新讀取"}
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-200" style={{ lineHeight: 1.7 }}>
          <div>🔎 預覽：</div>
          <div>• 可用總電流：<b>{communityPreview.totalCurrentA}</b> A</div>
          <div>• 目前充電台數：<b>{communityPreview.activeChargingCount}</b> 台</div>
          <div>• 依最低電流推算「最多同時可充」：<b>{communityPreview.maxCarsByMin}</b> 台</div>
          <div>
            • 後端目前分配（每台）：{" "}
            {communityPreview.allowedCurrentA != null ? (
              <b className="text-green-300">{communityPreview.allowedCurrentA} A</b>
            ) : (
              <b className="text-red-300">（將拒絕最後一台）</b>
            )}
          </div>
          {communityMsg && <div className="mt-2">{communityMsg}</div>}
        </div>
      </div>





    </div>
  );
};

export default ChargePoints;
