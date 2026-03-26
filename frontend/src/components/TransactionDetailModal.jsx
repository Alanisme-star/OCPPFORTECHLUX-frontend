import React, { useEffect, useState } from "react";
import axios from "axios";

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

  if (!txn) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-lg">
        <h3 className="text-lg font-semibold mb-4">交易明細</h3>
        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="font-medium py-1">交易編號：</td>
              <td>{txn.transactionId}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">充電樁：</td>
              <td>{txn.chargePointId}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">卡號：</td>
              <td>{txn.cardNumber || txn.idTag || "--"}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">開始時間：</td>
              <td>{txn.startTimestamp}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">結束時間：</td>
              <td>{txn.stopTimestamp || "--"}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">起始電錶：</td>
              <td>{txn.meterStart != null ? txn.meterStart : "--"}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">結束電錶：</td>
              <td>{txn.meterStop != null ? txn.meterStop : "--"}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">耗電量：</td>
              <td>
                {txn.energyKwh != null
                  ? `${Number(txn.energyKwh).toFixed(2)} kWh`
                  : txn.meterStop != null && txn.meterStart != null
                  ? `${((txn.meterStop - txn.meterStart) / 1000).toFixed(2)} kWh`
                  : "--"}
              </td>
            </tr>
            <tr>
              <td className="font-medium py-1">總金額：</td>
              <td>${cost.cost ?? 0}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">剩餘儲值金額：</td>
              <td>
                {cost.remainingBalance != null ? `$${cost.remainingBalance}` : "--"}
              </td>
           </tr>
           <tr>
             <td className="font-medium py-1 align-top">計費明細：</td>
             <td>
                <ul className="max-h-40 overflow-y-auto text-sm">
                  {Array.isArray(cost.details) && cost.details.length > 0 ? (
                    cost.details.map((d, idx) => (
                      <li key={idx}>
                        ▸ {d.from || "--"} ~ {d.to || "--"} | {d.kWh ?? d.kwh ?? "--"} kWh × {d.price ?? "--"} = ${d.cost ?? 0}
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
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailModal;
