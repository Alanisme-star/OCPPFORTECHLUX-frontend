import React, { useCallback, useEffect, useState } from "react";
import axios from "../axiosInstance";
import CardEnrollmentModal from "../components/CardEnrollmentModal";
import EditCardAccessModal from "../components/EditCardAccessModal";
import { householdLabel, textOrDash } from "../utils/display";

const emptyAccount = { floorNo: "", parkingSpaceNo: "", balance: "0" };

function accountLabel(account) {
  return householdLabel(
    [account.floorNo ?? account.floor_no, account.parkingSpaceNo ?? account.parking_space_no],
    "／",
    "待補資料"
  );
}

function money(value) {
  return Number(value || 0).toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function Cards() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessCard, setAccessCard] = useState(null);
  const [history, setHistory] = useState(null);
  const [enrollmentAccount, setEnrollmentAccount] = useState(null);

  const loadAccounts = useCallback(async () => {
    setError("");
    try {
      const { data } = await axios.get("/api/household-accounts");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const createAccount = async (event) => {
    event.preventDefault();
    try {
      await axios.post("/api/household-accounts", {
        floorNo: form.floorNo.trim(),
        parkingSpaceNo: form.parkingSpaceNo.trim(),
        balance: Number(form.balance || 0),
      });
      setForm(emptyAccount);
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const editAccount = async (account) => {
    const floorNo = window.prompt("樓號", account.floorNo ?? account.floor_no ?? "");
    if (floorNo === null) return;
    const parkingSpaceNo = window.prompt("車位號碼", account.parkingSpaceNo ?? account.parking_space_no ?? "");
    if (parkingSpaceNo === null) return;
    const status = window.prompt("帳戶狀態（active / disabled）", account.status);
    if (status === null) return;
    try {
      await axios.put(`/api/household-accounts/${account.account_id}`, {
        floorNo,
        parkingSpaceNo,
        status,
      });
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const topup = async (account) => {
    const raw = window.prompt(`為 ${accountLabel(account)} 儲值（增量金額）`, "1000");
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("儲值金額必須大於 0");
      return;
    }
    try {
      await axios.post(`/api/household-accounts/${account.account_id}/topup`, { amount });
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const addCard = async (account) => {
    const cardId = window.prompt("RFID 卡號");
    if (!cardId) return;
    try {
      await axios.post(`/api/household-accounts/${account.account_id}/cards`, {
        card_id: cardId.trim(),
      });
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const disableCard = async (card) => {
    if (!window.confirm(`停用卡片 ${card.card_id}？共同帳戶內其他卡片不受影響。`)) return;
    try {
      await axios.delete(`/api/account-cards/${encodeURIComponent(card.card_id)}`);
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const showHistory = async (card) => {
    try {
      const { data } = await axios.get(`/api/cards/${encodeURIComponent(card.card_id)}/history`);
      setHistory({ card, items: data.history || [] });
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <div>
        <h1 className="text-2xl font-bold">住戶帳戶與 RFID 卡片</h1>
        <p className="mt-1 text-sm text-gray-500">同一樓號與車位的多張 RFID 卡共用一筆帳戶餘額。</p>
        <p className="mt-1 text-sm text-gray-500">任一 RFID 卡產生正式交易通知時，將通知本住戶所有已綁定且啟用的 LINE 帳號。</p>
      </div>

      <form onSubmit={createAccount} className="grid gap-3 rounded-xl border p-4 md:grid-cols-4 dark:border-gray-700">
        <input required className="rounded border px-3 py-2 dark:bg-gray-800" placeholder="樓號，例如 5F" value={form.floorNo} onChange={(e) => setForm({ ...form, floorNo: e.target.value })} />
        <input required className="rounded border px-3 py-2 dark:bg-gray-800" placeholder="車位號碼，例如 B12" value={form.parkingSpaceNo} onChange={(e) => setForm({ ...form, parkingSpaceNo: e.target.value })} />
        <input type="number" min="0" step="0.01" className="rounded border px-3 py-2 dark:bg-gray-800" placeholder="開戶餘額" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
        <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">新增住戶帳戶</button>
      </form>

      {error && <div className="rounded bg-red-50 p-3 text-red-700">{error}</div>}
      {loading && <div className="text-gray-500">載入住戶帳戶中…</div>}
      {!loading && accounts.length === 0 && <div className="rounded border p-8 text-center text-gray-500">尚無住戶帳戶。既有卡片請先執行共同帳戶 migration。</div>}

      <div className="space-y-4">
        {accounts.map((account) => (
          <section key={account.account_id} className="overflow-hidden rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <header className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-4 dark:bg-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{accountLabel(account)}</h2>
                  <span className={`rounded px-2 py-0.5 text-xs ${account.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{account.status}</span>
                </div>
                <div className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">共同餘額：{money(account.balance)} 元</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => topup(account)} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white">帳戶儲值</button>
                <button onClick={() => addCard(account)} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">手動新增卡</button>
                <button onClick={() => setEnrollmentAccount(account)} className="rounded bg-violet-600 px-3 py-2 text-sm text-white">感應新增卡</button>
                <button onClick={() => editAccount(account)} className="rounded border px-3 py-2 text-sm">編輯帳戶</button>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-left text-gray-500 dark:border-gray-700">
                  <tr><th className="p-3">RFID 卡號</th><th className="p-3">卡片狀態</th><th className="p-3">OCPP 狀態</th><th className="p-3 text-right">操作</th></tr>
                </thead>
                <tbody>
                  {(account.cards || []).map((card) => (
                    <tr key={card.card_id} className="border-b last:border-0 dark:border-gray-800">
                      <td className="p-3 font-mono">{textOrDash(card.card_id)}</td>
                      <td className="p-3">{card.status}</td>
                      <td className="p-3">{card.id_tag_status || "--"}</td>
                      <td className="p-3"><div className="flex justify-end gap-2">
                        <button onClick={() => setAccessCard(card.card_id)} className="text-blue-600">白名單</button>
                        <button onClick={() => showHistory(card)} className="text-slate-600 dark:text-slate-300">歷史</button>
                        {card.status === "active" && <button onClick={() => disableCard(card)} className="text-red-600">停用</button>}
                      </div></td>
                    </tr>
                  ))}
                  {(account.cards || []).length === 0 && <tr><td colSpan="4" className="p-5 text-center text-gray-400">此帳戶尚未綁定卡片</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {accessCard && <EditCardAccessModal idTag={accessCard} onClose={() => { setAccessCard(null); loadAccounts(); }} />}
      {enrollmentAccount && <CardEnrollmentModal accountId={enrollmentAccount.account_id} floorNo={enrollmentAccount.floorNo ?? enrollmentAccount.floor_no} parkingSpaceNo={enrollmentAccount.parkingSpaceNo ?? enrollmentAccount.parking_space_no} onClose={() => setEnrollmentAccount(null)} onConfirmed={() => { setEnrollmentAccount(null); loadAccounts(); }} />}
      {history && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 dark:bg-gray-900"><div className="mb-4 flex justify-between"><h2 className="text-lg font-semibold">卡片歷史：{history.card.card_id}</h2><button onClick={() => setHistory(null)}>關閉</button></div>{history.items.length === 0 ? <p className="text-gray-500">沒有交易紀錄</p> : <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">交易</th><th className="p-2 text-left">時間</th><th className="p-2 text-right">金額</th></tr></thead><tbody>{history.items.map((item) => <tr key={item.transaction_id} className="border-t dark:border-gray-700"><td className="p-2">{item.transaction_id}</td><td className="p-2">{item.paid_at || item.stop_timestamp || "--"}</td><td className="p-2 text-right">{money(item.amount)} 元</td></tr>)}</tbody></table>}</div></div>}
    </div>
  );
}
