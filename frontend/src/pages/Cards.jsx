import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import EditCardAccessModal from "../components/EditCardAccessModal";

const Cards = () => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({
    ownerName: "",
    idTag: "",
    status: "Accepted",
    validUntil: "2099-12-31T23:59:59",
    balance: "",
  });

  const [editing, setEditing] = useState(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // === 儲值彈窗 ===
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCard, setDepositCard] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");

  // === 歷史紀錄查詢彈窗 ===
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCard, setHistoryCard] = useState(null);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historySummary, setHistorySummary] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      alert("請輸入住戶名稱(含號/樓)");
      return;
    }

    if (!form.idTag.trim()) {
      alert("請輸入 ID Tag");
      return;
    }

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

        // 更新狀態
        await axios.put(`/api/id_tags/${editing}`, {
          status: form.status,
        });

        // 更新住戶名稱
        await axios.post(`/api/card-owners/${editing}`, {
          name: form.ownerName.trim(),
        });

      } else {
        // 新增 id tag
        await axios.post("/api/id_tags", {
          idTag: form.idTag.trim(),
          status: form.status,
        });

        // 寫入住戶名稱
        await axios.post(`/api/card-owners/${form.idTag.trim()}`, {
          name: form.ownerName.trim(),
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

  // === 儲值模組 ===
  const openDepositModal = (card) => {
    setDepositCard(card);
    setDepositAmount("");
    setShowDepositModal(true);
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setDepositCard(null);
    setDepositAmount("");
  };

  const handleDeposit = async () => {
    if (!depositAmount.trim()) {
      alert("請輸入儲值金額");
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("儲值金額必須大於 0");
      return;
    }

    try {
      const newBalance = Number(depositCard.balance || 0) + amount;

      await axios.put(`/api/cards/${depositCard.card_id}`, {
        balance: newBalance,
      });

      alert("儲值成功！");
      closeDepositModal();
      fetchCards();

    } catch (err) {
      alert("儲值失敗：" + (err.response?.data?.detail || err.message));
    }
  };

  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    };
  };

  const openHistoryModal = (card) => {
    if (!card.card_id) {
      alert("無法查詢歷史紀錄，卡片 ID 無效");
      return;
    }

    const range = getCurrentMonthRange();

    setHistoryCard(card);
    setHistoryStartDate(range.startDate);
    setHistoryEndDate(range.endDate);
    setHistorySummary(null);
    setHistoryItems([]);
    setShowHistoryModal(true);

    fetchCardHistory(card.card_id, range.startDate, range.endDate);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryCard(null);
    setHistoryStartDate("");
    setHistoryEndDate("");
    setHistorySummary(null);
    setHistoryItems([]);
    setHistoryLoading(false);
  };

  const fetchCardHistory = async (
    cardId = historyCard?.card_id,
    startDate = historyStartDate,
    endDate = historyEndDate
  ) => {
    if (!cardId) {
      alert("無法查詢歷史紀錄，卡片 ID 無效");
      return;
    }

    if (!startDate || !endDate) {
      alert("請選擇開始日期與結束日期");
      return;
    }

    setHistoryLoading(true);

    try {
      const res = await axios.get("/api/transactions", {
        params: {
          idTag: cardId,
          startDate,
          endDate,
          includeSummary: true,
        },
      });

      const data = res.data;

      if (data && typeof data === "object" && Array.isArray(data.items)) {
        setHistorySummary(data.summary || null);
        setHistoryItems(data.items || []);
      } else if (Array.isArray(data)) {
        setHistorySummary(null);
        setHistoryItems(data);
      } else {
        console.warn("歷史紀錄 API 回傳格式非預期:", data);
        setHistorySummary(null);
        setHistoryItems([]);
      }
    } catch (err) {
      console.error("查詢歷史紀錄失敗", err);
      alert("查詢歷史紀錄失敗：" + (err.response?.data?.detail || err.message));
      setHistorySummary(null);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "--";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "--";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const formatNumber = (value, digits = 2) => {
    if (value == null || isNaN(Number(value))) return "--";
    return Number(value).toFixed(digits);
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
            placeholder="住戶名稱(含號/樓)"
            value={form.ownerName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, ownerName: e.target.value }))
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
            <option value="Blocked">Blocked</option>
          </select>

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
            <th className="p-2">住戶名稱(含號/樓)</th>
            <th className="p-2">ID Tag</th>
            <th className="p-2">狀態</th>
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

              {/* 餘額 + 儲值按鈕 */}
              <td className="p-2 flex items-center gap-2">
                {card.balance != null ? `${card.balance} 元` : "-"}
                <button
                  onClick={() => openDepositModal(card)}
                  className="text-green-400 hover:underline"
                >
                  儲值
                </button>
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
                  onClick={() => openHistoryModal(card)}
                  className="text-purple-400 hover:underline"
                >
                  歷史紀錄
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

      {/* === 儲值 Modal === */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded shadow-xl w-80">
            <h3 className="text-xl text-white mb-4">
              卡片儲值：{depositCard.card_id}
            </h3>

            <input
              type="text"
              className="p-2 w-full bg-gray-700 text-white rounded mb-4"
              placeholder="儲值金額"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-600 rounded text-white"
                onClick={closeDepositModal}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-green-600 rounded text-white"
                onClick={handleDeposit}
              >
                儲值
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === 歷史紀錄 Modal === */}
      {showHistoryModal && historyCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-xl w-[900px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl text-white mb-4">住戶用電歷史紀錄</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white mb-4">
              <div>
                <span className="text-gray-400">住戶名稱：</span>
                <span>{historyCard.name || "-"}</span>
              </div>

              <div>
                <span className="text-gray-400">卡號：</span>
                <span>{historyCard.card_id || "-"}</span>
              </div>

              <div>
                <span className="text-gray-400">目前餘額：</span>
                <span>
                  {historyCard.balance != null ? `${historyCard.balance} 元` : "-"}
                </span>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded mb-4">
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    開始日期
                  </label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="border rounded px-3 py-2 text-sm bg-white text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    結束日期
                  </label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="border rounded px-3 py-2 text-sm bg-white text-black"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fetchCardHistory()}
                  disabled={historyLoading}
                  className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-500"
                >
                  {historyLoading ? "查詢中..." : "查詢"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded bg-gray-700 text-white">
                <div className="text-xs text-gray-400">查詢期間</div>
                <div className="font-semibold">
                  {historySummary?.startDate || historyStartDate || "--"} ~{" "}
                  {historySummary?.endDate || historyEndDate || "--"}
                </div>
              </div>

              <div className="p-3 rounded bg-gray-700 text-white">
                <div className="text-xs text-gray-400">總交易筆數</div>
                <div className="font-semibold">
                  {historySummary?.totalTransactions ?? historyItems.length} 筆
                </div>
              </div>

              <div className="p-3 rounded bg-gray-700 text-white">
                <div className="text-xs text-gray-400">總充電度數</div>
                <div className="font-semibold">
                  {formatNumber(historySummary?.totalEnergyKwh)} kWh
                </div>
              </div>

              <div className="p-3 rounded bg-gray-700 text-white">
                <div className="text-xs text-gray-400">總金額</div>
                <div className="font-semibold">
                  {formatNumber(historySummary?.totalCost)} 元
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table-auto w-full text-sm text-white">
                <thead>
                  <tr className="bg-gray-700 text-left">
                    <th className="p-2">交易編號</th>
                    <th className="p-2">充電樁ID</th>
                    <th className="p-2">開始時間</th>
                    <th className="p-2">結束時間</th>
                    <th className="p-2">充電時間</th>
                    <th className="p-2">度數(kWh)</th>
                    <th className="p-2">費用</th>
                    <th className="p-2">充電後餘額</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.isArray(historyItems) && historyItems.length > 0 ? (
                    historyItems.map((txn, index) => (
                      <tr
                        key={txn.transactionId ?? `history-${index}`}
                        className="border-b border-gray-600"
                      >
                        <td className="p-2">{txn.transactionId ?? "--"}</td>
                        <td className="p-2">{txn.chargePointId ?? "--"}</td>
                        <td className="p-2">
                          {formatDateTime(txn.startTimestamp)}
                        </td>
                        <td className="p-2">
                          {formatDateTime(txn.stopTimestamp)}
                        </td>
                        <td className="p-2">{txn.durationText ?? "--"}</td>
                        <td className="p-2">
                          {txn.energyKwh != null
                            ? formatNumber(txn.energyKwh)
                            : "--"}
                        </td>
                        <td className="p-2">
                          {txn.cost != null ? `${formatNumber(txn.cost)} 元` : "--"}
                        </td>
                        <td className="p-2">
                          {txn.balanceAfter != null
                            ? `${formatNumber(txn.balanceAfter)} 元`
                            : "--"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-gray-400">
                        {historyLoading ? "資料查詢中..." : "無歷史交易資料"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-gray-600 rounded text-white"
                onClick={closeHistoryModal}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Cards;