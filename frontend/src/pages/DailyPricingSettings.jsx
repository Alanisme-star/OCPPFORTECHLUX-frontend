import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import TimeSelect15 from "../components/TimeSelect15";   // ⭐ 匯入自訂時間元件

dayjs.extend(weekday);
dayjs.extend(isoWeek);

// ⭐ 檢查是否完整覆蓋 24 小時（00:00~24:00）
function isFullDay(rules) {
  if (!rules.length) return true; // 無規則 = 不檢查

  const toMin = (t) => {
    if (!t) return null;
    if (t === "24:00") return 1440;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const seg = rules
    .map((r) => ({ s: toMin(r.startTime), e: toMin(r.endTime) }))
    .sort((a, b) => a.s - b.s);

  if (seg.some((x) => x.s === null || x.e === null)) return false;
  if (seg[0].s !== 0) return false;

  const endLast = seg[seg.length - 1].e;
  if (endLast < 1439) return false;

  for (let i = 0; i < seg.length - 1; i++) {
    if (seg[i].e !== seg[i + 1].s) return false;
  }

  return true;
}

const types = [
  { value: "peak", label: "尖峰", color: "#EF4444" },
  { value: "mid", label: "半尖峰", color: "#F59E0B" },
  { value: "off", label: "離峰", color: "#3B82F6" }
];

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

export default function DailyPricingSettings() {
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [calendar, setCalendar] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [dailySettings, setDailySettings] = useState([]);

  const [weekdayRules, setWeekdayRules] = useState([]);
  const [saturdayRules, setSaturdayRules] = useState([]);
  const [sundayRules, setSundayRules] = useState([]);

  const [rulesLoaded, setRulesLoaded] = useState(false);

  // ---------------------- 載入預設規則 ----------------------
  const loadDefaultPricingRules = async () => {
    try {
      const res = await axios.get("/api/default-pricing-rules");
      setWeekdayRules(res.data.weekday || []);
      setSaturdayRules(res.data.saturday || []);
      setSundayRules(res.data.sunday || []);
    } catch (err) {
      console.error("無法載入預設電價規則", err);
    } finally {
      setRulesLoaded(true);
    }
  };

  useEffect(() => {
    setRulesLoaded(false);
    loadDefaultPricingRules();
  }, [year, month]);

  // ---------------------- 自動儲存預設規則（避免誤清空） ----------------------
  const saveDefaultPricingRules = async () => {
    try {
      await axios.post("/api/default-pricing-rules", {
        weekday: weekdayRules,
        saturday: saturdayRules,
        sunday: sundayRules
      });
    } catch (err) {
      console.error("儲存預設電價規則失敗", err);
    }
  };

  useEffect(() => {
    if (rulesLoaded) saveDefaultPricingRules();
  }, [weekdayRules, saturdayRules, sundayRules]);

  // ---------------------- 月曆生成 ----------------------
  useEffect(() => {
    generateCalendar();
  }, [year, month]);

  const generateCalendar = async () => {
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const firstDay = dayjs(`${year}-${month}-01`).day();

    const newCalendar = [];
    for (let i = 0; i < firstDay; i++) newCalendar.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(`${year}-${month}-${d}`).format("YYYY-MM-DD");

      const res = await axios.get("/api/daily-pricing", {
        params: { date: dateStr }
      });

      const isSet = res.data.length > 0;
      const weekDay = dayjs(dateStr).day();
      let color = "gray";

      if (isSet) {
        const isHoliday = res.data.some((r) => r.label === "holiday");
        if (isHoliday || weekDay === 0) color = "green";
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

  // ---------------------- 規則編輯區（整合 TimeSelect15） ----------------------
  const renderRuleEditor = (rules, setRules) => (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">

          {/* 電價種類 */}
          <select
            value={r.label}
            onChange={(e) => {
              const copy = [...rules];
              copy[i].label = e.target.value;
              setRules(copy);
            }}
            className="text-black px-2 py-1 rounded"
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* ⭐ 自訂時間選擇器（開始時間） */}
          <TimeSelect15
            value={r.startTime}
            onChange={(val) => {
              const copy = [...rules];
              copy[i].startTime = val;
              setRules(copy);
            }}
          />

          {/* ⭐ 自訂時間選擇器（結束時間） */}
          <TimeSelect15
            value={r.endTime}
            onChange={(val) => {
              const copy = [...rules];
              copy[i].endTime = val;
              setRules(copy);
            }}
          />

          {/* 單價 */}
          <input
            type="number"
            step="0.01"
            value={r.price}
            onChange={(e) => {
              const copy = [...rules];
              copy[i].price = e.target.value;
              setRules(copy);
            }}
            className="text-black px-2 py-1 w-20 rounded"
            placeholder="單價"
          />

          {/* 刪除按鈕 */}
          <button
            onClick={() => {
              const copy = [...rules];
              copy.splice(i, 1);
              setRules(copy);
            }}
            className="text-red-400 font-bold"
          >
            刪除
          </button>
        </div>
      ))}

      {/* 新增一組規則 */}
      <button
        onClick={() =>
          setRules([
            ...rules,
            {
              startTime: "08:00",
              endTime: "12:00",
              price: 0,
              label: "peak"
            }
          ])
        }
        className="mt-1 bg-gray-600 px-2 py-1 rounded"
      >
        ➕ 新增
      </button>
    </div>
  );

  // ---------------------- 套用模板（工作日 / 六 / 日） ----------------------
  const handleApplyTemplate = async (type) => {
    let rules = [];
    if (type === "weekday") rules = weekdayRules;
    if (type === "saturday") rules = saturdayRules;
    if (type === "sunday") rules = sundayRules;

    if (!rules.length) {
      alert("⚠️ 尚未設定任何規則");
      return;
    }

    // ⭐ 防呆：必須設定滿 24 小時
    if (!isFullDay(rules)) {
      alert("⚠️ 尚未設定完畢（請設定滿 24 小時）");
      return;
    }

    try {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      await axios.post("/api/internal/duplicate-daily-pricing", {
        type,
        rules,
        start
      });
      alert("✅ 套用成功！");
      generateCalendar();
    } catch (err) {
      alert("❌ 套用失敗");
    }
  };

  // ---------------------- 套用例假日（沿用星期日） ----------------------
  const handleApplyHoliday = async (date) => {
    if (!sundayRules.length) {
      alert("⚠️ 尚未設定星期日規則");
      return;
    }

    if (!isFullDay(sundayRules)) {
      alert("⚠️ 星期日規則尚未設定滿 24 小時");
      return;
    }

    try {
      await axios.delete("/api/daily-pricing", { params: { date } });

      for (let rule of sundayRules) {
        await axios.post("/api/daily-pricing", {
          date,
          startTime: rule.startTime,
          endTime: rule.endTime,
          price: rule.price,
          label: "holiday"
        });
      }

      alert("✅ 套用例假日設定！");
      generateCalendar();
      loadDateSettings(date);
    } catch {
      alert("❌ 套用失敗");
    }
  };

  // ---------------------- 儲存單一天設定 ----------------------
  const handleSave = async () => {
    if (!selectedDate) return;

    if (!isFullDay(dailySettings)) {
      alert("⚠️ 尚未設定完畢（請設定滿 24 小時）");
      return;
    }

    try {
      await axios.delete("/api/daily-pricing", {
        params: { date: selectedDate }
      });

      for (let entry of dailySettings) {
        await axios.post("/api/daily-pricing", {
          date: selectedDate,
          startTime: entry.startTime,
          endTime: entry.endTime,
          price: entry.price,
          label: entry.label
        });
      }

      alert("✅ 儲存成功！");
      generateCalendar();
    } catch {
      alert("❌ 儲存失敗");
    }
  };

  // ---------------------- Loading 保護 ----------------------
  if (!rulesLoaded) {
    return <div className="text-white">載入中...</div>;
  }

  return (
    <div className="text-white max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📅 每日電價設定</h2>

      {/* 年月選擇 */}
      <div className="mb-4 flex gap-4">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-black px-2 py-1 rounded"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-black px-2 py-1 rounded"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m} 月</option>
          ))}
        </select>
      </div>

      {/* 星期標頭 */}
      <div className="grid grid-cols-7 gap-2 text-center mb-2 font-semibold text-gray-300">
        {weekdayLabels.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      {/* 月曆 */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {calendar.map((d, i) =>
          d ? (
            <button
              key={i}
              onClick={() => loadDateSettings(d.date)}
              className={`rounded p-2 w-full ${
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
          ) : (
            <div key={i} className="p-2"></div>
          )
        )}
      </div>

      {/* 例假日設定 */}
      <div className="bg-gray-700 p-4 rounded mb-10">
        <h3 className="font-semibold mb-4">🛠 選擇日期：{selectedDate || "未選擇"}</h3>
        <p className="text-green-300 mb-2 font-bold">（例假日內容沿用星期日規則）</p>

        {sundayRules.length ? (
          sundayRules.map((e, idx) => (
            <div key={idx} className="flex gap-3 mb-1">
              <span>{types.find((t) => t.value === e.label)?.label}</span>
              <span>{e.startTime}</span>
              <span>{e.endTime}</span>
              <span>{e.price}</span>
            </div>
          ))
        ) : (
          <div className="text-red-400">⚠️ 尚未設定星期日規則</div>
        )}

        {selectedDate && (
          <button
            onClick={() => handleApplyHoliday(selectedDate)}
            className="mt-4 bg-green-600 px-3 py-1 rounded"
          >
            🔁 套用例假日設定
          </button>
        )}
      </div>

      {/* 預設規則區 */}
      <div className="bg-gray-800 p-4 rounded">
        <h3 className="font-semibold text-lg mb-4">📋 預設電價規則</h3>

        {/* 工作日 */}
        <div className="mb-6">
          <h4 className="text-yellow-300 font-bold mb-2">◆ 工作日 (週一～週五)</h4>
          {renderRuleEditor(weekdayRules, setWeekdayRules)}
          <button
            onClick={() => handleApplyTemplate("weekday")}
            className="mt-2 bg-blue-600 px-3 py-1 rounded"
          >
            📤 套用至本月工作日
          </button>
        </div>

        {/* 星期六 */}
        <div className="mb-6">
          <h4 className="text-blue-300 font-bold mb-2">◆ 星期六</h4>
          {renderRuleEditor(saturdayRules, setSaturdayRules)}
          <button
            onClick={() => handleApplyTemplate("saturday")}
            className="mt-2 bg-blue-600 px-3 py-1 rounded"
          >
            📤 套用至本月六
          </button>
        </div>

        {/* 星期日 */}
        <div>
          <h4 className="text-green-300 font-bold mb-2">◆ 星期日</h4>
          {renderRuleEditor(sundayRules, setSundayRules)}
          <button
            onClick={() => handleApplyTemplate("sunday")}
            className="mt-2 bg-blue-600 px-3 py-1 rounded"
          >
            📤 套用至本月日
          </button>
        </div>
      </div>
    </div>
  );
}
