import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import EditCardAccessModal from "../components/EditCardAccessModal";

const Cards = () => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({
    idTag: "",
    ownerName: "",
    status: "Accepted",
    validUntil: "2099-12-31T23:59:59",
  });

  const [editing, setEditing] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await axios.get("/api/cards");
      setCards(res.data);
    } catch (err) {
      console.error("讀取卡片失敗", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idTag.trim()) {
      alert("請輸入 ID Tag");
      return;
    }

    const fixedValidUntil =
      form.validUntil.length === 16 ? form.validUntil + ":00" : form.validUntil;

    try {
      if (editing) {
        // 編輯模式：只能更新餘額（依你的後端邏輯）
        await axios.put(`/api/cards/${editing}`, { balance: form.balance ?? 0 });

        // 同步更新住戶名稱
        if (form.ownerName.trim()) {
          await axios.post(`/api/card-owners/${editing}`, {
            name: form.ownerName.trim(),
          });
        }
      } else {
        // 新增卡片
        await axios.post("/api/id_tags", {
          idTag: form.idTag,
          status: form.status,
          validUntil: fixedValidUntil,
        });

        // ⭐ 同步建立卡片餘額資料（後端若存在 cards 表）
        await axios.post(`/api/cards/${form.idTag}`, {});

        // ⭐ 新增住戶名稱
        if (form.ownerName.trim()) {
          await axios.post(`/api/card-owners/${form.idTag}`, {
            name: form.ownerName.trim(),
          });
        }
      }

      fetchCards();

      setForm({
        idTag: "",
        ownerName: "",
        status: "Accepted",
        validUntil: "2099-12-31T23:59:59",
      });
      setEditing(null);
    } catch (err) {
      alert("操作失敗: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (card) => {
    setForm({
      idTag: card.card_id,
      ownerName: card.name || "",
      status: card.status ?? "Accepted",
      validUntil: card.validUntil ?? "2099-12-31T23:59:59",
      balance: card.balance ?? 0,
    });
    setEditing(card.card_id);
  };

  const handleDelete = async (idTag) => {
    if (window.confirm("確定要刪除這張卡片嗎?")) {
      try {
        await axios.delete(`/api/cards/${idTag}`);
        fetchCards();
      } catch (err) {
        alert("刪除失敗: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const openEditAccessModal = (card) => {
    setSelectedCardId(card.card_id);
    setShowAccessModal(true);
  };

  const handleCloseModal = () => {
    setShowAccessModal(false);
    setSelectedCardId(null);
    fetchCards();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">卡片管理（含白名單設定）</h2>

      {/* === 新增卡片表單 === */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-800 p-4 rounded-md mb-6"
      >
        <div className="flex gap-4">

          {/* 住戶名稱 */}
          <input
            className="p-2 rounded bg-gray-700 text-white w-40"
            placeholder="住戶名稱"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />

          {/* ID Tag */}
          <input
            className="p-2 rounded bg-gray-700 text-white w-full"
            placeholder="ID Tag"
            value={form.idTag}
            onChange={(e) => setForm({ ...form, idTag: e.target.value })}
            disabled={!!editing}
          />

          {/* 狀態 */}
          <select
            className="p-2 rounded bg-gray-700 text-white"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            disabled={!!editing}
          >
            <option value="Accepted">Accepted</option>
            <option value="Expired">Expired</option>
            <option value="Blocked">Blocked</option>
          </select>

          {/* 有效期限 */}
          <input
            type="datetime-local"
            className="p-2 rounded bg-gray-700 text-white"
            value={form.validUntil}
            onChange={(e) =>
              setForm({ ...form, validUntil: e.target.value })
            }
            disabled={!!editing}
          />

          {/* 餘額：只能編輯時填寫 */}
          <input
            type="number"
            placeholder="餘額"
            className="p-2 rounded bg-gray-700 text-white w-28"
            value={form.balance ?? ""}
            onChange={(e) =>
              setForm({ ...form, balance: parseFloat(e.target.value) || 0 })
            }
            disabled={!editing}
          />

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            {editing ? "更新資訊" : "新增授權"}
          </button>
        </div>
      </form>

      {/* === 卡片列表 === */}
      <table className="table-auto w-full text-sm">
        <thead>
          <tr className="bg-gray-700 text-left">
            <th className="p-2">住戶名稱</th>
            <th className="p-2">ID Tag</th>
            <th className="p-2">狀態</th>
            <th className="p-2">有效期限</th>
            <th className="p-2">餘額</th>
            <th className="p-2">允許充電樁（白名單）</th>
            <th className="p-2">操作</th>
          </tr>
        </thead>

        <tbody>
          {cards.map((card) => (
            <tr key={card.card_id} className="border-b hover:bg-gray-700">
              <td className="p-2">{card.name || "-"}</td>
              <td className="p-2">{card.card_id}</td>
              <td className="p-2">{card.status || "-"}</td>
              <td className="p-2">{card.validUntil || "-"}</td>
              <td className="p-2">
                {card.balance != null ? `${card.balance} 元` : "-"}
              </td>
              <td className="p-2">
                <button
                  onClick={() => openEditAccessModal(card)}
                  className="text-yellow-400 hover:underline"
                >
                  設定白名單
                </button>
              </td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => handleEdit(card)}
                  className="text-blue-400 hover:underline"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDelete(card.card_id)}
                  className="text-red-400 hover:underline"
                >
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 白名單設定 Modal */}
      {showAccessModal && (
        <EditCardAccessModal
          idTag={selectedCardId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Cards;
