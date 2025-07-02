// frontend/src/pages/TopEnergyChart.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const TopEnergyChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTop();
  }, []);

  const fetchTop = async () => {
    try {
      const res = await axios.get("/dashboard/top?group_by=idTag&limit=10", {
        timeout: 30000,
      });
      const formatted = res.data.map((item) => ({
        name: item.group,
        kWh: (item.totalEnergy / 1000).toFixed(2),
        count: item.transactionCount,
      }));
      setData(formatted);
    } catch (err) {
      console.error("❌ 排行資料載入失敗：", err);
      setError("排行資料載入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded shadow mb-6">
      <h2 className="text-2xl font-bold mb-4">🏆 前 10 名用電排行（依 IDTag）</h2>

      {loading ? (
        <div className="text-gray-400">📊 正在載入排行資料...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : data.length === 0 ? (
        <div className="text-yellow-300">⚠️ 無資料可顯示</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 50, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              label={{ value: "kWh", position: "insideBottomRight", offset: -5 }}
            />
            <YAxis type="category" dataKey="name" />
            <Tooltip />
            <Legend />
            <Bar dataKey="kWh" fill="#60a5fa" name="用電量 (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TopEnergyChart;
