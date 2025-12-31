import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

/**
 * 充電樁狀態選項
 */
const STATUS_OPTIONS = [
  { value: "enabled", label: "啟用" },
  { value: "disabled", label: "停用" },
];

/**
 * 常用電流選項（業界實務）
 */
const CURRENT_OPTIONS = [
  { value: 6, label: "6A（低負載 / 夜間）" },
  { value: 10, label: "10A（家用安全）" },
  { value: 16, label: "16A（標準）" },
  { value: 32, label: "32A（最大）" },
];

const ChargePoints = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    charge_point_id: "",
    name: "",
    status: "enabled",
    max_current: 16, // ⭐ 新增：最大電流（預設 16A）
  });

  const [editingId, setEditingId] = useState(null);

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
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  /**
   * 新增 / 編輯送出
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      chargePointId: form.charge_point_id,
      name: form.name,
      status: form.status,
      maxCurrent: Number(form.max_current), // ⭐ 預留給後端
    };

    try {
      if (editingId) {
        await axios.put(`/api/charge-points/${editingId}`, payload);
        setEditingId(null);
      } else {
        await axios.post("/api/charge-points", payload);
      }

      setForm({
        charge_point_id: "",
        name: "",
        status: "enabled",
        max_current: 16,
      });

      fetchList();
    } catch (err) {
      alert("儲存失敗：" + err.message);
    }
  };

  /**
   * 開始編輯
   */
  const startEdit = (row) => {
    setForm({
      charge_point_id: row.chargePointId || row.charge_point_id || "",
      name: row.name || "",
      status: row.status || "enabled",
      max_current: row.maxCurrent || row.max_current || 16,
    });
    setEditingId(row.chargePointId || row.charge_point_id);
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
      <h2 className="text-2xl font-bold mb-4">充電樁管理（含電流限制）</h2>

      {/* 新增 / 編輯表單 */}
      <form
        className="mb-6 flex flex-wrap gap-4 items-end"
        onSubmit={handleSubmit}
      >
        <div>
          <label>
            充電樁 ID
            <input
              type="text"
              name="charge_point_id"
              className="input input-bordered ml-2 p-1 rounded text-black"
              value={form.charge_point_id}
              onChange={(e) => {
                const raw = e.target.value.replace(/%2A/gi, "*");
                setForm({ ...form, charge_point_id: raw });
              }}
              required
              disabled={!!editingId}
            />
          </label>
        </div>

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

        {/* ⭐ 最大電流設定（Dropdown） */}
        <div>
          <label>
            最大電流
            <select
              name="max_current"
              className="ml-2 p-1 rounded text-black"
              value={form.max_current}
              onChange={handleChange}
            >
              {CURRENT_OPTIONS.map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-gray-400 mt-1">
            設定為「充電上限」，實際電流仍由車輛決定
          </div>
        </div>

        <button
          type="submit"
          className="ml-2 px-4 py-1 rounded bg-blue-600 text-white"
        >
          {editingId ? "更新" : "新增"}
        </button>

        {editingId && (
          <button
            type="button"
            className="ml-2 px-4 py-1 rounded bg-gray-500 text-white"
            onClick={() => {
              setEditingId(null);
              setForm({
                charge_point_id: "",
                name: "",
                status: "enabled",
                max_current: 16,
              });
            }}
          >
            取消編輯
          </button>
        )}
      </form>

      {/* 列表 */}
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
                <td colSpan={5}>載入中...</td>
              </tr>
            ) : list.length > 0 ? (
              list.map((row) => (
                <tr key={row.chargePointId || row.charge_point_id}>
                  <td className="p-2">
                    {row.chargePointId || row.charge_point_id}
                  </td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">
                    <span
                      className={
                        row.status === "enabled"
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      {row.status === "enabled" ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td className="p-2">
                    {(row.maxCurrent || row.max_current || 16) + " A"}
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
                      onClick={() =>
                        handleDelete(
                          row.chargePointId || row.charge_point_id
                        )
                      }
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChargePoints;
