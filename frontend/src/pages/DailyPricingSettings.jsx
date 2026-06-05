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
const seasonOptions = [
  { value: "summer", label: "夏月", description: "5/16 ～ 10/15" },
  { value: "non_summer", label: "非夏月", description: "10/16 ～ 5/15" }
];

const ruleGroupLabels = {
  "summer.weekday": "夏月・工作日",
  "summer.saturday": "夏月・星期六",
  "summer.sunday": "夏月・星期日 / 例假日",
  "non_summer.weekday": "非夏月・工作日",
  "non_summer.saturday": "非夏月・星期六",
  "non_summer.sunday": "非夏月・星期日 / 例假日"
};

const createEmptyDefaultPricingRules = () => ({
  summer: {
    weekday: [],
    saturday: [],
    sunday: []
  },
  non_summer: {
    weekday: [],
    saturday: [],
    sunday: []
  }
});

const cloneRules = (rules) =>
  Array.isArray(rules) ? rules.map((r) => ({ ...r })) : [];

const normalizeDefaultPricingRules = (data) => {
  const empty = createEmptyDefaultPricingRules();

  // 新格式
  if (data?.summer || data?.non_summer) {
    return {
      summer: {
        weekday: cloneRules(data?.summer?.weekday),
        saturday: cloneRules(data?.summer?.saturday),
        sunday: cloneRules(data?.summer?.sunday)
      },
      non_summer: {
        weekday: cloneRules(data?.non_summer?.weekday),
        saturday: cloneRules(data?.non_summer?.saturday),
        sunday: cloneRules(data?.non_summer?.sunday)
      }
    };
  }

  // 舊格式相容：舊的 weekday/saturday/sunday 同時帶入夏月與非夏月
  if (data?.weekday || data?.saturday || data?.sunday) {
    const legacyRules = {
      weekday: cloneRules(data.weekday),
      saturday: cloneRules(data.saturday),
      sunday: cloneRules(data.sunday)
    };

    return {
      summer: {
        weekday: cloneRules(legacyRules.weekday),
        saturday: cloneRules(legacyRules.saturday),
        sunday: cloneRules(legacyRules.sunday)
      },
      non_summer: {
        weekday: cloneRules(legacyRules.weekday),
        saturday: cloneRules(legacyRules.saturday),
        sunday: cloneRules(legacyRules.sunday)
      }
    };
  }

  return empty;
};

const isFullDayRequired = (rules) => {
  return Array.isArray(rules) && rules.length > 0 && isFullDay(rules);
};

const getIncompleteDefaultRuleGroups = (pricingRules) => {
  const normalized = normalizeDefaultPricingRules(pricingRules);
  const missing = [];

  ["summer", "non_summer"].forEach((season) => {
    ["weekday", "saturday", "sunday"].forEach((dayType) => {
      if (!isFullDayRequired(normalized[season][dayType])) {
        missing.push(ruleGroupLabels[`${season}.${dayType}`]);
      }
    });
  });

  return missing;
};

const getSeasonByDate = (date) => {
  const d = dayjs(date);
  const month = d.month() + 1;
  const day = d.date();

  if (
    (month === 5 && day >= 16) ||
    month === 6 ||
    month === 7 ||
    month === 8 ||
    month === 9 ||
    (month === 10 && day <= 15)
  ) {
    return "summer";
  }

  return "non_summer";
};
export default function DailyPricingSettings() {
  const currentYear = dayjs().year();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [calendar, setCalendar] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [dailySettings, setDailySettings] = useState([]);

  const [selectedSeason, setSelectedSeason] = useState("summer");
  const [pricingRules, setPricingRules] = useState(() => createEmptyDefaultPricingRules());

  const currentSeasonRules = pricingRules[selectedSeason] || {
    weekday: [],
    saturday: [],
    sunday: []
  };

  const weekdayRules = currentSeasonRules.weekday || [];
  const saturdayRules = currentSeasonRules.saturday || [];
  const sundayRules = currentSeasonRules.sunday || [];

  const updateCurrentSeasonRules = (dayType, nextRules) => {
    setPricingRules((prev) => {
      const normalized = normalizeDefaultPricingRules(prev);

      return {
        ...normalized,
        [selectedSeason]: {
          ...normalized[selectedSeason],
          [dayType]:
            typeof nextRules === "function"
              ? nextRules(normalized[selectedSeason][dayType])
              : nextRules
        }
      };
    });
  };

  const setWeekdayRules = (nextRules) => updateCurrentSeasonRules("weekday", nextRules);
  const setSaturdayRules = (nextRules) => updateCurrentSeasonRules("saturday", nextRules);
  const setSundayRules = (nextRules) => updateCurrentSeasonRules("sunday", nextRules);

  const [rulesLoaded, setRulesLoaded] = useState(false);

  // ⭐ 新增：社區加價 (盈餘) 設定狀態
  const [communitySettings, setCommunitySettings] = useState(null);
  const [surcharge, setSurcharge] = useState(0);

  // ⭐ 新增：萬年曆批次匯入狀態
  const [calendarImportStartYear, setCalendarImportStartYear] = useState(currentYear);
  const [calendarImportEndYear, setCalendarImportEndYear] = useState(currentYear + 9);
  const [calendarImportMode, setCalendarImportMode] = useState("fill_missing");
  const [calendarImportLoading, setCalendarImportLoading] = useState(false);
  const [calendarImportResult, setCalendarImportResult] = useState(null);

  // ⭐ 新增：Special Days 多年批次套用狀態
  const [specialDaysStartYear, setSpecialDaysStartYear] = useState(currentYear);
  const [specialDaysEndYear, setSpecialDaysEndYear] = useState(currentYear + 9);
  const [specialDaysLoading, setSpecialDaysLoading] = useState(false);
  const [specialDaysResult, setSpecialDaysResult] = useState(null);

  // ---------------------- 載入與儲存社區加價設定 ----------------------
  const loadCommunitySettings = async () => {
    try {
      const res = await axios.get("/api/community-settings");
      setCommunitySettings(res.data);
      setSurcharge(res.data.surcharge_per_kwh || 0);
    } catch (err) {
      console.error("無法載入社區設定", err);
    }
  };

  const handleSaveSurcharge = async () => {
    if (!communitySettings) return;
    try {
      const payload = {
        enabled: communitySettings.enabled,
        contractKw: communitySettings.contract_kw,
        voltageV: communitySettings.voltage_v,
        phases: communitySettings.phases,
        minCurrentA: communitySettings.min_current_a,
        maxCurrentA: communitySettings.max_current_a,
        surchargePerKwh: parseFloat(surcharge) || 0
      };
      await axios.post("/api/community-settings", payload);
      alert("✅ 社區每度電加價儲存成功！");
    } catch (err) {
      alert("❌ 社區加價儲存失敗");
    }
  };

  useEffect(() => {
    loadCommunitySettings();
  }, []);

  // ---------------------- 載入預設規則 ----------------------
  const loadDefaultPricingRules = async () => {
    try {
      const res = await axios.get("/api/default-pricing-rules");
      setPricingRules(normalizeDefaultPricingRules(res.data));
    } catch (err) {
      console.error("無法載入預設電價規則", err);
      setPricingRules(createEmptyDefaultPricingRules());
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
      await axios.post(
        "/api/default-pricing-rules",
        normalizeDefaultPricingRules(pricingRules)
      );
    } catch (err) {
      console.error("儲存預設電價規則失敗", err);
    }
  };

  useEffect(() => {
    if (rulesLoaded) saveDefaultPricingRules();
  }, [pricingRules]);

  // ---------------------- 月曆生成 ----------------------
  useEffect(() => {
    generateCalendar();
  }, [year, month]);

  const generateCalendar = async (targetYear = year, targetMonth = month) => {
    const daysInMonth = dayjs(`${targetYear}-${targetMonth}-01`).daysInMonth();
    const firstDay = dayjs(`${targetYear}-${targetMonth}-01`).day();

    const newCalendar = [];
    for (let i = 0; i < firstDay; i++) newCalendar.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs(`${targetYear}-${targetMonth}-${d}`).format("YYYY-MM-DD");

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

  // ---------------------- 套用例假日（依日期自動判斷夏月 / 非夏月，沿用該季節星期日） ----------------------
  const handleApplyHoliday = async (date) => {
    const season = getSeasonByDate(date);
    const holidayRules = pricingRules?.[season]?.sunday || [];
    const seasonLabel = seasonOptions.find((s) => s.value === season)?.label || season;

    if (!holidayRules.length) {
      alert(`⚠️ 尚未設定${seasonLabel}星期日 / 例假日規則`);
      return;
    }

    if (!isFullDayRequired(holidayRules)) {
      alert(`⚠️ ${seasonLabel}星期日 / 例假日規則尚未設定滿 24 小時`);
      return;
    }

    try {
      await axios.delete("/api/daily-pricing", { params: { date } });

      for (let rule of holidayRules) {
        await axios.post("/api/daily-pricing", {
          date,
          startTime: rule.startTime,
          endTime: rule.endTime,
          price: rule.price,
          label: "holiday"
        });
      }

      alert(`✅ 已套用${seasonLabel}例假日設定！`);
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

  // ---------------------- 萬年曆批次匯入 ----------------------
  const handleImportCalendarPricing = async () => {
    const startYear = Number(calendarImportStartYear);
    const endYear = Number(calendarImportEndYear);

    if (!startYear || !endYear) {
      alert("⚠️ 請輸入起始年份與結束年份");
      return;
    }

    if (startYear > endYear) {
      alert("⚠️ 起始年份不可大於結束年份");
      return;
    }

    const incompleteGroups = getIncompleteDefaultRuleGroups(pricingRules);

    if (incompleteGroups.length > 0) {
      alert(
        "⚠️ 萬年曆批次匯入前，請先完成以下六組模板，且每組都必須設定滿 24 小時：\n\n" +
          incompleteGroups.join("\n")
      );
      return;
    }

    if (calendarImportMode === "overwrite") {
      const confirmed = window.confirm(
        `⚠️ 你選擇的是「覆蓋模式」。\n\n` +
          `系統會先刪除 ${startYear}～${endYear} 年範圍內既有的每日電價資料，再重新匯入。\n\n` +
          `重要提醒：如果你之前已經套用過 Special Days，重新執行萬年曆 overwrite 後，Special Days 會被一般星期規則覆蓋。\n\n` +
          `因此萬年曆 overwrite 完成後，請務必再次執行「Special Days 多年批次套用」。\n\n` +
          `確定要繼續嗎？`
      );

      if (!confirmed) return;
    }

    setCalendarImportLoading(true);
    setCalendarImportResult(null);

    try {
      const res = await axios.post("/api/daily-pricing/import-calendar", {
        startYear,
        endYear,
        mode: calendarImportMode
      });

      setCalendarImportResult(res.data);
      alert("✅ 萬年曆批次匯入完成！");

      setYear(startYear);
      setMonth(1);
      generateCalendar(startYear, 1);

      if (selectedDate) {
        loadDateSettings(selectedDate);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;

      let errorMessage = "萬年曆批次匯入失敗";

      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((item) => item.msg || JSON.stringify(item)).join("\n");
      } else if (detail) {
        errorMessage = JSON.stringify(detail);
      }

      alert(`❌ ${errorMessage}`);
    } finally {
      setCalendarImportLoading(false);
    }
  };

  // ---------------------- Special Days 多年批次套用 ----------------------
  const handleApplySpecialDays = async () => {
    const startYear = Number(specialDaysStartYear);
    const endYear = Number(specialDaysEndYear);

    if (!startYear || !endYear) {
      alert("⚠️ 請輸入 Special Days 起始年份與結束年份");
      return;
    }

    if (startYear > endYear) {
      alert("⚠️ Special Days 起始年份不可大於結束年份");
      return;
    }

    const specialDayMissingGroups = [];

    if (!isFullDayRequired(pricingRules?.summer?.sunday)) {
      specialDayMissingGroups.push("夏月・星期日 / 例假日");
    }

    if (!isFullDayRequired(pricingRules?.non_summer?.sunday)) {
      specialDayMissingGroups.push("非夏月・星期日 / 例假日");
    }

    if (specialDayMissingGroups.length > 0) {
      alert(
        "⚠️ Special Days 套用前，請先完成以下規則，且每組都必須設定滿 24 小時：\n\n" +
          specialDayMissingGroups.join("\n")
      );
      return;
    }

    const confirmed = window.confirm(
      `🎌 即將套用 ${startYear}～${endYear} 年的 Special Days。\n\n` +
        `系統會讀取 holidays/YYYY.json，只套用 type = holiday 的日期。\n\n` +
        `操作順序確認：\n` +
        `① 已設定平日 / 星期六 / 星期日模板\n` +
        `② 已執行萬年曆批次匯入\n` +
        `③ 現在才執行 Special Days 批次套用\n\n` +
        `系統會要求 Special Days 日期必須已經有既有每日電價資料。\n` +
        `若尚未先執行萬年曆匯入，後端會拒絕套用。\n\n` +
        `確定要繼續嗎？`
    );

    if (!confirmed) return;

    setSpecialDaysLoading(true);
    setSpecialDaysResult(null);

    try {
      const res = await axios.post("/api/daily-pricing/apply-special-days", {
        startYear,
        endYear,
        mode: "overwrite",
        requireExistingCalendar: true
      });

      setSpecialDaysResult(res.data);
      alert("✅ Special Days 多年批次套用完成！");

      setYear(startYear);
      setMonth(1);
      generateCalendar(startYear, 1);

      if (selectedDate) {
        loadDateSettings(selectedDate);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;

      let errorMessage = "Special Days 多年批次套用失敗";

      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((item) => item.msg || JSON.stringify(item)).join("\n");
      } else if (detail) {
        errorMessage = JSON.stringify(detail);
      }

      alert(`❌ ${errorMessage}`);
    } finally {
      setSpecialDaysLoading(false);
    }
  };

  const selectedHolidaySeason = selectedDate ? getSeasonByDate(selectedDate) : selectedSeason;
  const selectedHolidaySeasonLabel =
    seasonOptions.find((s) => s.value === selectedHolidaySeason)?.label || selectedHolidaySeason;
  const selectedHolidayRules = pricingRules?.[selectedHolidaySeason]?.sunday || [];

  // ---------------------- Loading 保護 ----------------------
  if (!rulesLoaded) {
    return <div className="text-white">載入中...</div>;
  }

  return (
    <div className="text-white max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📅 每日電價設定</h2>

      {/* ⭐ 新增：社區每度電加價 (盈餘) 設定區塊 */}
      <div className="bg-gray-800 p-5 rounded-lg mb-6 flex flex-wrap items-center justify-between border border-gray-700">
        <div>
          <h3 className="text-lg font-bold text-green-400">💰 社區每度電加價 (盈餘) 設定</h3>
          <p className="text-sm text-gray-400 mt-1">設定後，住戶的實際扣款電費將會是：「各時段台電基準單價 + 此加價金額」。</p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <span className="text-xl font-bold">+</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={surcharge}
            onChange={(e) => setSurcharge(e.target.value)}
            className="text-black px-3 py-2 w-24 rounded font-bold text-right text-lg"
          />
          <span className="text-lg">元 / kWh</span>
          <button
            onClick={handleSaveSurcharge}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold ml-2 transition-colors"
          >
            💾 儲存加價
          </button>
        </div>
      </div>

      {/* ⭐ 新增：萬年曆批次設定 */}
      <div className="bg-gray-800 p-5 rounded-lg mb-6 border border-gray-700">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-blue-300">📅 萬年曆批次設定</h3>
          <p className="text-sm text-gray-400 mt-1">
            依照預設的工作日、星期六、星期日規則，自動批次建立指定年份範圍的每日電價資料。
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">起始年份</label>
            <input
              type="number"
              min="2024"
              max="2100"
              value={calendarImportStartYear}
              onChange={(e) => setCalendarImportStartYear(e.target.value)}
              className="text-black px-3 py-2 w-28 rounded"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">結束年份</label>
            <input
              type="number"
              min="2024"
              max="2100"
              value={calendarImportEndYear}
              onChange={(e) => setCalendarImportEndYear(e.target.value)}
              className="text-black px-3 py-2 w-28 rounded"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">匯入模式</label>
            <select
              value={calendarImportMode}
              onChange={(e) => setCalendarImportMode(e.target.value)}
              className="text-black px-3 py-2 rounded min-w-[220px]"
            >
              <option value="fill_missing">只補沒有資料的日期</option>
              <option value="overwrite">覆蓋指定年份範圍</option>
            </select>
          </div>

          <button
            onClick={handleImportCalendarPricing}
            disabled={calendarImportLoading}
            className={`px-4 py-2 rounded font-bold transition-colors ${
              calendarImportLoading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {calendarImportLoading ? "匯入中..." : "📥 開始匯入"}
          </button>
        </div>

        <div className="mt-3 text-sm text-yellow-300">
          ※ 安全預設為「只補沒有資料的日期」。若選擇「覆蓋指定年份範圍」，系統會再次跳出確認視窗。
        </div>

        {calendarImportResult && (
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded p-4">
            <div className="text-green-400 font-bold mb-2">✅ 匯入完成</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">建立天數</div>
                <div className="text-xl font-bold">{calendarImportResult.daysCreated ?? 0}</div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">跳過天數</div>
                <div className="text-xl font-bold">{calendarImportResult.daysSkipped ?? 0}</div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">寫入規則筆數</div>
                <div className="text-xl font-bold">{calendarImportResult.rulesInserted ?? 0}</div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">刪除筆數</div>
                <div className="text-xl font-bold">{calendarImportResult.deletedRows ?? 0}</div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">模式</div>
                <div className="text-base font-bold">
                  {calendarImportResult.mode === "overwrite" ? "覆蓋" : "補缺"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ⭐ 新增：Special Days 多年批次套用 */}
      <div className="bg-gray-800 p-5 rounded-lg mb-6 border border-yellow-700">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-yellow-300">🎌 Special Days 多年批次套用</h3>
          <p className="text-sm text-gray-400 mt-1">
            讀取 holidays/YYYY.json，將 type = holiday 的日期套用為星期日 / 例假日電價規則。
          </p>
        </div>

        <div className="bg-gray-900 border border-yellow-700 rounded p-4 mb-4 text-sm text-yellow-200 leading-6">
          <div className="font-bold mb-1">⚠️ 操作順序提醒</div>
          <div>① 先設定夏月 / 非夏月的平日、星期六、星期日共六組模板</div>
          <div>② 再執行萬年曆批次匯入</div>
          <div>③ 最後執行 Special Days 批次套用</div>
          <div className="mt-2 text-red-300">
            若重新執行萬年曆 overwrite，請務必再次執行 Special Days 批次套用。
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">起始年份</label>
            <input
              type="number"
              min="2024"
              max="2100"
              value={specialDaysStartYear}
              onChange={(e) => setSpecialDaysStartYear(e.target.value)}
              className="text-black px-3 py-2 w-28 rounded"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">結束年份</label>
            <input
              type="number"
              min="2024"
              max="2100"
              value={specialDaysEndYear}
              onChange={(e) => setSpecialDaysEndYear(e.target.value)}
              className="text-black px-3 py-2 w-28 rounded"
            />
          </div>

          <button
            onClick={handleApplySpecialDays}
            disabled={specialDaysLoading}
            className={`px-4 py-2 rounded font-bold transition-colors ${
              specialDaysLoading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-yellow-600 hover:bg-yellow-500"
            }`}
          >
            {specialDaysLoading ? "套用中..." : "🎌 套用 Special Days"}
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-400">
          ※ 此功能固定使用 overwrite 模式，會將 holidays 檔案中的例假日改寫為 label = holiday。
        </div>

        {specialDaysResult && (
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded p-4">
            <div className="text-green-400 font-bold mb-2">✅ Special Days 套用完成</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">套用天數</div>
                <div className="text-xl font-bold">
                  {specialDaysResult.daysApplied ??
                    specialDaysResult.appliedDays ??
                    specialDaysResult.daysUpdated ??
                    0}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">寫入規則筆數</div>
                <div className="text-xl font-bold">
                  {specialDaysResult.rulesInserted ??
                    specialDaysResult.insertedRows ??
                    0}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">刪除筆數</div>
                <div className="text-xl font-bold">
                  {specialDaysResult.deletedRows ?? 0}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">處理年份</div>
                <div className="text-xl font-bold">
                  {specialDaysResult.yearsProcessed ??
                    specialDaysResult.processedYears ??
                    0}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <div className="text-gray-400">模式</div>
                <div className="text-base font-bold">
                  {specialDaysResult.mode === "overwrite" ? "覆蓋" : specialDaysResult.mode || "overwrite"}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm">
              <div className="text-gray-400 mb-1">缺少 holidays 檔案</div>

              {Array.isArray(specialDaysResult.missingHolidayFiles) &&
              specialDaysResult.missingHolidayFiles.length > 0 ? (
                <div className="text-red-300">
                  {specialDaysResult.missingHolidayFiles.join("、")}
                </div>
              ) : Array.isArray(specialDaysResult.missingYears) &&
                specialDaysResult.missingYears.length > 0 ? (
                <div className="text-red-300">
                  {specialDaysResult.missingYears.join("、")}
                </div>
              ) : (
                <div className="text-green-300">無</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 年月選擇 */}
      <div className="mb-4 flex gap-4">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-black px-2 py-1 rounded"
        >
          {Array.from({ length: 12 }, (_, i) => 2024 + i).map((y) => (
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
                  ? "bg-yellow-400 text-black"
                  : d.color === "blue"
                  ? "bg-blue-400 text-black"
                  : d.color === "green"
                  ? "bg-green-400 text-black"
                  : "bg-gray-400 text-black"
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
        <p className="text-green-300 mb-2 font-bold">
          （例假日內容會依日期自動判斷夏月 / 非夏月，並沿用該季節星期日規則）
        </p>
        <p className="text-sm text-gray-300 mb-3">
          目前預覽規則：{selectedHolidaySeasonLabel}・星期日 / 例假日
        </p>

        {selectedHolidayRules.length ? (
          selectedHolidayRules.map((e, idx) => (
            <div key={idx} className="flex gap-3 mb-1">
              <span>{types.find((t) => t.value === e.label)?.label}</span>
              <span>{e.startTime}</span>
              <span>{e.endTime}</span>
              <span>{e.price}</span>
            </div>
          ))
        ) : (
          <div className="text-red-400">
            ⚠️ 尚未設定{selectedHolidaySeasonLabel}星期日 / 例假日規則
          </div>
        )}

        {selectedDate && (
          <button
            onClick={() => handleApplyHoliday(selectedDate)}
            className="mt-4 bg-green-600 hover:bg-green-500 px-3 py-1 rounded transition-colors"
          >
            🔁 套用例假日設定
          </button>
        )}
      </div>
      {/* 預設規則區 */}
      <div className="bg-gray-800 p-4 rounded">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-lg">📋 預設電價規則</h3>
            <p className="text-sm text-gray-400 mt-1">
              請分別設定夏月與非夏月的工作日、星期六、星期日，共六組模板。
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">目前編輯季節</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="text-black px-3 py-2 rounded min-w-[180px]"
            >
              {seasonOptions.map((season) => (
                <option key={season.value} value={season.value}>
                  {season.label}（{season.description}）
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded p-3 mb-5 text-sm text-gray-300">
          目前正在編輯：
          <span className="text-yellow-300 font-bold ml-1">
            {seasonOptions.find((s) => s.value === selectedSeason)?.label}
          </span>
          <span className="ml-2">
            {seasonOptions.find((s) => s.value === selectedSeason)?.description}
          </span>
        </div>

        {/* 工作日 */}
        <div className="mb-6">
          <h4 className="text-yellow-300 font-bold mb-2">
            ◆ {seasonOptions.find((s) => s.value === selectedSeason)?.label}・工作日 (週一～週五)
          </h4>
          {renderRuleEditor(weekdayRules, setWeekdayRules)}
          <button
            onClick={() => handleApplyTemplate("weekday")}
            className="mt-2 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded transition-colors"
          >
            📤 套用目前季節規則至本月工作日
          </button>
        </div>

        {/* 星期六 */}
        <div className="mb-6">
          <h4 className="text-blue-300 font-bold mb-2">
            ◆ {seasonOptions.find((s) => s.value === selectedSeason)?.label}・星期六
          </h4>
          {renderRuleEditor(saturdayRules, setSaturdayRules)}
          <button
            onClick={() => handleApplyTemplate("saturday")}
            className="mt-2 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded transition-colors"
          >
            📤 套用目前季節規則至本月六
          </button>
        </div>

        {/* 星期日 */}
        <div>
          <h4 className="text-green-300 font-bold mb-2">
            ◆ {seasonOptions.find((s) => s.value === selectedSeason)?.label}・星期日 / 例假日
          </h4>
          {renderRuleEditor(sundayRules, setSundayRules)}
          <button
            onClick={() => handleApplyTemplate("sunday")}
            className="mt-2 bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded transition-colors"
          >
            📤 套用目前季節規則至本月日
          </button>
        </div>
      </div>
    </div>
  );
}