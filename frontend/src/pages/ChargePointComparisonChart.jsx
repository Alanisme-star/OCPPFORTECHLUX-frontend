import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ChargePointComparisonChart = () => {
  const [data, setData] = useState([]);
  const [points, setPoints] = useState([]);
  const [start, setStart] = useState("2025-06-01");
  const [end, setEnd] = useState("2025-06-30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [start, end]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `/api/summary/daily-by-chargepoint-range?start=${start}&end=${end}`,
        { timeout: 30000 }
      );
      const rows = res.data;

      const allKeys = new Set();
      rows.forEach((row) => {
        Object.keys(row).forEach((k) => {
          if (k !== "period") allKeys.add(k);
        });
      });

      setData(rows);
      setPoints([...allKeys]);
    } catch (err) {
      console.error("❌ 用電比較資料載入失敗：", err);
      setError("資料載入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 text-white shadow rounded mb-4">
      <h2 className="text-xl font-bold mb-4">📊 多樁用電趨勢比較圖（日期區間）</h2>

      <div className="flex items-center gap-2 mb-4">
        <label>起始：</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border p-1 rounded text-black"
        />
        <label>結束：</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border p-1 rounded text-black"
        />
      </div>

      {loading ? (
        <div className="text-gray-400">📈 資料載入中...</div>
      ) : error ? (
        <div className="text-red-400">⚠️ {error}</div>
      ) : data.length === 0 ? (
        <div className="text-yellow-300">⚠️ 無資料可顯示</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis
              label={{ value: "kWh", angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            {points.map((cp, idx) => (
              <Line
                key={cp}
                type="monotone"
                dataKey={cp}
                stroke={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
                strokeWidth={2}
                dot={{ r: 2 }}
                name={cp}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ChargePointComparisonChart;
