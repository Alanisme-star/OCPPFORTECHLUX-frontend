import React, { useEffect, useState } from "react";
import axios from "axios";
import TransactionDetailModal from "@/components/TransactionDetailModal";

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const defaultRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const fetchTransactions = async () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL;
    console.log("VITE_API_BASE_URL =", API_BASE);

    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      params.append("includeSummary", "true");

      const url = `${API_BASE}/api/transactions?${params.toString()}`;
      console.log("transactions api url =", url);

      const res = await axios.get(url);
      console.log("transactions api response =", res.data);

      const data = res.data;

      if (data && typeof data === "object" && Array.isArray(data.items)) {
        setTransactions(data.items);
        setSummary(data.summary || null);
      } else if (Array.isArray(data)) {
        setTransactions(data);
        setSummary(null);
      } else {
        console.warn("⚠️ API 回傳格式非預期:", data);
        setTransactions([]);
        setSummary(null);
      }
    } catch (err) {
      console.error("❌ 取得交易資料失敗:", err);
      setTransactions([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const formatNumber = (value, digits = 2) => {
    if (value == null || isNaN(Number(value))) return "--";
    return Number(value).toFixed(digits);
  };



  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">所有交易紀錄</h2>

      <div className="mb-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white text-black dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">結束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white text-black dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <button
            type="button"
            onClick={fetchTransactions}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "查詢中..." : "查詢"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">查詢期間</div>
          <div className="font-semibold">
            {summary?.startDate || startDate || "--"} ~ {summary?.endDate || endDate || "--"}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">期間內充電樁數</div>
          <div className="font-semibold">
            {summary?.activeChargePointCount ?? 0} 台
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">總交易筆數</div>
          <div className="font-semibold">
            {summary?.totalTransactions ?? transactions.length} 筆
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">總充電度數</div>
          <div className="font-semibold">
            {formatNumber(summary?.totalEnergyKwh)} kWh
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">總金額</div>
          <div className="font-semibold">
            {formatNumber(summary?.totalCost)} 元
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800 text-left">
              <th className="p-2">交易編號</th>
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
                    className="border-b hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() =>
                      transactionId ? setSelected(transactionId) : null
                    }
                  >
                    <td className="p-2">{transactionId ?? "--"}</td>
                    <td className="p-2">{chargePointId ?? "--"}</td>
                    <td className="p-2">{residentName ?? "--"}</td>
                    <td className="p-2">{cardId ?? "--"}</td>
                    <td className="p-2">{formatDateTime(startTimestamp)}</td>
                    <td className="p-2">{formatDateTime(stopTimestamp)}</td>
                    <td className="p-2">{durationText ?? "--"}</td>
                    <td className="p-2">{formatNumber(energyKwh)}</td>
                    <td className="p-2">{formatNumber(balanceBefore)}</td>
                    <td className="p-2">{formatNumber(cost)}</td>
                    <td className="p-2">{formatNumber(balanceAfter)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" className="text-center py-4 text-gray-400">
                  {loading ? "資料查詢中..." : "無交易資料"}
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