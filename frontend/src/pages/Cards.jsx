import React, { useCallback, useEffect, useState } from "react";
import axios from "../axiosInstance";
import CardEnrollmentModal from "../components/CardEnrollmentModal";
import EditCardAccessModal from "../components/EditCardAccessModal";
import { householdLabel, textOrDash } from "../utils/display";

const emptyAccount = {
  doorNo: "",
  floorNo: "",
  parkingSpaceNo: "",
  firstCardHolderName: "",
  balance: "0",
};

function accountLabel(account) {
  return householdLabel(
    [
      account.doorNo ?? account.door_no,
      account.floorNo ?? account.floor_no,
      account.parkingSpaceNo ?? account.parking_space_no,
    ],
    "／",
    "待補資料"
  );
}

function cardsFor(account) {
  return Array.isArray(account.cards) ? account.cards : [];
}

function holderNameForCard(card) {
  return String(card.cardHolderName ?? card.card_holder_name ?? "").trim();
}

function configuredFirstHolderName(account) {
  const apiName = String(
    account.firstCardHolderName ?? account.first_card_holder_name ?? ""
  ).trim();
  if (apiName) return apiName;
  return cardsFor(account).map(holderNameForCard).find(Boolean) || "";
}

function money(value) {
  return Number(value || 0).toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function moneyOrDash(value) {
  return value === null || value === undefined ? "--" : money(value);
}

function taipeiTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function signedMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "--";
  return `${amount > 0 ? "+" : ""}${money(amount)}`;
}

function topupBlockedReason(account, card) {
  if (account.status !== "active") return "住戶帳戶已停用，無法加值";
  if (card.status !== "active") return "卡片已停用，無法加值";
  return "";
}

export default function Cards() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessCard, setAccessCard] = useState(null);
  const [history, setHistory] = useState(null);
  const [enrollmentAccount, setEnrollmentAccount] = useState(null);
  const [pendingHolderNames, setPendingHolderNames] = useState({});
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [topupStates, setTopupStates] = useState({});

  const pendingHolderName = (account) =>
    String(pendingHolderNames[account.account_id] ?? "").trim();

  const firstHolderName = (account) =>
    configuredFirstHolderName(account) || pendingHolderName(account);

  const clearPendingHolderName = (accountId) => {
    setPendingHolderNames((current) => {
      if (!(accountId in current)) return current;
      const next = { ...current };
      delete next[accountId];
      return next;
    });
  };

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
    if (creatingAccount) return;
    const pendingName = form.firstCardHolderName.trim();
    setCreatingAccount(true);
    try {
      const { data } = await axios.post("/api/household-accounts", {
        doorNo: form.doorNo.trim(),
        floorNo: form.floorNo.trim(),
        parkingSpaceNo: form.parkingSpaceNo.trim(),
        balance: Number(form.balance || 0),
      });
      const accountId = data?.account_id ?? data?.accountId;
      if (pendingName && accountId != null) {
        setPendingHolderNames((current) => ({
          ...current,
          [accountId]: pendingName,
        }));
      }
      setForm(emptyAccount);
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setCreatingAccount(false);
    }
  };

  const editAccount = async (account) => {
    const doorNo = window.prompt(
      "門牌號碼",
      account.doorNo ?? account.door_no ?? ""
    );
    if (doorNo === null) return;
    const floorNo = window.prompt("樓號", account.floorNo ?? account.floor_no ?? "");
    if (floorNo === null) return;
    const parkingSpaceNo = window.prompt("車位號碼", account.parkingSpaceNo ?? account.parking_space_no ?? "");
    if (parkingSpaceNo === null) return;
    const status = window.prompt("帳戶狀態（active / disabled）", account.status);
    if (status === null) return;
    try {
      await axios.put(`/api/household-accounts/${account.account_id}`, {
        doorNo: doorNo.trim(),
        floorNo: floorNo.trim(),
        parkingSpaceNo: parkingSpaceNo.trim(),
        status: status.trim(),
      });
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const setCardTopupState = (cardId, nextState) => {
    setTopupStates((current) => ({ ...current, [cardId]: nextState }));
  };

  const topup = async (account, card) => {
    if (topupStates[card.card_id]?.status === "loading") return;
    const blockedReason = topupBlockedReason(account, card);
    if (blockedReason) {
      setCardTopupState(card.card_id, {
        status: "error",
        message: blockedReason,
      });
      return;
    }
    const raw = window.prompt(
      `以卡片 ${card.card_id} 為 ${accountLabel(account)} 加值`,
      "1000"
    );
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCardTopupState(card.card_id, {
        status: "error",
        message: "加值金額必須大於 0",
      });
      return;
    }
    setCardTopupState(card.card_id, {
      status: "loading",
      message: "加值處理中…",
    });
    try {
      const { data } = await axios.post(
        `/api/cards/${encodeURIComponent(card.card_id)}/topup`,
        { amount }
      );
      setAccounts((current) =>
        current.map((item) =>
          item.account_id === data.account_id
            ? { ...item, balance: data.new_balance }
            : item
        )
      );
      setCardTopupState(card.card_id, {
        status: "success",
        message: `加值成功，共同餘額 ${money(data.new_balance)} 元`,
      });
      await loadAccounts();
    } catch (err) {
      setCardTopupState(card.card_id, {
        status: "error",
        message: err.response?.data?.detail || err.message,
      });
    }
  };

  const addCard = async (account) => {
    const cardId = window.prompt("RFID 卡號");
    if (cardId === null) return;
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) {
      alert("RFID 卡號不可為空");
      return;
    }
    const defaultName = configuredFirstHolderName(account)
      ? ""
      : pendingHolderName(account);
    const holderName = window.prompt(
      "持卡人姓名（可留空）",
      defaultName
    );
    if (holderName === null) return;
    try {
      await axios.post(`/api/household-accounts/${account.account_id}/cards`, {
        card_id: normalizedCardId,
        card_holder_name: holderName.trim(),
      });
      clearPendingHolderName(account.account_id);
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const editCardHolderName = async (card) => {
    const holderName = window.prompt(
      "持卡人姓名（清空後將顯示「尚未設定」）",
      holderNameForCard(card)
    );
    if (holderName === null) return;
    try {
      await axios.put(
        `/api/account-cards/${encodeURIComponent(card.card_id)}`,
        { card_holder_name: holderName.trim() }
      );
      await loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const openEnrollment = (account) => {
    const defaultName = configuredFirstHolderName(account)
      ? ""
      : pendingHolderName(account);

    setEnrollmentAccount({
      account,
      initialCardHolderName: defaultName,
    });
  };

  const enrollmentConfirmed = async () => {
    const accountId = enrollmentAccount?.account?.account_id;
    if (accountId != null) clearPendingHolderName(accountId);
    setEnrollmentAccount(null);
    await loadAccounts();
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
    setHistory({ card, items: [], status: "loading", error: "" });
    try {
      const { data } = await axios.get(`/api/cards/${encodeURIComponent(card.card_id)}/history`);
      setHistory((current) =>
        current?.card.card_id === card.card_id
          ? { card, items: data.history || [], status: "success", error: "" }
          : current
      );
    } catch (err) {
      setHistory((current) =>
        current?.card.card_id === card.card_id
          ? {
              card,
              items: [],
              status: "error",
              error: err.response?.data?.detail || err.message,
            }
          : current
      );
    }
  };

  return (
    <div className="p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <div>
        <h1 className="text-2xl font-bold">住戶帳戶與 RFID 卡片</h1>
        <p className="mt-1 text-sm text-gray-500">同一住戶的多張 RFID 卡共用一筆帳戶餘額，每張卡可設定不同持卡人姓名。</p>
        <p className="mt-1 text-sm text-gray-500">任一 RFID 卡產生正式交易通知時，將通知本住戶所有已綁定且啟用的 LINE 帳號。</p>
      </div>

      <form onSubmit={createAccount} className="space-y-3 rounded-xl border p-4 dark:border-gray-700">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <input className="min-w-0 rounded border px-3 py-2 dark:bg-gray-800" placeholder="門牌號碼，例如 10號" value={form.doorNo} onChange={(e) => setForm({ ...form, doorNo: e.target.value })} />
          <input required className="min-w-0 rounded border px-3 py-2 dark:bg-gray-800" placeholder="樓層，例如 1樓" value={form.floorNo} onChange={(e) => setForm({ ...form, floorNo: e.target.value })} />
          <input required className="min-w-0 rounded border px-3 py-2 dark:bg-gray-800" placeholder="車位號碼，例如 B12" value={form.parkingSpaceNo} onChange={(e) => setForm({ ...form, parkingSpaceNo: e.target.value })} />
          <input className="min-w-0 rounded border px-3 py-2 dark:bg-gray-800" placeholder="第一位持卡人姓名（可稍後填寫）" value={form.firstCardHolderName} onChange={(e) => setForm({ ...form, firstCardHolderName: e.target.value })} />
          <button disabled={creatingAccount} className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {creatingAccount ? "建立中…" : "新增住戶帳戶"}
          </button>
        </div>
        <label className="block max-w-xs text-sm text-gray-500">
          開戶餘額
          <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border px-3 py-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100" placeholder="開戶餘額" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
        </label>
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
                  <h2 className="text-lg font-semibold">
                    門牌：{textOrDash(account.doorNo ?? account.door_no)}
                    <span className="mx-1 text-gray-400">｜</span>
                    樓層：{textOrDash(account.floorNo ?? account.floor_no)}
                    <span className="mx-1 text-gray-400">｜</span>
                    車位：{textOrDash(account.parkingSpaceNo ?? account.parking_space_no)}
                  </h2>
                  <span className={`rounded px-2 py-0.5 text-xs ${account.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{account.status}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  第一位持卡人：{firstHolderName(account) || "尚未設定"}
                </div>
                <div className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">共同餘額：{money(account.balance)} 元</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addCard(account)} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">手動新增卡</button>
                <button onClick={() => openEnrollment(account)} className="rounded bg-violet-600 px-3 py-2 text-sm text-white">感應新增卡</button>
                <button onClick={() => editAccount(account)} className="rounded border px-3 py-2 text-sm">編輯帳戶</button>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-left text-gray-500 dark:border-gray-700">
                  <tr><th className="p-3">RFID 卡號</th><th className="p-3">持卡人姓名</th><th className="p-3">卡片狀態</th><th className="p-3">OCPP 狀態</th><th className="p-3 text-right">操作</th></tr>
                </thead>
                <tbody>
                  {cardsFor(account).map((card) => (
                    <tr key={card.card_id} className="border-b last:border-0 dark:border-gray-800">
                      <td className="p-3 font-mono">{textOrDash(card.card_id)}</td>
                      <td className="p-3">{holderNameForCard(card) || "尚未設定"}</td>
                      <td className="p-3">{textOrDash(card.status)}</td>
                      <td className="p-3">{card.id_tag_status || "--"}</td>
                      <td className="p-3"><div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => setAccessCard(card.card_id)} className="text-blue-600">白名單</button>
                        <button
                          disabled={
                            Boolean(topupBlockedReason(account, card)) ||
                            topupStates[card.card_id]?.status === "loading"
                          }
                          onClick={() => topup(account, card)}
                          title={topupBlockedReason(account, card) || "以此卡片辦理加值"}
                          className="text-emerald-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-60 dark:text-emerald-300 dark:disabled:text-gray-600"
                        >
                          {topupBlockedReason(account, card)
                            ? "不可加值"
                            : topupStates[card.card_id]?.status === "loading"
                              ? "加值中…"
                              : "加值"}
                        </button>
                        <button onClick={() => showHistory(card)} className="text-slate-600 dark:text-slate-300">歷史</button>
                        <button onClick={() => editCardHolderName(card)} className="text-violet-600 dark:text-violet-300">編輯姓名</button>
                        {card.status === "active" && <button onClick={() => disableCard(card)} className="text-red-600">停用</button>}
                        {topupStates[card.card_id] && (
                          <span
                            className={`w-full text-right text-xs ${
                              topupStates[card.card_id].status === "success"
                                ? "text-emerald-600 dark:text-emerald-300"
                                : topupStates[card.card_id].status === "error"
                                  ? "text-red-600 dark:text-red-300"
                                  : "text-gray-500"
                            }`}
                          >
                            {topupStates[card.card_id].message}
                          </span>
                        )}
                      </div></td>
                    </tr>
                  ))}
                  {cardsFor(account).length === 0 && <tr><td colSpan="5" className="p-5 text-center text-gray-400">此帳戶尚未綁定卡片</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {accessCard && <EditCardAccessModal idTag={accessCard} onClose={() => { setAccessCard(null); loadAccounts(); }} />}
      {enrollmentAccount && <CardEnrollmentModal accountId={enrollmentAccount.account.account_id} doorNo={enrollmentAccount.account.doorNo ?? enrollmentAccount.account.door_no} floorNo={enrollmentAccount.account.floorNo ?? enrollmentAccount.account.floor_no} parkingSpaceNo={enrollmentAccount.account.parkingSpaceNo ?? enrollmentAccount.account.parking_space_no} initialCardHolderName={enrollmentAccount.initialCardHolderName} onClose={() => setEnrollmentAccount(null)} onConfirmed={enrollmentConfirmed} />}
      {history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-6xl overflow-auto rounded-xl bg-white p-5 dark:bg-gray-900">
            <div className="mb-4 flex justify-between gap-4">
              <h2 className="text-lg font-semibold">卡片歷史：{history.card.card_id}</h2>
              <button onClick={() => setHistory(null)}>關閉</button>
            </div>
            {history.status === "loading" && <p className="text-gray-500">歷史載入中…</p>}
            {history.status === "error" && <p className="text-red-600">歷史載入失敗：{history.error}</p>}
            {history.status === "success" && history.items.length === 0 && (
              <p className="text-gray-500">沒有收支紀錄</p>
            )}
            {history.status === "success" && history.items.length > 0 && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="p-2 text-left">類型</th>
                    <th className="p-2 text-left">時間</th>
                    <th className="p-2 text-right">異動金額</th>
                    <th className="p-2 text-right">異動前餘額</th>
                    <th className="p-2 text-right">異動後餘額</th>
                    <th className="p-2 text-right">交易編號</th>
                  </tr>
                </thead>
                <tbody>
                  {history.items.map((item) => (
                    <tr key={item.id} className="border-t dark:border-gray-700">
                      <td className="whitespace-nowrap p-2">
                        {item.entry_type === "topup" ? "加值" : "充電扣款"}
                      </td>
                      <td className="whitespace-nowrap p-2">{taipeiTime(item.created_at)}</td>
                      <td
                        className={`whitespace-nowrap p-2 text-right font-medium ${
                          item.entry_type === "topup"
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-red-600 dark:text-red-300"
                        }`}
                      >
                        {signedMoney(item.signed_amount)} 元
                      </td>
                      <td className="whitespace-nowrap p-2 text-right">{moneyOrDash(item.balance_before)}{item.balance_before == null ? "" : " 元"}</td>
                      <td className="whitespace-nowrap p-2 text-right">{moneyOrDash(item.balance_after)}{item.balance_after == null ? "" : " 元"}</td>
                      <td className="whitespace-nowrap p-2 text-right">{item.transaction_id ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
