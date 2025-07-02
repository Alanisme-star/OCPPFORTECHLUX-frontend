import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const TransactionCostChart = ({ transactionId }) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    fetchCostData();
  }, [transactionId]);

  const fetchCostData = async () => {
    try {
      const res = await axios.get(`/transactions/${transactionId}/cost`);
      setData(res.data.details);
      setTotal(res.data);
    } catch (err) {
      console.error("載入電費資料失敗：", err);
    }
  };

  return (
    <div className="mt-6 bg-gray-800 text-white p-4 rounded">
      <h3 className="text-lg font-bold mb-2">📈 用電分段圖表</h3>
      {data.length === 0 ? (
        <p>無資料</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="from" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
            <YAxis yAxisId="left" label={{ value: "kWh", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: "Cost", angle: -90, position: "insideRight" }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="kWh" stroke="#8884d8" name="用電量 (kWh)" />
            <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#82ca9d" name="費用 (NT$)" />
          </LineChart>
        </ResponsiveContainer>
      )}
      {total && (
        <div className="mt-2 text-sm">
          💰 總電費：<strong>NT$ {total.totalCost}</strong>（基本費 {total.basicFee} + 能源費 {total.energyCost} + 超量費 {total.overuseFee}）
        </div>
      )}
    </div>
  );
};

export default TransactionCostChart;
