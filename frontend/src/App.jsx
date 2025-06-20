// frontend/src/pages/WeeklyPricingSettings.jsx
import React, { useEffect, useState } from "react";
import axios from "./axiosInstance";

const API_ROOT = "https://ocppfortechlux.onrender.com/api/weekly-pricing";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const types = [
  { value: "peak", label: "尖峰", color: "#EF4444" },
  { value: "mid", label: "半尖峰", color: "#F59E0B" },
  { value: "off", label: "離峰", color: "#3B82F6" },
];

const WeeklyPricingSettings = () => {
  const [season, setSeason] = useState("summer");
  const [selectedDays, setSelectedDays] = useState(["Monday"]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ id: null, type: "peak", startTime: "08:00", endTime: "12:00", price: 0 });

  useEffect(() => {
    fetchEntries();
  }, [season]);

  const fetchEntries = async () => {
    const res = await axios.get(API_ROOT, { params: { season } });
    setEntries(res.data);
  };

  const handleDayToggle = (day) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSave = async () => {
    for (const day of selectedDays) {
      const payload = {
        season,
        weekday: day,
        type: form.type,
        startTime: form.startTime,
        endTime: form.endTime,
        price: parseFloat(form.price),
      };
      if (form.id) {
        await axios.put(`${API_ROOT}/${form.id}`, payload);
      } else {
        await axios.post(API_ROOT, payload);
      }
    }
    setForm({ id: null, type: "peak", startTime: "08:00", endTime: "12:00", price: 0 });
    fetchEntries();
  };

  const handleEdit = (e) => {
    setForm({
      id: e.id,
      type: e.type,
      startTime: e.startTime,
      endTime: e.endTime,
      price: e.price,
    });
    setSelectedDays([e.weekday]);
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_ROOT}/${id}`);
    fetchEntries();
  };

  return (
    <div className="text-white max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📆 週期性電價設定</h2>

      <div className="mb-4 flex gap-4">
        <label>選擇季節：</label>
        <select value={season} onChange={(e) => setSeason(e.target.value)} className="text-black px-2 py-1">
          <option value="summer">夏季 (6–9月)</option>
          <option value="non_summer">非夏季</option>
        </select>

        <div className="flex gap-2">
          {weekdays.map((day) => (
            <button
              key={day}
              onClick={() => handleDayToggle(day)}
              className={`px-2 py-1 rounded ${selectedDays.includes(day) ? "bg-blue-500" : "bg-gray-600"}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-700 p-4 rounded mb-6">
        <h3 className="font-semibold mb-2">{form.id ? "✏️ 編輯設定" : "➕ 新增設定"}</h3>
        <div className="flex flex-wrap gap-4">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="text-black px-2 py-1">
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="text-black px-2 py-1" />
          <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="text-black px-2 py-1" />
          <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="text-black px-2 py-1 w-24" placeholder="單價" />
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-1 rounded">{form.id ? "更新" : "新增"}</button>
          {form.id && (
            <button onClick={() => setForm({ id: null, type: "peak", startTime: "08:00", endTime: "12:00", price: 0 })} className="px-4 py-1">
              取消
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">已設定內容（{season === "summer" ? "夏季" : "非夏季"}）</h3>
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="bg-gray-700 text-left">
              <th className="p-2">星期</th>
              <th className="p-2">類型</th>
              <th className="p-2">時間</th>
              <th className="p-2">價格</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0 ? (
              entries.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2">{e.weekday}</td>
                  <td className="p-2" style={{ color: types.find((t) => t.value === e.type)?.color }}>{types.find((t) => t.value === e.type)?.label}</td>
                  <td className="p-2">{e.startTime}–{e.endTime}</td>
                  <td className="p-2">{e.price}</td>
                  <td className="p-2">
                    <button onClick={() => handleEdit(e)} className="text-blue-400 mr-2">編輯</button>
                    <button onClick={() => handleDelete(e.id)} className="text-red-400">刪除</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-2" colSpan="5">
                  尚無設定
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyPricingSettings;
