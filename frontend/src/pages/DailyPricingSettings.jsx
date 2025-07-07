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

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

const DailyPricingSettings = () => {
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [calendar, setCalendar] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailySettings, setDailySettings] = useState([]);
  const [weekdayRules, setWeekdayRules] = useState([]);
  const [saturdayRules, setSaturdayRules] = useState([]);
  const [sundayRules, setSundayRules] = useState([]);

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

  const renderRuleEditor = (rules, setRules) => (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={i} className="flex gap-2">
          <select value={r.label} onChange={(e) => {
            const copy = [...rules];
            copy[i].label = e.target.value;
            setRules(copy);
          }} className="text-black px-2 py-1">
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="time" value={r.startTime} onChange={(e) => {
            const copy = [...rules];
            copy[i].startTime = e.target.value;
            setRules(copy);
          }} className="text-black px-2 py-1" />
          <input type="time" value={r.endTime} onChange={(e) => {
            const copy = [...rules];
            copy[i].endTime = e.target.value;
            setRules(copy);
          }} className="text-black px-2 py-1" />
          <input type="number" step="0.01" value={r.price} onChange={(e) => {
            const copy = [...rules];
            copy[i].price = e.target.value;
            setRules(copy);
          }} className="text-black px-2 py-1 w-20" placeholder="單價" />
          <button onClick={() => {
            const copy = [...rules];
            copy.splice(i, 1);
            setRules(copy);
          }} className="text-red-400">刪除</button>
        </div>
      ))}
      <button onClick={() => setRules([...rules, { startTime: "08:00", endTime: "12:00", price: 0, label: "peak" }])} className="mt-1 bg-gray-600 px-2 py-1 rounded">➕ 新增</button>
    </div>
  );

  const handleApplyTemplate = async (type) => {
    let rules = [];
    if (type === "weekday") rules = weekdayRules;
    if (type === "saturday") rules = saturdayRules;
    if (type === "sunday") rules = sundayRules;

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    await axios.post("/api/internal/duplicate-daily-pricing", {
      type,
      rules,
      start,
    });
    generateCalendar();
  };

  return (
    <div className="text-white max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📅 每日電價設定</h2>

      <div className="mb-4 flex gap-4">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-black px-2 py-1">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="text-black px-2 py-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
        </select>
      </div>

      {/* 星期標頭列 */}
      <div className="grid grid-cols-7 gap-2 text-center mb-2 font-semibold text-gray-300">
        {weekdayLabels.map((label, index) => (
          <div key={index}>{label}</div>
        ))}
      </div>

      {/* 月曆按鈕列 */}
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

      {selectedDate && (
        <div className="bg-gray-700 p-4 rounded mb-10">
          <h3 className="font-semibold mb-4">🛠 {selectedDate} 設定</h3>
          {dailySettings.map((e, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <select value={e.label} onChange={(ev) => {
                const copy = [...dailySettings];
                copy[idx].label = ev.target.value;
                setDailySettings(copy);
              }} className="text-black px-2 py-1">
                {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="time" value={e.startTime} onChange={(ev) => {
                const copy = [...dailySettings];
                copy[idx].startTime = ev.target.value;
                setDailySettings(copy);
              }} className="text-black px-2 py-1" />
              <input type="time" value={e.endTime} onChange={(ev) => {
                const copy = [...dailySettings];
                copy[idx].endTime = ev.target.value;
                setDailySettings(copy);
              }} className="text-black px-2 py-1" />
              <input type="number" step="0.01" value={e.price} onChange={(ev) => {
                const copy = [...dailySettings];
                copy[idx].price = ev.target.value;
                setDailySettings(copy);
              }} className="text-black px-2 py-1 w-20" placeholder="單價" />
              <button onClick={() => e.id && handleDelete(e.id)} className="text-red-400">刪除</button>
            </div>
          ))}
          <div className="mt-4 flex gap-2">
            <button onClick={() => setDailySettings([...dailySettings, { id: null, startTime: "08:00", endTime: "12:00", price: 0, label: "peak" }])} className="bg-gray-500 px-3 py-1 rounded">➕ 新增</button>
            <button onClick={handleSave} className="bg-green-600 px-3 py-1 rounded">💾 儲存</button>
          </div>
        </div>
      )}

      {/* 預設規則區塊 */}
      <div className="bg-gray-800 p-4 rounded">
        <h3 className="font-semibold text-lg mb-4">📋 預設電價規則</h3>

        <div className="mb-6">
          <h4 className="text-yellow-300 font-bold mb-2">◆ 工作日 (週一～週五)</h4>
          {renderRuleEditor(weekdayRules, setWeekdayRules)}
          <button onClick={() => handleApplyTemplate("weekday")} className="mt-2 bg-blue-600 px-3 py-1 rounded">📤 套用至本月工作日</button>
        </div>

        <div className="mb-6">
          <h4 className="text-blue-300 font-bold mb-2">◆ 星期六</h4>
          {renderRuleEditor(saturdayRules, setSaturdayRules)}
          <button onClick={() => handleApplyTemplate("saturday")} className="mt-2 bg-blue-600 px-3 py-1 rounded">📤 套用至本月六</button>
        </div>

        <div>
          <h4 className="text-green-300 font-bold mb-2">◆ 星期日</h4>
          {renderRuleEditor(sundayRules, setSundayRules)}
          <button onClick={() => handleApplyTemplate("sunday")} className="mt-2 bg-blue-600 px-3 py-1 rounded">📤 套用至本月日</button>
        </div>
      </div>
    </div>
  );
};

export default DailyPricingSettings;
