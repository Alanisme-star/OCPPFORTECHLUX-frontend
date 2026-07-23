import React, { useEffect, useMemo, useState } from "react";
import axios from "../axiosInstance";
import { householdLabel } from "../utils/display";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    summary: {},
    chargingNow: [],
    alerts: [],
    generatedAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setErrorMessage("");

      console.log("📡 發出社區管委會 Dashboard 請求...");

      try {
        const response = await axios.get("/api/dashboard/community", {
          timeout: 30000,
        });

        console.log("✅ /api/dashboard/community 結果:", response.data);

        setDashboardData({
          summary: response.data?.summary || {},
          chargingNow: Array.isArray(response.data?.chargingNow)
            ? response.data.chargingNow
            : [],
          alerts: Array.isArray(response.data?.alerts)
            ? response.data.alerts
            : [],
          generatedAt: response.data?.generatedAt || "",
        });
      } catch (err) {
        console.error("❌ 社區管委會 Dashboard 資料讀取失敗：", err);

        setErrorMessage(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "社區管委會 Dashboard 資料讀取失敗"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const summary = dashboardData.summary || {};
  const chargingNow = dashboardData.chargingNow || [];
  const alerts = dashboardData.alerts || [];

  const contractUsagePercent = useMemo(() => {
    const currentPower = Number(summary.currentTotalPowerKw || 0);
    const contractKw = Number(summary.contractKw || 0);

    if (!contractKw || contractKw <= 0) {
      return 0;
    }

    return Math.min((currentPower / contractKw) * 100, 100);
  }, [summary.currentTotalPowerKw, summary.contractKw]);

  const formatNumber = (value, digits = 2) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return "0.00";
    }

    return number.toFixed(digits);
  };

  const formatInteger = (value) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return String(Math.round(number));
  };

  const formatCurrency = (value) => {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("zh-TW", {
      maximumFractionDigits: 0,
    });
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

  const getAlertClass = (level) => {
    const text = String(level || "").toLowerCase();

    if (text === "danger" || text === "error") {
      return "border-red-700 bg-red-950 text-red-200";
    }

    if (text === "warning") {
      return "border-yellow-700 bg-yellow-950 text-yellow-200";
    }

    if (text === "info") {
      return "border-blue-700 bg-blue-950 text-blue-200";
    }

    return "border-gray-700 bg-gray-900 text-gray-200";
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
          <h2 className="text-2xl font-bold">管委會總覽 Dashboard</h2>
          <p className="mt-1 text-sm text-gray-400">
            社區充電系統總覽：充電樁狀態、即時負載、本月用電、本月收入與提醒事項。
          </p>
        </div>

        <div className="text-sm text-gray-400">
          資料產生時間：{formatDateTime(dashboardData.generatedAt)}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-gray-200">
          ⏳ 社區總覽資料載入中，請稍候...
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-sm text-red-200">
              ❌ {errorMessage}
            </div>
          )}


          {/* 第一排：即時狀態 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="社區充電樁總數"
              value={formatInteger(summary.totalChargePoints)}
              unit="座"
              description={`Available：${formatInteger(summary.availableCount)}，Preparing：${formatInteger(
                summary.preparingCount
              )}`}
            />

            <StatCard
              title="目前充電中"
              value={formatInteger(summary.chargingCount)}
              unit="座"
              description={`離線 / 異常提醒：${formatInteger(summary.offlineCount)} 座`}
            />

            <StatCard
              title="目前總功率"
              value={formatNumber(summary.currentTotalPowerKw)}
              unit="kW"
              description={`社區契約容量：${formatNumber(summary.contractKw)} kW`}
            />
          </div>

          {/* 第二排：本月營運統計 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="本月用電量"
              value={formatNumber(summary.monthlyEnergyKwh)}
              unit="kWh"
              description={`本月交易：${formatInteger(summary.monthlyTransactions)} 筆`}
            />

            <StatCard
              title="本月充電總收費"
              value={formatCurrency(summary.monthlyRevenue)}
              unit="元"
              description="依本月已完成交易金額統計"
            />

            {/* ⭐ 新增：本月社區盈餘卡片 */}
            <div className="rounded-xl border border-green-700 bg-green-900/20 p-4 shadow">
              <div className="text-sm text-green-400 font-bold">本月社區總盈餘</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold text-green-300">
                  {formatCurrency(summary.monthlySurplus)}
                </span>
                <span className="pb-1 text-sm text-green-500">元</span>
              </div>
              <div className="mt-2 text-xs text-green-500">扣除基礎電價後的社區額外收入</div>
            </div>

            <StatCard
              title="本月有使用充電樁"
              value={formatInteger(summary.activeChargePointCount)}
              unit="座"
              description="依本月交易紀錄統計"
            />

            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 shadow">
              <div className="text-sm text-gray-400">契約容量使用率</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold text-white">
                  {formatNumber(contractUsagePercent, 1)}
                </span>
                <span className="pb-1 text-sm text-gray-400">%</span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${contractUsagePercent}%` }}
                />
              </div>

              <div className="mt-2 text-xs text-gray-500">
                目前 {formatNumber(summary.currentTotalPowerKw)} kW / 契約{" "}
                {formatNumber(summary.contractKw)} kW
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 xl:col-span-1">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-lg">⚠️ 系統提醒</h3>
                <span className="text-xs text-gray-400">提醒數：{alerts.length}</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div
                        key={`${alert.type || "alert"}-${alert.chargePointId || index}`}
                        className={`rounded-lg border p-3 text-sm ${getAlertClass(alert.level)}`}
                      >
                        <div className="font-semibold">
                          {alert.message || "系統提醒"}
                        </div>

                        {(alert.chargePointId || alert.floorNo || alert.parkingSpaceNo) && (
                          <div className="mt-2 text-xs opacity-80">
                            {alert.chargePointId && (
                              <div>充電樁：{alert.chargePointId}</div>
                            )}
                            {(alert.floorNo || alert.parkingSpaceNo) && (
                              <div>
                                樓號／車位：
                                {householdLabel([alert.floorNo, alert.parkingSpaceNo], "／")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm text-green-300">
                    目前沒有系統提醒。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-lg">🔌 目前充電中</h3>
                <span className="text-xs text-gray-400">
                  充電中筆數：{chargingNow.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-700 text-left text-gray-200">
                      <th className="p-3">充電樁</th>
                      <th className="p-3">樓號／車位</th>
                      <th className="p-3">狀態</th>
                      <th className="p-3 text-right">目前功率</th>
                      <th className="p-3 text-right">累積度數</th>
                      <th className="p-3">開始時間</th>
                    </tr>
                  </thead>

                  <tbody>
                    {chargingNow.length > 0 ? (
                      chargingNow.map((item, index) => (
                        <tr
                          key={`${item.chargePointId || "cp"}-${item.transactionId || index}`}
                          className="border-b border-gray-700 hover:bg-gray-700/40"
                        >
                          <td className="p-3 font-semibold text-white">
                            {item.chargePointId || "-"}
                          </td>

                          <td className="p-3 text-gray-200">
                            {householdLabel([item.floorNo, item.parkingSpaceNo], "／", "-")}
                          </td>

                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                item.status
                              )}`}
                            >
                              {item.status || "-"}
                            </span>
                          </td>

                          <td className="p-3 text-right text-gray-200">
                            {formatNumber(item.currentPowerKw)} kW
                          </td>

                          <td className="p-3 text-right text-gray-200">
                            {formatNumber(item.energyKwh)} kWh
                          </td>

                          <td className="p-3 text-gray-300">
                            {formatDateTime(item.startTimestamp)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-center text-yellow-300" colSpan="6">
                          目前沒有正在充電的交易。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-lg">📌 社區充電摘要</h3>
              <span className="text-xs text-gray-400">
                前端資料來源：/api/dashboard/community
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                <div className="text-gray-400">充電樁狀態</div>
                <div className="mt-2 text-gray-200">
                  可用 {formatInteger(summary.availableCount)} 座、準備中{" "}
                  {formatInteger(summary.preparingCount)} 座、充電中{" "}
                  {formatInteger(summary.chargingCount)} 座
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                <div className="text-gray-400">本月營運</div>
                <div className="mt-2 text-gray-200">
                  {formatInteger(summary.monthlyTransactions)} 筆交易，
                  總收費 {formatCurrency(summary.monthlyRevenue)} 元
                  <span className="text-green-400 ml-1">
                    (含盈餘 {formatCurrency(summary.monthlySurplus)} 元)
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                <div className="text-gray-400">提醒說明</div>
                <div className="mt-2 text-gray-200">
                  alerts 只作為管委會提醒顯示，不直接混入異常數統計。
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
