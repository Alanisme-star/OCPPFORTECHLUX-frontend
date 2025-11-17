import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function EditCardAccessModal({ idTag, onClose }) {
  const [cpList, setCpList] = useState([]);       // 可選的所有充電樁
  const [selected, setSelected] = useState([]);   // 目前該卡片已允許的充電樁 ID
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 初始化：載入充電樁清單 + 卡片現有白名單
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1️⃣ 取得所有充電樁
        const cps = await axios.get("/api/charge-points");
        setCpList(cps.data || []);

        // 2️⃣ 取得該卡片目前允許的樁（白名單）
        try {
          const res = await axios.get(`/api/whitelist`);
          const allowed = (res.data || [])
            .filter((w) => w.card_id === idTag)
            .map((w) => w.charge_point_id);

          setSelected(allowed);
        } catch {
          setSelected([]);
        }
      } catch (err) {
        alert("讀取資料失敗: " + err.message);
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

  // 儲存白名單設定
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/cards/${idTag}/whitelist`, selected);
      alert("白名單設定已更新！");
      onClose();  // 關閉 Modal 並由父層刷新資料
    } catch (err) {
      alert("更新失敗: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ===== UI 區 =====
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
        <h3 className="text-xl font-bold mb-4">允許充電樁設定（{idTag}）</h3>

        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {cpList.length === 0 ? (
            <p className="text-gray-400">目前沒有任何充電樁</p>
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
                {cp.name && <span className="text-gray-400">（{cp.name}）</span>}
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
