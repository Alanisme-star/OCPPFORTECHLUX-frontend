import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function EditCardAccessModal({ idTag, onClose }) {
  const [cpList, setCpList] = useState([]); // 所有充電樁
  const [selected, setSelected] = useState([]); // 該卡允許的充電樁
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCpId, setNewCpId] = useState("");
  const [newCpName, setNewCpName] = useState("");

  // === 載入資料 ===
  const loadData = async () => {
    try {
      // 撈全部充電樁
      const cps = await axios.get("/api/charge-points");
      setCpList(cps.data || []);

      // 撈該卡片的白名單
      const wl = await axios.get(`/api/cards/${idTag}/whitelist`);
      setSelected(wl.data.allowed || []);
    } catch (err) {
      alert("讀取資料失敗：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [idTag]);

  // === 勾選切換 ===
  const toggle = (cpId) =>
    setSelected((prev) =>
      prev.includes(cpId)
        ? prev.filter((id) => id !== cpId)
        : [...prev, cpId]
    );

  // === 儲存白名單 ===
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/cards/${idTag}/whitelist`, {
        allowed: selected
      });

      alert("白名單設定已更新！");
      onClose();
    } catch (err) {
      alert("更新失敗：" + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };


  // === 新增充電樁 ===
  const handleAddCP = async () => {
    if (!newCpId.trim()) return alert("充電樁 ID 不可空白");

    try {
      await axios.post("/api/charge-points", {
        charge_point_id: newCpId.trim(),
        name: newCpName.trim() || null,
      });

      alert("新增充電樁成功！");
      setNewCpId("");
      setNewCpName("");
      setShowAddForm(false);
      loadData(); // 重新載入列表與白名單
    } catch (err) {
      alert("新增失敗：" + (err.response?.data?.detail || err.message));
    }
  };

  // === 刪除充電樁 ===
  const handleDeleteCP = async (cpId) => {
    if (!window.confirm(`確定要刪除充電樁：${cpId}？`)) return;

    try {
      await axios.delete(`/api/charge-points/${cpId}`);
      alert("已刪除");
      loadData();
    } catch (err) {
      alert("刪除失敗：" + (err.response?.data?.detail || err.message));
    }
  };

  // === UI ===
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
      <div className="bg-gray-800 text-white p-6 rounded-lg w-[430px] shadow-xl">
        <h3 className="text-xl font-bold mb-4">
          允許充電樁設定（{idTag}）
        </h3>

        {/* ===== 新增充電樁區塊 ===== */}
        {showAddForm ? (
          <div className="mb-4 bg-gray-700 p-3 rounded">
            <h4 className="font-bold mb-2">新增充電樁</h4>
            <input
              className="w-full mb-2 p-2 rounded bg-gray-600 text-white"
              placeholder="充電樁 ID（必填）"
              value={newCpId}
              onChange={(e) => setNewCpId(e.target.value)}
            />
            <input
              className="w-full mb-3 p-2 rounded bg-gray-600 text-white"
              placeholder="名稱（選填）"
              value={newCpName}
              onChange={(e) => setNewCpName(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 rounded"
              >
                取消
              </button>
              <button
                onClick={handleAddCP}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
              >
                新增
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-4 px-3 py-1 bg-green-700 hover:bg-green-800 rounded text-white"
          >
            ＋ 新增充電樁
          </button>
        )}

        {/* ===== 充電樁選單 ===== */}
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {cpList.length === 0 ? (
            <p className="text-gray-400">目前沒有任何充電樁</p>
          ) : (
            cpList.map((cp) => (
              <div
                key={cp.charge_point_id}
                className="flex items-center justify-between"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(cp.charge_point_id)}
                    onChange={() => toggle(cp.charge_point_id)}
                  />
                  <span>{cp.charge_point_id}</span>
                  {cp.name && (
                    <span className="text-gray-400">（{cp.name}）</span>
                  )}
                </label>

                <button
                  className="text-red-400 hover:underline"
                  onClick={() => handleDeleteCP(cp.charge_point_id)}
                >
                  刪除
                </button>
              </div>
            ))
          )}
        </div>

        {/* ===== 操作按鈕 ===== */}
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
