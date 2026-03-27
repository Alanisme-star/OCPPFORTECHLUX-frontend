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

      const str = String(value).trim();
      if (!str) return "--";

      const normalized = str.replace("T", " ").replace("Z", "");
      const parts = normalized.split(/\s+/);

      if (parts.length < 2) return normalized.slice(0, 16);

      const datePart = parts[0];
      const timePart = parts[1].slice(0, 5);

      if (!datePart || !timePart) return "--";

      return `${datePart} ${timePart}`;
    };


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
                  cardNumber,
                  startTimestamp,
                  stopTimestamp,
                  meterStart,
                  meterStop,
                  energyKwh,
                } = txn;

                const energyUsed =
                  energyKwh != null && !isNaN(Number(energyKwh))
                    ? Number(energyKwh).toFixed(2)
                    : meterStart != null &&
                      meterStop != null &&
                      !isNaN(Number(meterStop) - Number(meterStart))
                    ? ((Number(meterStop) - Number(meterStart)) / 1000).toFixed(2)
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
                    <td className="p-2">{cardNumber ?? idTag ?? "--"}</td>
                    <td className="p-2">{formatDateTime(startTimestamp)}</td>
                    <td className="p-2">{formatDateTime(stopTimestamp)}</td>
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
