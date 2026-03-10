import React, { useEffect, useMemo, useState } from "react";
import axios from "../axiosInstance";

/**
 * ============================================================
 * ChargePoints.jsx
 * 第一階段：充電樁管理（功率分配模式）
 *
 * ✅ 本次調整重點：
 * 1) 管理邏輯改為「功率思維」
 *    - 社區由契約容量（kW）統一管理
 *    - 每樁固定上限為 7kW
 *    - 不再提供每支樁上下限電流設定
 *
 * 2) 前端畫面改為顯示：
 *    - 系統依契約容量平均分配功率
 *    - 單機理論上限 7kW
 *    - 社區目前平均分配功率 / 預估下發電流
 *    - 不再顯示最低電流限制推算可充台數
 *
 * 3) CRUD 先保留基本相容
 *    - 充電樁仍可新增 / 編輯名稱 / 啟停
 *    - 第一階段不再讓使用者設定單樁 maxCurrent
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
 * 小工具：把 chargePointId 轉成可比較的 id 字串
 */
const normalizeChargePointId = (row) => {
  return row?.chargePointId || row?.charge_point_id || "";
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
  });

  const [communityPreview, setCommunityPreview] = useState({
    totalCurrentA: 0,
    allocatedPowerKw: null,
    previewCurrentA: null,
    activeChargingCount: 0,
    managedBy: "power",
    singleCpMaxPowerKw: 7,
  });

  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySaving, setCommunitySaving] = useState(false);
  const [communityMsg, setCommunityMsg] = useState("");




  /**
   * 表單 state
   *
   * 第一階段僅保留：
   * - charge_point_id
   * - name
   * - status
   */
  const [form, setForm] = useState({
    charge_point_id: "",
    name: "",
    status: "enabled",
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
    return "社區充電管理（功率分配模式）";
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

      // 表單用（第一階段僅保留社區層可編輯欄位）
      setCommunityCfg({
        enabled: d.enabled ?? true,
        contractKw: d.contract_kw ?? d.contractKw ?? "",
        voltageV: Number(d.voltage_v ?? d.voltageV ?? 220),
      });

      // 預覽用（功率分配模式）
      setCommunityPreview({
        totalCurrentA: Number(d.total_current_a ?? 0),
        allocatedPowerKw:
          Number.isFinite(Number(d.allocated_power_kw))
            ? Number(d.allocated_power_kw)
            : null,
        previewCurrentA:
          Number.isFinite(Number(d.preview_current_a))
            ? Number(d.preview_current_a)
            : null,
        activeChargingCount: Number(d.active_charging_count ?? 0),
        managedBy: d.managed_by ?? "power",
        singleCpMaxPowerKw: Number(d.single_cp_max_power_kw ?? 7),
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
        enabled: Boolean(communityCfg.enabled),
        contractKw: Number(communityCfg.contractKw || 0),
        voltageV: Number(communityCfg.voltageV || 220),
        phases: 1,
      });

      setCommunityMsg("✅ 設定已儲存，並已立即生效");
      await fetchCommunitySettings();
    } catch (err) {
      setCommunityMsg("❌ 儲存失敗：" + (err?.message || "unknown"));
    }
    setCommunitySaving(false);
  };



  /**
   * 表單欄位變動
   *
   * 第一階段：
   * - 只處理 charge_point_id / name / status
   * - 不再處理單樁 max_current
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * 重置表單（新增模式）
   */
  const resetFormToDefault = () => {
    setForm({
      charge_point_id: "",
      name: "",
      status: "enabled",
    });
    setEditingId(null);
  };

  /**
   * 新增 / 編輯送出
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cpId = String(form.charge_point_id || "").trim();
    const payload = {
      chargePointId: cpId,
      name: String(form.name || "").trim(),
      status: form.status,
    };

    try {
      if (editingId) {
        await axios.put(`/api/charge-points/${editingId}`, payload);
        alert("更新成功");
      } else {
        await axios.post("/api/charge-points", payload);
        alert("新增成功");
      }

      resetFormToDefault();
      await fetchList();
    } catch (err) {
      alert("儲存失敗：" + (err?.response?.data?.detail || err.message));
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
    const cpId = normalizeChargePointId(row);

    setForm({
      charge_point_id: cpId,
      name: row?.name ?? "",
      status: row?.status ?? "enabled",
    });
    setEditingId(cpId);
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

        {/* 🔧 讓紅框區域排列整齊：改用 Grid，label 置頂、input 滿版、按鈕獨立一列 */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* 契約容量 */}
          <div>
            <label className="text-sm block mb-1">契約容量（kW）</label>
            <input
              type="number"
              name="contractKw"
              className="h-10 w-full rounded text-black px-3"
              value={communityCfg.contractKw}
              onChange={handleCommunityChange}
              placeholder="例如 100"
              min={0}
            />
          </div>

          {/* 電壓 */}
          <div>
            <label className="text-sm block mb-1">電壓（V）</label>
            <input
              type="number"
              name="voltageV"
              className="h-10 w-full rounded text-black px-3"
              value={communityCfg.voltageV}
              onChange={handleCommunityChange}
              min={1}
            />
          </div>

          {/* 控制說明 */}
          <div>
            <label className="text-sm block mb-1">控制說明</label>
            <div className="h-10 w-full rounded bg-gray-800 border border-gray-700 px-3 flex items-center text-blue-300 font-semibold">
              依契約容量平均分配
            </div>
            <div className="text-xs text-gray-400 mt-1">
              不再因最低電流門檻而拒絕最後一台
            </div>
          </div>

          {/* 單樁固定上限（第一階段） */}
          <div>
            <label className="text-sm block mb-1">單樁固定上限</label>
            <div className="h-10 w-full rounded bg-gray-800 border border-gray-700 px-3 flex items-center text-green-300 font-semibold">
              {communityPreview.singleCpMaxPowerKw ?? 7} kW
            </div>
            <div className="text-xs text-gray-400 mt-1">
              第一階段固定值，由系統自動分配，不提供手動修改
            </div>
          </div>
        </div>

        {/* 按鈕獨立一列，避免把欄位擠歪 */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="h-10 px-4 rounded bg-green-700 text-white"
            onClick={saveCommunitySettings}
            disabled={communitySaving}
          >
            {communitySaving ? "儲存中…" : "儲存設定"}
          </button>

          <button
            type="button"
            className="h-10 px-4 rounded bg-gray-700 text-white"
            onClick={fetchCommunitySettings}
            disabled={communityLoading}
          >
            {communityLoading ? "更新中…" : "重新讀取"}
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-200" style={{ lineHeight: 1.7 }}>
          <div>🔎 預覽：</div>
          <div>• 管理模式：<b>{communityPreview.managedBy === "power" ? "功率分配" : communityPreview.managedBy || "-"}</b></div>
          <div>• 可用總電流（參考）：<b>{communityPreview.totalCurrentA}</b> A</div>
          <div>• 目前充電台數：<b>{communityPreview.activeChargingCount}</b> 台</div>
          <div>• 單樁理論上限：<b className="text-green-300">{communityPreview.singleCpMaxPowerKw ?? 7} kW</b></div>
          <div>
            • 後端目前平均分配（每台功率）：{" "}
            {communityPreview.allocatedPowerKw != null ? (
              <b className="text-green-300">{communityPreview.allocatedPowerKw} kW</b>
            ) : (
              <b className="text-red-300">-</b>
            )}
          </div>
          <div>
            • 預估下發電流：{" "}
            {communityPreview.previewCurrentA != null ? (
              <b className="text-blue-300">{communityPreview.previewCurrentA} A</b>
            ) : (
              <b className="text-red-300">-</b>
            )}
          </div>
          {communityMsg && <div className="mt-2">{communityMsg}</div>}
        </div>
      </div>

      {/* =========================
          🔌 充電樁管理（新增 / 編輯 / 刪除）
         ========================= */}
      <div className="mb-6 p-4 rounded border border-blue-700 bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold">
            🔌 充電樁清單管理（可作為模擬樁白名單）
          </div>
          <div className="text-sm text-gray-400">
            可新增 cp_id，供 OCPP 模擬器連線使用
          </div>
        </div>

        {/* 新增 / 編輯表單 */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            {/* 充電樁 ID */}
            <div className="xl:col-span-2">
              <label className="text-sm block mb-1">充電樁 ID</label>
              <input
                type="text"
                name="charge_point_id"
                className="h-12 w-full rounded text-black px-3"
                value={form.charge_point_id}
                onChange={handleChange}
                placeholder="例如：CP_001"
                disabled={!!editingId}
              />
              <div className="text-xs text-gray-400 mt-1 min-h-[20px]">
                {editingId ? "編輯模式不可修改 ID" : "新增後作為 OCPP cp_id 使用"}
              </div>
            </div>

            {/* 名稱 */}
            <div className="xl:col-span-2">
              <label className="text-sm block mb-1">名稱</label>
              <input
                type="text"
                name="name"
                className="h-12 w-full rounded text-black px-3"
                value={form.name}
                onChange={handleChange}
                placeholder="例如：模擬樁1"
              />
              {/* 保留 helper 高度，讓整體對齊 */}
              <div className="text-xs text-gray-400 mt-1 min-h-[20px]">&nbsp;</div>
            </div>

            {/* 狀態 */}
            <div className="xl:col-span-1">
              <label className="text-sm block mb-1">狀態</label>
              <select
                name="status"
                className="h-12 w-full rounded text-black px-3 min-w-[110px]"
                value={form.status}
                onChange={handleChange}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option value={opt.value} key={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* 保留 helper 高度，讓整體對齊 */}
              <div className="text-xs text-gray-400 mt-1 min-h-[20px]">&nbsp;</div>
            </div>

            {/* 單樁固定上限（第一階段） */}
            <div className="xl:col-span-2">
              <label className="text-sm block mb-1">單樁固定上限</label>
              <div className="h-12 w-full rounded bg-gray-800 border border-gray-700 px-3 flex items-center text-green-300 font-semibold">
                {communityPreview.singleCpMaxPowerKw ?? 7} kW
              </div>
              <div className="text-xs text-gray-400 mt-1 min-h-[20px]">
                由系統自動分配功率，實際下發時會換算為電流
              </div>
            </div>

            {/* 主按鈕 */}
            <div className="xl:col-span-1 flex items-end">
              <button
                type="submit"
                className="h-12 w-full px-4 rounded bg-blue-700 text-white whitespace-nowrap"
              >
                {editingId ? "儲存修改" : "＋ 新增充電樁"}
              </button>
            </div>

            {/* 編輯模式才顯示：取消按鈕（第二列） */}
            {editingId && (
              <div className="xl:col-span-7 flex justify-end">
                <button
                  type="button"
                  className="h-12 px-4 rounded bg-gray-700 text-white"
                  onClick={cancelEdit}
                >
                  取消編輯
                </button>
              </div>
            )}
          </div>
        </form>



        {/* 列表 */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-gray-300">載入中…</div>
          ) : list.length === 0 ? (
            <div className="text-gray-400">目前尚無充電樁資料</div>
          ) : (
            <table className="w-full text-sm border border-gray-700">
              <thead className="bg-gray-800 text-gray-200">
                <tr>
                  <th className="text-left p-2 border-b border-gray-700">充電樁 ID</th>
                  <th className="text-left p-2 border-b border-gray-700">名稱</th>
                  <th className="text-left p-2 border-b border-gray-700">狀態</th>
                  <th className="text-left p-2 border-b border-gray-700">管理模式</th>
                  <th className="text-left p-2 border-b border-gray-700">單樁固定上限</th>
                  <th className="text-left p-2 border-b border-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, idx) => {
                  const cpId = normalizeChargePointId(row);
                  const singleCpMaxPowerKw =
                    row?.singleCpMaxPowerKw ??
                    row?.single_cp_max_power_kw ??
                    communityPreview.singleCpMaxPowerKw ??
                    7;

                  return (
                    <tr
                      key={cpId || idx}
                      className="border-t border-gray-800 hover:bg-gray-800/60"
                    >
                      <td className="p-2">{cpId || "-"}</td>
                      <td className="p-2">{row?.name || "-"}</td>
                      <td className="p-2">
                        {row?.status === "enabled" ? (
                          <span className="text-green-300 font-semibold">啟用</span>
                        ) : (
                          <span className="text-red-300 font-semibold">停用</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="text-blue-300 font-semibold">功率分配</span>
                      </td>
                      <td className="p-2">
                        <span className="text-green-300 font-semibold">{singleCpMaxPowerKw} kW</span>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-yellow-600 text-white"
                            onClick={() => startEdit(row)}
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-red-700 text-white"
                            onClick={() => handleDelete(cpId)}
                            disabled={!cpId}
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>



    </div>
  );
};

export default ChargePoints;
