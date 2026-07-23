import React, { useEffect, useState } from "react";
import axios from "axios";
import { textOrDash } from "../utils/display";

function TransactionDetailModal({ transactionId, onClose }) {
  const [txn, setTxn] = useState(null);
  const [cost, setCost] = useState({ cost: 0, details: [] });

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    axios
      .get(`${API_BASE}/api/transactions/${transactionId}`)
      .then((res) => setTxn(res.data))
      .catch((err) => console.error("❌ 取得交易明細失敗:", err));

    axios
      .get(`${API_BASE}/api/transactions/${transactionId}/cost`)
      .then((res) => setCost(res.data))
      .catch((err) => console.error("❌ 取得交易費用失敗:", err));
  }, [transactionId]);

  const formatDateTime = (value) => {
    if (!value) return "--";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "--";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const formatNumber = (value, digits = 2) => {
    if (value == null || isNaN(Number(value))) return "--";
    return Number(value).toFixed(digits);
  };

  const formatAmount = (value) => {
    if (value == null || isNaN(Number(value))) return "--";
    return `${Number(value).toFixed(2)} 元`;
  };

  if (!txn) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-6 w-[560px] max-h-[90vh] overflow-y-auto shadow-lg">
        <h3 className="text-lg font-semibold mb-4">交易明細</h3>

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="font-medium py-1 w-32 align-top">交易編號：</td>
              <td className="py-1">{txn.transactionId ?? "--"}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">充電樁：</td>
              <td className="py-1">{txn.chargePointId ?? "--"}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">樓號：</td>
              <td className="py-1">{textOrDash(txn.floorNo)}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">車位號碼：</td>
              <td className="py-1">{textOrDash(txn.parkingSpaceNo)}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">卡號：</td>
              <td className="py-1">{textOrDash(txn.cardNumber || txn.idTag)}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">開始時間：</td>
              <td className="py-1">{formatDateTime(txn.startTimestamp)}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">結束時間：</td>
              <td className="py-1">{formatDateTime(txn.stopTimestamp)}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">起始電錶：</td>
              <td className="py-1">{txn.meterStart != null ? txn.meterStart : "--"}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">結束電錶：</td>
              <td className="py-1">{txn.meterStop != null ? txn.meterStop : "--"}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">耗電量：</td>
              <td className="py-1">
                {txn.energyKwh != null
                  ? `${formatNumber(txn.energyKwh)} kWh`
                  : txn.meterStop != null && txn.meterStart != null
                  ? `${formatNumber((txn.meterStop - txn.meterStart) / 1000)} kWh`
                  : "--"}
              </td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">總金額：</td>
              <td className="py-1 font-bold">{formatAmount(cost.cost)}</td>
            </tr>

            {/* ⭐ 新增：本次社區盈餘 */}
            <tr>
              <td className="font-medium py-1 w-32 align-top">本次社區盈餘：</td>
              <td className="py-1 text-green-600 dark:text-green-400 font-bold">
                {txn.surplusAmount != null ? formatAmount(txn.surplusAmount) : "--"}
              </td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">剩餘儲值金額：</td>
              <td className="py-1">{formatAmount(cost.remainingBalance)}</td>
            </tr>

            <tr>
              <td className="font-medium py-1 w-32 align-top">計費明細：</td>
              <td className="py-1">
                <ul className="max-h-40 overflow-y-auto text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                  {Array.isArray(cost.details) && cost.details.length > 0 ? (
                    cost.details.map((d, idx) => (
                      <li key={idx} className="mb-1 border-b border-gray-200 dark:border-gray-600 pb-1 last:border-0 last:mb-0">
                        <div className="text-gray-600 dark:text-gray-300">
                          {d.from || "--"} ~ {d.to || "--"}
                        </div>
                        <div>
                          {d.kWh ?? d.kwh ?? "--"} kWh × {d.price ?? "--"} 元 = {" "}
                          <span className="font-semibold">{d.cost ?? 0} 元</span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li>無法讀取明細資料</li>
                  )}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailModal;
