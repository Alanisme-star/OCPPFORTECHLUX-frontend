import React, { useEffect, useState } from "react";
import axios from "axios";
import TransactionDetailModal from "./TransactionDetailModal";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios
      .get("/api/transactions")
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setTransactions(data);
        } else if (typeof data === "object" && data !== null) {
          // 若是物件就轉為陣列
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

  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">所有交易紀錄</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800 text-left">
              <th className="p-2">交易編號</th>
              <th className="p-2">充電樁</th>
              <th className="p-2">卡號</th>
              <th className="p-2">開始時間</th>
              <th className="p-2">結束時間</th>
              <th className="p-2">用電量 (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(transactions) && transactions.length > 0 ? (
              transactions.map((txn, index) => {
                if (!txn || typeof txn !== "object") return null;

                const {
                  transactionId,
                  chargePointId,
                  idTag,
                  startTimestamp,
                  stopTimestamp,
                  meterStart,
                  meterStop,
                } = txn;

                const energyUsed =
                  meterStart != null &&
                  meterStop != null &&
                  !isNaN(meterStop - meterStart)
                    ? ((meterStop - meterStart) / 1000).toFixed(2)
                    : "--";

                return (
                  <tr
                    key={transactionId ?? `txn-${index}`}
                    className="border-b hover:bg-gray-700 cursor-pointer"
                    onClick={() =>
                      transactionId ? setSelected(transactionId) : null
                    }
                  >
                    <td className="p-2">{transactionId ?? "--"}</td>
                    <td className="p-2">{chargePointId ?? "--"}</td>
                    <td className="p-2">{idTag ?? "--"}</td>
                    <td className="p-2">{startTimestamp ?? "--"}</td>
                    <td className="p-2">{stopTimestamp ?? "--"}</td>
                    <td className="p-2">{energyUsed}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-400">
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
