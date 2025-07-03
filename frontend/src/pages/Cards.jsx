import { useEffect, useState } from "react";
import axios from "@/utils/axiosInstance";

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({
    idTag: "",
    status: "Accepted",
    validUntil: "2099-12-31T23:59:59"
  });
  const [editing, setEditing] = useState(null);

  const fetchCards = async () => {
    try {
      const res = await axios.get("/api/id_tags"); // ✅ 已修正路由
      setCards(res.data);
    } catch (err) {
      console.error("Failed to fetch cards:", err);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idTag.trim()) {
      alert("請輸入 ID Tag");
      return;
    }

    const fixedValidUntil =
      form.validUntil.length === 16 ? form.validUntil + ":00" : form.validUntil;
    const payload = { ...form, validUntil: fixedValidUntil };

    console.log("🚀 payload.idTag:", payload.idTag);
    console.log("🚀 payload.status:", payload.status);
    console.log("🚀 payload.validUntil:", payload.validUntil);

    try {
      if (editing) {
        await axios.put(`/api/id_tags/${editing}`, payload);
      } else {
        await axios.post("/api/id_tags", payload);
      }
      fetchCards();
      setForm({ idTag: "", status: "Accepted", validUntil: "2099-12-31T23:59:59" });
      setEditing(null);
    } catch (err) {
      alert("操作失敗: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (card) => {
    setForm({
      idTag: card.idTag,
      status: card.status,
      validUntil: card.validUntil.slice(0, 19)
    });
    setEditing(card.idTag);
  };

  const handleDelete = async (idTag) => {
    if (!window.confirm("確定要刪除嗎？")) return;
    try {
      await axios.delete(`/api/id_tags/${idTag}`);
      fetchCards();
    } catch (err) {
      alert("刪除失敗: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">卡片管理</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="ID Tag"
          value={form.idTag}
          onChange={(e) => setForm({ ...form, idTag: e.target.value })}
          className="px-2 py-1 rounded bg-gray-800 text-white"
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="px-2 py-1 rounded bg-gray-800 text-white"
        >
          <option value="Accepted">Accepted</option>
          <option value="Expired">Expired</option>
          <option value="Blocked">Blocked</option>
        </select>
        <input
          type="datetime-local"
          value={form.validUntil}
          onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
          className="px-2 py-1 rounded bg-gray-800 text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          {editing ? "更新" : "新增"}
        </button>
      </form>

      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-700">
            <th className="px-2 py-1">ID Tag</th>
            <th className="px-2 py-1">狀態</th>
            <th className="px-2 py-1">有效期限</th>
            <th className="px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.idTag} className="border-t border-gray-600">
              <td className="px-2 py-1">{card.idTag}</td>
              <td className="px-2 py-1">{card.status}</td>
              <td className="px-2 py-1">{card.validUntil}</td>
              <td className="px-2 py-1">
                <button
                  onClick={() => handleEdit(card)}
                  className="text-blue-400 hover:underline mr-2"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDelete(card.idTag)}
                  className="text-red-400 hover:underline"
                >
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
