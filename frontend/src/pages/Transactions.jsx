import React, { useEffect, useState } from "react";
import axios from "axios";
import TransactionDetailModal from "./TransactionDetailModal";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get("/api/transactions").then((res) => {
      setTransactions(Object.values(res.data));
    });
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">🔌 所有交易紀錄</h2>
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
              transactions.map((txn) => (
                <tr
                  key={txn.transactionId}
                  className="border-b hover:bg-gray-700 cursor-pointer"
                  onClick={() => setSelected(txn.transactionId)}
                >
                  <td className="p-2">{txn.transactionId}</td>
                  <td className="p-2">{txn.chargePointId}</td>
                  <td className="p-2">{txn.idTag}</td>
                  <td className="p-2">{txn.startTimestamp}</td>
                  <td className="p-2">{txn.stopTimestamp || "--"}</td>
                  <td className="p-2">
                    {txn.meterStop && txn.meterStart
                      ? ((txn.meterStop - txn.meterStart) / 1000).toFixed(2)
                      : "--"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-400">
                  ⚠️ 無交易資料
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
