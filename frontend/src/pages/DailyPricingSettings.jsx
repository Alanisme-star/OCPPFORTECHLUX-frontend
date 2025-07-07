// DailyPricingSettings.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(weekday);
dayjs.extend(isoWeek);

const types = [
  { value: "peak", label: "尖峰", color: "#EF4444" },
  { value: "mid", label: "半尖峰", color: "#F59E0B" },
  { value: "off", label: "離峰", color: "#3B82F6" }
];

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const DailyPricingSettings = () => {
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [calendar, setCalendar] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailySettings, setDailySettings] = useState([]);

  useEffect(() => {
    generateCalendar();
  }, [year, month]);

  const generateCalendar = async () => {
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const newCalendar = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(`${year}-${month}-${d}`).format("YYYY-MM-DD");
      const res = await axios.get("/api/daily-pricing", { params: { date: dateStr } });
      const isSet = res.data.length > 0;
      const weekDay = dayjs(dateStr).day();
      let color = "gray";
      if (isSet) {
        if (weekDay === 0) color = "green";
        else if (weekDay === 6) color = "blue";
        else color = "yellow";
      }
      newCalendar.push({ date: dateStr, color });
    }
    setCalendar(newCalendar);
  };

  const loadDateSettings = async (date) => {
    const res = await axios.get("/api/daily-pricing", { params: { date } });
    setSelectedDate(date);
    setDailySettings(res.data);
  };

  return (
    <div className="text-white max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📅 每日電價設定</h2>

      {/* 年月選擇 */}
      <div className="mb-4 flex gap-4">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-black px-2 py-1">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="text-black px-2 py-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
        </select>
      </div>

      {/* 星期標題列 */}
      <div className="grid grid-cols-7 gap-2 text-center mb-2 font-semibold text-gray-300">
        {weekdayLabels.map((label, index) => (
          <div key={index}>{label}</div>
        ))}
      </div>

      {/* 月曆區 */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {calendar.map((d, i) => (
          <button
            key={i}
            onClick={() => loadDateSettings(d.date)}
            className={`rounded p-2 w-full ${d.color === "yellow" ? "bg-yellow-400" : d.color === "blue" ? "bg-blue-400" : d.color === "green" ? "bg-green-400" : "bg-gray-400"}`}
          >
            {dayjs(d.date).date()}
          </button>
        ))}
      </div>

      {/* 其他區塊略... */}
    </div>
  );
};

export default DailyPricingSettings;
