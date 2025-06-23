import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const CostSummaryTable = () => {
  const [data, setData] = useState([]);
  const [start, setStart] = useState("2025-06-01");
  const [end, setEnd] = useState("2025-06-13");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (start && end) {
      fetchData();
    }
  }, [start, end]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `/transactions/cost-summary?start=${start}&end=${end}`
      );
      setData(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch cost summary:", err);
      setError("查詢失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 text-white shadow rounded mb-4">
      <h2 className="text-xl font-bold mb-2">💰 電費成本明細表</h2>

      <div className="flex items-center gap-2 mb-3">
        <label>Start:</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border p-1 rounded bg-gray-700 text-white"
        />
        <label>End:</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border p-1 rounded bg-gray-700 text-white"
        />
      </div>

      {error && (
        <div className="text-red-400 mb-2">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">載入中...</div>
      ) : (
        <div className="overflow-auto">
          <table className="table-auto w-full text-sm border border-gray-600">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="px-3 py-2 border border-gray-600">交易 ID</th>
                <th className="px-3 py-2 border border-gray-600">用電量 (kWh)</th>
                <th className="px-3 py-2 border border-gray-600">基本費</th>
                <th className="px-3 py-2 border border-gray-600">用電費</th>
                <th className="px-3 py-2 border border-gray-600">超量費</th>
                <th className="px-3 py-2 border border-gray-600 text-right">總金額</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.transactionId} className="border-t border-gray-600">
                  <td className="px-3 py-1 border border-gray-600">{item.transactionId}</td>
                  <td className="px-3 py-1 border border-gray-600">{item.totalKWh}</td>
                  <td className="px-3 py-1 border border-gray-600">${item.basicFee}</td>
                  <td className="px-3 py-1 border border-gray-600">${item.energyCost}</td>
                  <td className="px-3 py-1 border border-gray-600">${item.overuseFee}</td>
                  <td className="px-3 py-1 border border-gray-600 font-semibold text-right">
                    ${item.totalCost}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-3 text-gray-400">
                    無符合條件的資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CostSummaryTable;
