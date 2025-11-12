// frontend/src/pages/EditCardAccessModal.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function EditCardAccessModal({ idTag, onClose }) {
  const [cpList, setCpList] = useState([]);       // 所有可選充電樁
  const [selected, setSelected] = useState([]);   // 已允許的充電樁 ID
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 初始化：載入充電樁清單 + 已授權清單
  useEffect(() => {
    const loadData = async () => {
      try {
        const cps = await axios.get("/api/connections");  // ✅ 改為 /api/connections（回傳格式正確）
        setCpList(cps.data || []);

        // 若後端未提供 GET /api/cards/{id_tag}/allowed-cps，可暫時用空陣列
        try {
          const res = await axios.get(`/api/cards/${idTag}/allowed-cps`);
          setSelected(res.data || []);
        } catch {
          setSelected([]);
        }
      } catch (err) {
        alert("讀取資料失敗：" + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [idTag]);

  // 勾選切換
  const toggle = (cpId) => {
    setSelected((prev) =>
      prev.includes(cpId)
        ? prev.filter((id) => id !== cpId)
        : [...prev, cpId]
    );
  };

  // 儲存允許清單
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/cards/${idTag}/allowed-cps`, selected); // ✅ 改成 POST（符合後端設計）
      alert("允許充電樁設定已更新！");
      onClose();
    } catch (err) {
      alert("更新失敗：" + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ====== UI ======
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
        <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg w-96 shadow-xl">
        <h3 className="text-xl font-bold mb-4">
          編輯允許充電樁（{idTag}）
        </h3>

        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {cpList.length === 0 ? (
            <p className="text-gray-400">目前無可選充電樁</p>
          ) : (
            cpList.map((cp) => (
              <label
                key={cp.charge_point_id}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(cp.charge_point_id)}
                  onChange={() => toggle(cp.charge_point_id)}
                />
                <span>{cp.charge_point_id}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded text-white"
            disabled={saving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            disabled={saving}
          >
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
