import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function PaymentHistory() {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/payments").then((res) => {
      setRecords(res.data);
      setFiltered(res.data);
    });

    axios.get("/cards").then((res) => {
      setCards(res.data);
    });

    setLoading(false);
  }, []);

  const handleFilter = () => {
    if (selectedCard === "") {
      setFiltered(records);
    } else {
      setFiltered(records.filter((r) => r.idTag === selectedCard));
    }
  };

  return (
    <div className="p-6 bg-white text-black rounded-xl shadow-xl max-w-5xl mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">💳 卡片扣款紀錄</h2>

      <div className="mb-4 flex gap-4 items-center">
        <label className="font-semibold">選擇卡片：</label>
        <select
          className="border border-gray-300 px-3 py-2 rounded"
          value={selectedCard}
          onChange={(e) => setSelectedCard(e.target.value)}
        >
          <option value="">全部卡片</option>
          {cards.map((card) => (
            <option key={card.card_id} value={card.card_id}>
              {card.card_id}
            </option>
          ))}
        </select>
        <button
          onClick={handleFilter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          查詢
        </button>
      </div>

      {loading ? (
        <p>載入中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">目前無扣款紀錄</p>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="px-4 py-2">交易 ID</th>
              <th className="px-4 py-2">卡片 ID</th>
              <th className="px-4 py-2">扣款金額</th>
              <th className="px-4 py-2">時間</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{rec.transactionId}</td>
                <td className="px-4 py-2">{rec.idTag}</td>
                <td className="px-4 py-2 text-red-600 font-semibold">- ${rec.amount}</td>
                <td className="px-4 py-2">{new Date(rec.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PaymentHistory;
