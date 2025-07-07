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
        if (weekDay === 0) color = "green"; // Sunday
        else if (weekDay === 6) color = "blue"; // Saturday
        else color = "yellow"; // Weekday
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

  const handleAdd = () => {
    setDailySettings([...dailySettings, { id: null, startTime: "08:00", endTime: "12:00", price: 0, label: "peak" }]);
  };

  const handleSave = async () => {
    for (const entry of dailySettings) {
      if (entry.id) {
        await axios.put(`/api/daily-pricing/${entry.id}`, { ...entry, date: selectedDate });
      } else {
        await axios.post(`/api/daily-pricing`, { ...entry, date: selectedDate });
      }
    }
    loadDateSettings(selectedDate);
    generateCalendar();
  };

  const handleDelete = async (id) => {
    await axios.delete(`/api/daily-pricing/${id}`);
    loadDateSettings(selectedDate);
    generateCalendar();
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

      {/* 月曆區 */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {calendar.map((d, i) => (
          <button
            key={i}
            onClick={() => loadDateSettings(d.date)}
            className={`rounded p-2 ${
              d.color === "yellow"
                ? "bg-yellow-400"
                : d.color === "blue"
                ? "bg-blue-400"
                : d.color === "green"
                ? "bg-green-400"
                : "bg-gray-400"
            }`}
          >
            {dayjs(d.date).date()}
          </button>
        ))}
      </div>

      {/* 設定區塊 */}
      {selectedDate && (
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="font-semibold mb-4">🛠 {selectedDate} 設定</h3>
          {dailySettings.map((e, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <select
                value={e.label}
                onChange={(ev) => {
                  const copy = [...dailySettings];
                  copy[idx].label = ev.target.value;
                  setDailySettings(copy);
                }}
                className="text-black px-2 py-1"
              >
                {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                type="time"
                value={e.startTime}
                onChange={(ev) => {
                  const copy = [...dailySettings];
                  copy[idx].startTime = ev.target.value;
                  setDailySettings(copy);
                }}
                className="text-black px-2 py-1"
              />
              <input
                type="time"
                value={e.endTime}
                onChange={(ev) => {
                  const copy = [...dailySettings];
                  copy[idx].endTime = ev.target.value;
                  setDailySettings(copy);
                }}
                className="text-black px-2 py-1"
              />
              <input
                type="number"
                step="0.01"
                value={e.price}
                onChange={(ev) => {
                  const copy = [...dailySettings];
                  copy[idx].price = ev.target.value;
                  setDailySettings(copy);
                }}
                className="text-black px-2 py-1 w-20"
                placeholder="單價"
              />
              <button onClick={() => e.id && handleDelete(e.id)} className="text-red-400">刪除</button>
            </div>
          ))}

          <div className="mt-4 flex gap-2">
            <button onClick={handleAdd} className="bg-gray-500 px-3 py-1 rounded">➕ 新增</button>
            <button onClick={handleSave} className="bg-green-600 px-3 py-1 rounded">💾 儲存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyPricingSettings;
