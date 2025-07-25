import React, { useEffect, useState } from "react";
import axios from "axios";

function TransactionDetailModal({ transactionId, onClose }) {
  const [txn, setTxn] = useState(null);
  const [cost, setCost] = useState({ cost: 0, details: [] });

  useEffect(() => {
    axios.get(`/api/transactions/${transactionId}`).then((res) => {
      setTxn(res.data);
    });
    axios.get(`/api/transactions/${transactionId}/cost`).then((res) => {
      setCost(res.data);
    });
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
              <td>{txn.idTag}</td>
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
              <td>{txn.meterStart || "--"}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">結束電錶：</td>
              <td>{txn.meterStop || "--"}</td>
            </tr>
            <tr>
              <td className="font-medium py-1">耗電量：</td>
              <td>
                {txn.meterStop && txn.meterStart
                  ? ((txn.meterStop - txn.meterStart) / 1000).toFixed(2) + " kWh"
                  : "--"}
              </td>
            </tr>
            <tr>
              <td className="font-medium py-1">累計金額：</td>
              <td>${cost.cost}</td>
            </tr>
            <tr>
              <td className="font-medium py-1 align-top">計費明細：</td>
              <td>
                <ul className="max-h-40 overflow-y-auto text-sm">
                  {Array.isArray(cost.details) ? (
                    cost.details.map((d, idx) => (
                      <li key={idx}>
                        ▸ {d.from} ~ {d.to} | {d.kWh} kWh × {d.price} = ${d.cost}
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
