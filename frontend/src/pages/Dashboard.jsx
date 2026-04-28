import React, { useEffect, useMemo, useState } from "react";
import axios from "../axiosInstance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const lineColors = [
  "#4fd1c5",
  "#63b3ed",
  "#f6ad55",
  "#fc8181",
  "#9f7aea",
  "#68d391",
  "#f687b3",
  "#a0aec0",
];

const Dashboard = () => {
  const [summary, setSummary] = useState([]);
  const [status, setStatus] = useState({});
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const end = endDate.toISOString().slice(0, 10);
      const start = startDate.toISOString().slice(0, 10);

      setLoading(true);
      setErrorMessage("");

      console.log("📡 發出 dashboard 請求...", { start, end });

      try {
        const results = await Promise.allSettled([
          axios.get(`/api/dashboard/trend?group_by=day&start=${start}&end=${end}`, {
            timeout: 30000,
          }),
          axios.get("/api/status", {
            timeout: 30000,
          }),
          axios.get(`/api/summary/daily-by-chargepoint-range?start=${start}&end=${end}`, {
            timeout: 30000,
          }),
        ]);

        const [trendResult, statusResult, summaryResult] = results;

        const failedApis = [];

        if (trendResult.status === "fulfilled") {
          console.log("✅ /api/dashboard/trend 結果:", trendResult.value.data);
          setTrend(Array.isArray(trendResult.value.data) ? trendResult.value.data : []);
        } else {
          console.error("❌ /api/dashboard/trend 失敗：", trendResult.reason);
          setTrend([]);
          failedApis.push("/api/dashboard/trend");
        }

        if (statusResult.status === "fulfilled") {
          console.log("✅ /api/status 結果:", statusResult.value.data);
          setStatus(statusResult.value.data || {});
        } else {
          console.error("❌ /api/status 失敗：", statusResult.reason);
          setStatus({});
          failedApis.push("/api/status");
        }

        if (summaryResult.status === "fulfilled") {
          console.log("✅ /api/summary/daily-by-chargepoint-range 結果:", summaryResult.value.data);
          setSummary(Array.isArray(summaryResult.value.data) ? summaryResult.value.data : []);
        } else {
          console.error("❌ /api/summary/daily-by-chargepoint-range 失敗：", summaryResult.reason);
          setSummary([]);
          failedApis.push("/api/summary/daily-by-chargepoint-range");
        }

        if (failedApis.length > 0) {
          setErrorMessage(`部分 Dashboard API 讀取失敗：${failedApis.join("、")}`);
        }
      } catch (err) {
        console.error("❌ 儀表板資料讀取失敗：", err);
        setErrorMessage(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "儀表板資料讀取失敗"
        );
      } finally {
        setLoading(false);
      }

    };

    fetchAll();
  }, []);

  const cpList = useMemo(() => {
    if (!Array.isArray(trend) || trend.length === 0 || typeof trend[0] !== "object") {
      return [];
    }

    return Object.keys(trend[0]).filter((key) => key !== "period" && typeof key === "string");
  }, [trend]);

  const statusEntries = useMemo(() => {
    if (!status || typeof status !== "object") {
      return [];
    }

    return Object.entries(status).map(([cpId, value]) => {
      const normalizedStatus =
        value?.status ||
        value?.connectorStatus ||
        value?.connector_status ||
        value?.state ||
        "Unknown";

      const powerKw =
        Number(value?.power_kw) ||
        Number(value?.currentPowerKw) ||
        Number(value?.current_power_kw) ||
        Number(value?.measured_power_kw) ||
        Number(value?.meterPowerKw) ||
        Number(value?.power) ||
        0;

      const updatedAt =
        value?.updated_at ||
        value?.updatedAt ||
        value?.last_seen ||
        value?.lastSeen ||
        value?.timestamp ||
        "";

      return {
        cpId,
        status: normalizedStatus,
        powerKw,
        updatedAt,
      };
    });
  }, [status]);

  const dashboardStats = useMemo(() => {
    const totalEnergyKwh = summary.reduce((sum, row) => {
      const value = Number(row?.totalEnergy || 0);
      return sum + value / 1000;
    }, 0);

    const totalTransactions = summary.reduce((sum, row) => {
      return sum + Number(row?.transactionCount || 0);
    }, 0);

    const totalChargePoints = statusEntries.length;

    const chargingCount = statusEntries.filter((item) => {
      return String(item.status).toLowerCase() === "charging";
    }).length;

    const availableCount = statusEntries.filter((item) => {
      return String(item.status).toLowerCase() === "available";
    }).length;

    const preparingCount = statusEntries.filter((item) => {
      return String(item.status).toLowerCase() === "preparing";
    }).length;

    const faultOrOfflineCount = statusEntries.filter((item) => {
      const text = String(item.status).toLowerCase();
      return text.includes("fault") || text.includes("offline") || text.includes("unavailable");
    }).length;

    const currentTotalPowerKw = statusEntries.reduce((sum, item) => {
      return sum + Number(item.powerKw || 0);
    }, 0);

    return {
      totalEnergyKwh,
      totalTransactions,
      totalChargePoints,
      chargingCount,
      availableCount,
      preparingCount,
      faultOrOfflineCount,
      currentTotalPowerKw,
    };
  }, [summary, statusEntries]);

  const recentSummary = useMemo(() => {
    if (!Array.isArray(summary)) {
      return [];
    }

    return [...summary].slice(-7).reverse();
  }, [summary]);

  const formatNumber = (value, digits = 2) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return "0.00";
    }

    return number.toFixed(digits);
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const text = String(value);

    if (text.includes("T")) {
      return text.replace("T", " ").replace("Z", "").slice(0, 19);
    }

    return text.slice(0, 19);
  };

  const getStatusBadgeClass = (value) => {
    const text = String(value || "").toLowerCase();

    if (text === "charging") {
      return "bg-green-900 text-green-300 border-green-700";
    }

    if (text === "available") {
      return "bg-blue-900 text-blue-300 border-blue-700";
    }

    if (text === "preparing") {
      return "bg-yellow-900 text-yellow-300 border-yellow-700";
    }

    if (text.includes("fault") || text.includes("offline") || text.includes("unavailable")) {
      return "bg-red-900 text-red-300 border-red-700";
    }

    return "bg-gray-700 text-gray-200 border-gray-600";
  };

  const StatCard = ({ title, value, unit, description }) => {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 shadow">
        <div className="text-sm text-gray-400">{title}</div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          {unit && <span className="pb-1 text-sm text-gray-400">{unit}</span>}
        </div>
        {description && <div className="mt-2 text-xs text-gray-500">{description}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">儀表板 Dashboard</h2>
          <p className="mt-1 text-sm text-gray-400">
            OCPP 能源管理總覽：用電量、交易筆數、充電樁狀態與近 30 日趨勢。
          </p>
        </div>

        <div className="text-sm text-gray-400">
          資料區間：近 30 日
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-gray-200">
          ⏳ 資料載入中，請稍候...
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-sm text-red-200">
              ❌ {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="近 30 日總用電"
              value={formatNumber(dashboardStats.totalEnergyKwh)}
              unit="kWh"
              description="依每日用電統計資料加總"
            />

            <StatCard
              title="近 30 日交易筆數"
              value={dashboardStats.totalTransactions}
              unit="筆"
              description="依每日交易筆數加總"
            />

            <StatCard
              title="目前充電樁數"
              value={dashboardStats.totalChargePoints}
              unit="座"
              description={`Available：${dashboardStats.availableCount}，Preparing：${dashboardStats.preparingCount}`}
            />

            <StatCard
              title="目前充電中"
              value={dashboardStats.chargingCount}
              unit="座"
              description={`異常 / 離線：${dashboardStats.faultOrOfflineCount}，目前功率：${formatNumber(
                dashboardStats.currentTotalPowerKw
              )} kW`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 xl:col-span-1">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-lg">📊 最近 7 日用電統計</h3>
                <span className="text-xs text-gray-400">依日期倒序</span>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {recentSummary.length > 0 ? (
                  <div className="space-y-2">
                    {recentSummary.map((row) => (
                      <div
                        key={row.period}
                        className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-gray-100">{row.period}</div>
                          <div className="text-right text-sm text-gray-300">
                            {formatNumber(Number(row.totalEnergy || 0) / 1000)} kWh
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          交易筆數：{row.transactionCount ?? 0} 筆
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm text-yellow-300">
                    目前沒有每日用電統計資料。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-lg">📈 多樁近 30 日用電趨勢圖</h3>
                <span className="text-xs text-gray-400">
                  充電樁數：{cpList.length}
                </span>
              </div>

              {trend.length > 0 && cpList.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis unit="kWh" />
                    <Tooltip />
                    <Legend />
                    {cpList.map((cp, index) => (
                      <Line
                        key={`line-${cp}`}
                        type="monotone"
                        dataKey={cp}
                        stroke={lineColors[index % lineColors.length]}
                        name={cp}
                        dot={false}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-sm text-yellow-300">
                  目前沒有足夠資料可顯示趨勢圖。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">🔌 即時充電樁狀態</h3>
              <span className="text-xs text-gray-400">
                目前資料筆數：{statusEntries.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-700 text-left text-gray-200">
                    <th className="p-3">充電樁</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3 text-right">目前功率</th>
                    <th className="p-3">最後更新</th>
                  </tr>
                </thead>

                <tbody>
                  {statusEntries.length > 0 ? (
                    statusEntries.map((item) => (
                      <tr key={item.cpId} className="border-b border-gray-700 hover:bg-gray-700/40">
                        <td className="p-3 font-semibold text-white">{item.cpId}</td>

                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="p-3 text-right text-gray-200">
                          {formatNumber(item.powerKw)} kW
                        </td>

                        <td className="p-3 text-gray-300">
                          {formatDateTime(item.updatedAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-4 text-center text-yellow-300" colSpan="4">
                        目前沒有即時充電樁狀態資料。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;