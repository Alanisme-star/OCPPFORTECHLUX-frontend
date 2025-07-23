// ✅ TrendChart.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function TrendChart({ groupBy = "day" }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const end = new Date().toISOString().slice(0, 10); // 今日
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 近 30 日

    axios.get(`/api/dashboard/trend?group_by=${groupBy}&start=${start}&end=${end}`)
      .then(res => setData(res.data))
      .catch(err => console.error("載入趨勢圖失敗", err));
  }, [groupBy]);

  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-md">
      <p className="font-bold mb-2">📈 每{groupBy === 'day' ? '日' : '週'}用電趨勢</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis unit=" kWh" />
          <Tooltip />
          <Line type="monotone" dataKey="kWh" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;
