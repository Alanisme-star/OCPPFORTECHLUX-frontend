import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const Dashboard = () => {
  const [summary, setSummary] = useState([]);
  const [status, setStatus] = useState({});
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date();
      const end = today.toISOString().slice(0, 10);
      const start = new Date(today.setDate(today.getDate() - 30)).toISOString().slice(0, 10);

      setLoading(true);
      console.log("📡 發出 dashboard 請求...", { start, end });

      try {
        const [s1, s2, s3] = await Promise.all([
          axios.get(`/api/dashboard/trend?group_by=day&start=${start}&end=${end}`, { timeout: 30000 }),
          axios.get("/api/status"),
          axios.get(`/api/summary/daily-by-chargepoint-range?start=${start}&end=${end}`, { timeout: 30000 })
        ]);

        console.log("✅ /dashboard/trend 結果:", s1.data);
        console.log("✅ /status 結果:", s2.data);
        console.log("✅ /summary/daily-by-chargepoint 結果:", s3.data);

        setTrend(Array.isArray(s1.data) ? s1.data : []);
        setStatus(s2.data || {});
        setSummary(Array.isArray(s3.data) ? s3.data : []);
      } catch (err) {
        console.error("❌ 儀表板資料讀取失敗：", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const cpList = Array.isArray(trend) && trend.length > 0 && typeof trend[0] === "object"
    ? Object.keys(trend[0]).filter((k) => k !== "period" && typeof k === "string")
    : [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">儀表板 Dashboard</h2>
      {loading ? (
        <p>⏳ 資料載入中，請稍候...</p>
      ) : (
        <div className="space-y-8">
          {/* 每日用電統計 */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold text-lg mb-2">📊 每日用電統計</h3>
            <ul className="text-sm max-h-64 overflow-y-auto">
              {summary.length > 0 ? (
                summary.slice(-7).map((row) => (
                  <li key={row.period}>
                    ▸ {row.period}：{row.totalEnergy ? (row.totalEnergy / 1000).toFixed(2) : "0.00"} kWh（{row.transactionCount ?? 0} 筆）
                  </li>
                ))
              ) : (
                <li>無資料</li>
              )}
            </ul>
          </div>

          {/* 趨勢圖 */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold text-lg mb-2">📈 多樁近 30 日用電趨勢圖</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis unit="kWh" />
                <Tooltip />
                <Legend />
                {cpList.map((cp) => (
                  <Line
                    key={`line-${cp}`}
                    type="monotone"
                    dataKey={cp}
                    stroke="#4fd1c5"
                    name={cp}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 即時狀態 */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold text-lg mb-2">🔌 即時充電樁狀態</h3>
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-gray-700 text-left">
                  <th className="p-2">充電樁</th>
                  <th className="p-2">狀態</th>
                </tr>
              </thead>
              <tbody>
                {status && Object.keys(status).length > 0 ? (
                  Object.entries(status).map(([cpId, st]) => (
                    <tr key={cpId} className="border-b">
                      <td className="p-2">{cpId}</td>
                      <td className="p-2">{st.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-2" colSpan="2">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
