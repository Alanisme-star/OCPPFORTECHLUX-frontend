// src/pages/ChargePoints.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
// 已移除：import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "enabled", label: "啟用" },
  { value: "disabled", label: "停用" },
];

const ChargePoints = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ charge_point_id: "", name: "", status: "enabled" });
  const [editingId, setEditingId] = useState(null);

  // 取得列表
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

  useEffect(() => { fetchList(); }, []);

  // 表單欄位異動
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 新增 or 編輯
  const handleSubmit = async (e) => {
    e.preventDefault();
    // 將 payload 欄位名轉為駝峰命名
    const payload = {
      chargePointId: form.charge_point_id,
      name: form.name,
      status: form.status,
    };
    try {
      if (editingId) {
        // 編輯
        await axios.put(`/api/charge-points/${editingId}`, payload);
        setEditingId(null);
      } else {
        // 新增
        await axios.post("/api/charge-points", payload);
      }
      setForm({ charge_point_id: "", name: "", status: "enabled" });
      fetchList();
    } catch (err) {
      alert("儲存失敗：" + err.message);
    }
  };

  // 編輯填表
  const startEdit = (row) => {
    // row 取回的是後端資料（駝峰），轉回表單格式
    setForm({
      charge_point_id: row.chargePointId || row.charge_point_id || "",
      name: row.name || "",
      status: row.status || "enabled",
    });
    setEditingId(row.chargePointId || row.charge_point_id);
  };

  // 刪除
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
      <h2 className="text-2xl font-bold mb-4">充電樁白名單管理</h2>
      <form className="mb-6 flex flex-wrap gap-4 items-end" onSubmit={handleSubmit}>
        <div>
          <label>充電樁ID           
            <input
              type="text"
              name="charge_point_id"
              className="input input-bordered ml-2 p-1 rounded text-black"
              value={form.charge_point_id}
              onChange={(e) => {
              // 防呆：不允許輸入 URL encoded (%2A) 字元
              const raw = e.target.value.replace(/%2A/gi, "*");
              setForm({ ...form, charge_point_id: raw });
              }}
              required
              disabled={!!editingId}
            />
            <div className="text-sm text-gray-400 mt-1 ml-1">
              ※請直接輸入「*」，不可輸入「%2A」
            </div>
          </label>
        </div>
        <div>
          <label>名稱
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
          <label>狀態
            <select
              name="status"
              className="ml-2 p-1 rounded text-black"
              value={form.status}
              onChange={handleChange}
              required
            >
              {STATUS_OPTIONS.map(opt => (
                <option value={opt.value} key={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="ml-2 px-4 py-1 rounded bg-blue-600 text-white">{editingId ? "更新" : "新增"}</button>
        {editingId && (
          <button type="button" className="ml-2 px-4 py-1 rounded bg-gray-500 text-white" onClick={() => {
            setEditingId(null);
            setForm({ charge_point_id: "", name: "", status: "enabled" });
          }}>
            取消編輯
          </button>
        )}
      </form>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border rounded">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-2">充電樁ID</th>
              <th className="p-2">名稱</th>
              <th className="p-2">狀態</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>載入中...</td></tr>
            ) : (
              list.length > 0 ? list.map(row => (
                <tr key={row.chargePointId || row.charge_point_id}>
                  <td className="p-2">{row.chargePointId || row.charge_point_id}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">
                    <span className={row.status === "enabled" ? "text-green-400" : "text-gray-400"}>
                      {row.status === "enabled" ? "啟用" : "停用"}
                    </span>
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
                      onClick={() => handleDelete(row.chargePointId || row.charge_point_id)}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan={4}>無資料</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChargePoints;
