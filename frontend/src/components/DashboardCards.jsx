// DashboardCards.jsx
// 元件：顯示即時統計資訊（目前充電中、總功率、今日用電）

import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function DashboardCards() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("/dashboard/summary")
      .then(res => setData(res.data))
      .catch(err => console.error("📉 載入 summary 失敗", err));
  }, []);

  if (!data) return <p>載入統計中...</p>;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white text-black p-4 rounded-xl shadow-md">
        <p className="text-sm text-gray-500">目前充電中</p>
        <p className="text-2xl font-bold">{data.chargingCount} 筆</p>
      </div>
      <div className="bg-white text-black p-4 rounded-xl shadow-md">
        <p className="text-sm text-gray-500">即時總功率</p>
        <p className="text-2xl font-bold">{data.totalPowerW} W</p>
      </div>
      <div className="bg-white text-black p-4 rounded-xl shadow-md">
        <p className="text-sm text-gray-500">今日用電</p>
        <p className="text-2xl font-bold">{data.energyTodayKWh} kWh</p>
      </div>
    </div>
  );
}

export default DashboardCards;



# ✅ TrendChart.jsx
# components/TrendChart.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function TrendChart({ groupBy = "day" }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(`/dashboard/trend?group_by=${groupBy}`)
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


# ✅ 修改 Dashboard.jsx 整合元件
# pages/Dashboard.jsx
import React from "react";
import DashboardCards from "../components/DashboardCards";
import TrendChart from "../components/TrendChart";

function Dashboard() {
  return (
    <div className="p-6">
      <DashboardCards />
      <TrendChart groupBy="day" />
    </div>
  );
}

export default Dashboard;
