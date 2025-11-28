import React, { useState, useRef, useEffect } from "react";

const GROUPS = [
  { label: "凌晨", range: [0, 5] },
  { label: "上午", range: [6, 11] },
  { label: "下午", range: [12, 17] },
  { label: "晚上", range: [18, 23] },
];

// 產生 15 分鐘時間
function generateTimes() {
  const result = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      result.push(`${hh}:${mm}`);
    }
  }
  return result;
}

const TIMES = generateTimes();

export default function TimeSelect15({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 點擊外部關閉 Popover
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = value || "--:--";

  return (
    <div className="relative inline-block" ref={ref}>
      {/* 顯示目前時間（可點擊） */}
      <button
        className="text-black px-2 py-1 bg-white rounded border"
        onClick={() => setOpen(!open)}
      >
        {displayValue}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 bg-white text-black shadow-lg rounded p-3 mt-1 w-64 max-h-80 overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="font-bold text-gray-700 mb-1">{group.label}</div>
              <div className="grid grid-cols-4 gap-1">
                {TIMES.filter((t) => {
                  const hour = Number(t.split(":")[0]);
                  return hour >= group.range[0] && hour <= group.range[1];
                }).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onChange(t);
                      setOpen(false);
                    }}
                    className={`px-2 py-1 rounded text-sm border ${
                      t === value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
