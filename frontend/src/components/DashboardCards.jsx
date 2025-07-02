import React, { useEffect, useState } from "react";
import axios from "@/axiosInstance";

function DashboardCards() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("/api/dashboard/summary")
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
