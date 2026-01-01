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
    return "充電樁管理（含電流限制）";
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
          新增 / 編輯表單
         ========================= */}
      <form
        className="mb-6 flex flex-wrap gap-4 items-end"
        onSubmit={handleSubmit}
      >
        {/* 充電樁 ID */}
        <div>
          <label>
            充電樁 ID
            <input
              type="text"
              name="charge_point_id"
              className="input input-bordered ml-2 p-1 rounded text-black"
              value={form.charge_point_id}
              onChange={(e) => {
                // 使用者輸入時若貼到 URL encoded 的 *（%2A），轉回 *
                const raw = e.target.value.replace(/%2A/gi, "*");
                setForm((prev) => ({ ...prev, charge_point_id: raw }));
              }}
              required
              disabled={!!editingId}
            />
          </label>
          {editingId && (
            <div className="text-xs text-gray-400 mt-1">
              編輯模式下不可變更充電樁 ID
            </div>
          )}
        </div>

        {/* 名稱 */}
        <div>
          <label>
            名稱
            <input
              type="text"
              name="name"
              className="input input-bordered ml-2 p-1 rounded text-black"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        {/* 狀態 */}
        <div>
          <label>
            狀態
            <select
              name="status"
              className="ml-2 p-1 rounded text-black"
              value={form.status}
              onChange={handleChange}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 最大電流設定（Dropdown） */}
        <div>
          <label>
            最大電流
            <select
              name="max_current"
              className="ml-2 p-1 rounded text-black"
              value={form.max_current} // ✅ 一定是字串，例如 "16"
              onChange={handleChange}
            >
              {CURRENT_OPTIONS.map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* 這段說明與 LiveStatus 的提示一致（管理頁設定上限） */}
          <div className="text-xs text-gray-400 mt-1" style={{ lineHeight: 1.5 }}>
            設定為「充電上限」，實際電流仍由車輛決定。
            <br />
            ※ 若充電中且樁支援 SmartCharging，將立即生效；否則於下一次充電生效。
          </div>

          {/* 額外提示：常用檔位 */}
          <div className="text-xs text-gray-500 mt-1" style={{ lineHeight: 1.5 }}>
            建議常用檔位：6A / 10A / 16A / 32A（你也可以用即時狀態的 slider 微調）。
          </div>
        </div>

        {/* 送出按鈕 */}
        <button
          type="submit"
          className="ml-2 px-4 py-1 rounded bg-blue-600 text-white"
        >
          {editingId ? "更新" : "新增"}
        </button>

        {/* 取消編輯 */}
        {editingId && (
          <button
            type="button"
            className="ml-2 px-4 py-1 rounded bg-gray-500 text-white"
            onClick={cancelEdit}
          >
            取消編輯
          </button>
        )}
      </form>

      {/* =========================
          列表
         ========================= */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border rounded">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-2">充電樁ID</th>
              <th className="p-2">名稱</th>
              <th className="p-2">狀態</th>
              <th className="p-2">最大電流</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-2" colSpan={5}>
                  載入中...
                </td>
              </tr>
            ) : list.length > 0 ? (
              list.map((row) => {
                const id = normalizeChargePointId(row);

                // 顯示用：安全轉字串，並顯示更清楚的 label
                const maxCurrentStr = normalizeMaxCurrentToString(
                  row?.maxCurrent ?? row?.max_current
                );
                const maxCurrentLabel = getCurrentLabel(maxCurrentStr);

                return (
                  <tr key={id}>
                    <td className="p-2">{id}</td>

                    <td className="p-2">{row?.name}</td>

                    <td className="p-2">
                      <span
                        className={
                          row?.status === "enabled"
                            ? "text-green-400"
                            : "text-gray-400"
                        }
                      >
                        {row?.status === "enabled" ? "啟用" : "停用"}
                      </span>
                    </td>

                    {/* 最大電流：顯示 label，並保留 A */}
                    <td className="p-2">
                      {maxCurrentLabel}{" "}
                      <span className="text-gray-400">（上限）</span>
                    </td>

                    <td className="p-2 space-x-2">
                      <button
                        className="px-3 py-1 rounded border border-blue-500 text-blue-500 hover:bg-blue-100"
                        onClick={() => startEdit(row)}
                      >
                        編輯
                      </button>

                      <button
                        className="px-3 py-1 rounded border border-red-500 text-red-500 hover:bg-red-100"
                        onClick={() => handleDelete(id)}
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-2" colSpan={5}>
                  無資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================
          備註（保留擴充空間）
          - 後續若你要加入：
            1) 顯示該樁目前是否連線
            2) 顯示 live-status 摘要
            3) 一鍵跳轉到 LiveStatus
          也可以放在這邊
         ========================= */}
      <div className="mt-6 text-xs text-gray-500" style={{ lineHeight: 1.6 }}>
        <div>說明：</div>
        <div>
          1) 「充電樁管理」用於設定每一台樁的電流上限（上限值會寫入後端）。
        </div>
        <div>
          2) 「即時狀態」若充電中且樁支援 SmartCharging，可立即下發限流。
        </div>
        <div>
          3) 若樁不支援 SmartCharging，通常會於下一次充電流程套用設定。
        </div>
      </div>
    </div>
  );
};

export default ChargePoints;
