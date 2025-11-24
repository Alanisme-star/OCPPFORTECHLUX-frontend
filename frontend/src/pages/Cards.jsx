import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import EditCardAccessModal from "../components/EditCardAccessModal";

const Cards = () => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({
    ownerName: "",
    floor: "",                 // ⭐ 新增：樓號
    idTag: "",
    status: "Accepted",
    validUntil: "2099-12-31T23:59:59",
    balance: "",
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

  const resetForm = () => {
    setForm({
      ownerName: "",
      floor: "",               // ⭐ 清空樓號
      idTag: "",
      status: "Accepted",
      validUntil: "2099-12-31T23:59:59",
      balance: "",
    });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.ownerName.trim()) {
      alert("請輸入住戶名稱");
      return;
    }

    if (!form.idTag.trim()) {
      alert("請輸入 ID Tag");
      return;
    }

    const fixedValidUntil =
      form.validUntil.length === 16
        ? form.validUntil + ":00"
        : form.validUntil;

    const balanceNumber =
      form.balance === "" || form.balance == null
        ? 0
        : parseFloat(form.balance) || 0;

    try {
      if (editing) {
        // 更新餘額
        await axios.put(`/api/cards/${editing}`, {
          balance: balanceNumber,
        });

        // 更新卡片基本資訊
        await axios.put(`/api/id_tags/${editing}`, {
          status: form.status,
          validUntil: fixedValidUntil,
        });

        // 更新住戶名稱 + 樓號
        await axios.post(`/api/card-owners/${editing}`, {
          name: form.ownerName.trim(),
          floor: form.floor.trim(),                // ⭐ 新增
        });

      } else {
        // 新增 id tag
        await axios.post("/api/id_tags", {
          idTag: form.idTag.trim(),
          status: form.status,
          validUntil: fixedValidUntil,
        });

        // 寫入住戶名稱 + 樓號
        await axios.post(`/api/card-owners/${form.idTag.trim()}`, {
          name: form.ownerName.trim(),
          floor: form.floor.trim(),                // ⭐ 新增
        });
      }

      await fetchCards();
      resetForm();
    } catch (err) {
      alert("操作失敗: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (card) => {
    setForm({
      ownerName: card.name || "",
      floor: card.floor || "",                  // ⭐ 新增：編輯時帶入樓號
      idTag: card.card_id,
      status: card.status ?? "Accepted",
      validUntil: card.validUntil ?? "2099-12-31T23:59:59",
      balance:
        card.balance === null || card.balance === undefined
          ? ""
          : String(card.balance),
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
    if (!card.card_id) {
      alert("無法開啟白名單設定，卡片 ID 無效");
      return;
    }
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

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-800 p-4 rounded-md mb-6"
      >
        <div className="flex gap-4">

          {/* 住戶名稱 */}
          <input
            className="p-2 rounded bg-gray-700 text-white w-full"
            placeholder="住戶名稱"
            value={form.ownerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, ownerName: e.target.value }))
            }
          />

          {/* ⭐ 樓號 */}
          <input
            className="p-2 rounded bg-gray-700 text-white w-full"
            placeholder="樓號"
            value={form.floor}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, floor: e.target.value }))
            }
          />

          {/* ID Tag */}
          <input
            className="p-2 rounded bg-gray-700 text-white w-full"
            placeholder="ID Tag"
            value={form.idTag}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, idTag: e.target.value }))
            }
            disabled={!!editing}
          />

          {/* 狀態 */}
          <select
            className="p-2 rounded bg-gray-700 text-white"
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value }))
            }
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
              setForm((prev) => ({ ...prev, validUntil: e.target.value }))
            }
          />

          {/* 餘額 */}
          <input
            type="text"
            inputMode="decimal"
            placeholder="餘額(僅編輯模式可填)"
            className="p-2 rounded bg-gray-700 text-white w-32"
            value={form.balance}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^[0-9]+(\.[0-9]*)?$/.test(value)) {
                setForm((prev) => ({ ...prev, balance: value }));
              }
            }}
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

      <table className="table-auto w-full text-sm">
        <thead>
          <tr className="bg-gray-700 text-left">
            <th className="p-2">住戶名稱（含樓號）</th>  {/* ⭐ 標題更新 */}
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
              <td className="p-2">
                {card.name || "-"}{" "}
                {card.floor ? `（${card.floor}）` : ""}   {/* ⭐ 顯示樓號 */}
              </td>
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

      {showAccessModal && (
        <EditCardAccessModal idTag={selectedCardId} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default Cards;
