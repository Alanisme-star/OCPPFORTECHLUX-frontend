import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import CostSummaryTable from "./CostSummaryTable";

export default function CostSummaryPage() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/transactions/cost-summary", { timeout: 30000 }) // ✅ 延長 timeout
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ 讀取成本總覽失敗：", err);
        setError("資料載入失敗，請稍後再試");
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 bg-gray-800 text-white rounded">
      <h2 className="text-2xl font-bold mb-4">💰 電費成本總覽</h2>

      {loading ? (
        <div className="text-gray-300">📊 資料載入中...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : data.length === 0 ? (
        <div className="text-yellow-300">⚠️ 目前尚無交易資料可顯示</div>
      ) : (
        <CostSummaryTable data={data} />
      )}
    </div>
  );
}
