import React, { useEffect, useState } from "react";
import axios from "axios";
import TransactionDetailModal from "@/components/TransactionDetailModal";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    console.log("VITE_API_BASE_URL =", API_BASE);

    axios
      .get(`${API_BASE}/api/transactions`)
      .then((res) => {
        console.log("transactions api response =", res.data);
        const data = res.data;
        if (Array.isArray(data)) {
          setTransactions(data);
        } else if (typeof data === "object" && data !== null) {
          setTransactions(Object.values(data));
        } else {
          console.warn("⚠️ API 回傳格式非預期:", data);
          setTransactions([]);
        }
      })
      .catch((err) => {
        console.error("❌ 取得交易資料失敗:", err);
        setTransactions([]);
      });
  }, []);

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

  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">所有交易紀錄</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800 text-left">
              <th className="p-2">充電樁ID</th>
              <th className="p-2">住戶名稱</th>
              <th className="p-2">卡片ID</th>
              <th className="p-2">起始充電時間</th>
              <th className="p-2">結束充電時間</th>
              <th className="p-2">總充電時間</th>
              <th className="p-2">本次充電度數 (kWh)</th>
              <th className="p-2">本次充電前餘額</th>
              <th className="p-2">本次充電費用</th>
              <th className="p-2">本次充電後餘額</th>
            </tr>
          </thead>

          <tbody>
            {Array.isArray(transactions) && transactions.length > 0 ? (
              transactions.map((txn, index) => {
                if (!txn || typeof txn !== "object") return null;

                const {
                  transactionId,
                  chargePointId,
                  residentName,
                  cardId,
                  startTimestamp,
                  stopTimestamp,
                  durationText,
                  energyKwh,
                  balanceBefore,
                  cost,
                  balanceAfter,
                } = txn;

                return (
                  <tr
                    key={transactionId ?? `txn-${index}`}
                    className="border-b hover:bg-gray-700 cursor-pointer"
                    onClick={() =>
                      transactionId ? setSelected(transactionId) : null
                    }
                  >
                    <td className="p-2">{chargePointId ?? "--"}</td>
                    <td className="p-2">{residentName ?? "--"}</td>
                    <td className="p-2">{cardId ?? "--"}</td>
                    <td className="p-2">{formatDateTime(startTimestamp)}</td>
                    <td className="p-2">{formatDateTime(stopTimestamp)}</td>
                    <td className="p-2">{durationText ?? "--"}</td>
                    <td className="p-2">
                      {energyKwh != null && !isNaN(Number(energyKwh))
                        ? Number(energyKwh).toFixed(2)
                        : "--"}
                    </td>
                    <td className="p-2">
                      {balanceBefore != null && !isNaN(Number(balanceBefore))
                        ? Number(balanceBefore).toFixed(2)
                        : "--"}
                    </td>
                    <td className="p-2">
                      {cost != null && !isNaN(Number(cost))
                        ? Number(cost).toFixed(2)
                        : "--"}
                    </td>
                    <td className="p-2">
                      {balanceAfter != null && !isNaN(Number(balanceAfter))
                        ? Number(balanceAfter).toFixed(2)
                        : "--"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-4 text-gray-400">
                  無交易資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <TransactionDetailModal
          transactionId={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default Transactions;