import React, { useEffect, useRef, useState } from "react";
import axios from "../axiosInstance";

export default function CardEnrollmentModal({ accountId, accountName, onClose, onConfirmed }) {
  const [chargePoints, setChargePoints] = useState([]);
  const [chargePointId, setChargePointId] = useState("");
  const [holder, setHolder] = useState("");
  const [relationship, setRelationship] = useState("");
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(120);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    axios.get("/api/charge-points")
      .then(({ data }) => {
        if (cancelled) return;
        const values = Array.isArray(data) ? data : [];
        setChargePoints(values);
        setChargePointId(values[0]?.chargePointId || values[0]?.charge_point_id || "");
      })
      .catch(() => {
        if (cancelled) return;
        setChargePoints([]);
        setChargePointId("");
        setLoadError("無法取得充電樁清單，請稍後重試。");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session?.enrollment_id || !["waiting", "detected"].includes(session.status)) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const { data } = await axios.get(`/api/card-enrollments/${session.enrollment_id}`);
        if (cancelled) return;
        setSession(data);
        setRemaining(Math.max(0, Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 1000)));
      } catch (err) {
        if (!cancelled) console.error(err);
      }
    };
    refresh();
    pollRef.current = window.setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(pollRef.current);
    };
  }, [session?.enrollment_id, session?.status]);

  const start = async () => {
    if (!chargePointId) return alert("請選擇充電樁");
    setBusy(true);
    try {
      const { data } = await axios.post("/api/card-enrollments", {
        account_id: accountId,
        charge_point_id: chargePointId,
        card_holder_name: holder,
        relationship,
        duration_seconds: 120,
      });
      if (!mountedRef.current) return;
      setSession(data);
      setRemaining(120);
    } catch (err) {
      if (mountedRef.current) alert(err.response?.data?.detail || err.message);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const cancel = async () => {
    if (session && ["waiting", "detected"].includes(session.status)) {
      try { await axios.post(`/api/card-enrollments/${session.enrollment_id}/cancel`); } catch { /* best effort */ }
    }
    onClose();
  };

  const confirm = async () => {
    if (busy || session?.status !== "detected") return;
    setBusy(true);
    try {
      await axios.post(`/api/card-enrollments/${session.enrollment_id}/confirm`);
      onConfirmed();
    } catch (err) {
      if (mountedRef.current) {
        alert(err.response?.data?.detail || err.message);
        setBusy(false);
      }
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">感應新增 RFID 卡</h2><p className="text-sm text-gray-500">住戶：{accountName}</p></div><button onClick={cancel}>✕</button></div>
    {!session && <div className="space-y-3">
      <label className="block text-sm">指定充電樁<select className="mt-1 w-full rounded border px-3 py-2 dark:bg-gray-800" value={chargePointId} onChange={(e) => setChargePointId(e.target.value)}>{chargePoints.map((cp) => { const id = cp.chargePointId || cp.charge_point_id; return <option key={id} value={id}>{cp.name ? `${cp.name}｜${id}` : id}</option>; })}</select></label>
      <label className="block text-sm">持卡人<input className="mt-1 w-full rounded border px-3 py-2 dark:bg-gray-800" value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
      <label className="block text-sm">關係<input className="mt-1 w-full rounded border px-3 py-2 dark:bg-gray-800" value={relationship} onChange={(e) => setRelationship(e.target.value)} /></label>
      {loadError && <p className="text-sm text-red-600" role="alert">{loadError}</p>}
      <button disabled={busy || !chargePointId || chargePoints.length === 0} onClick={start} className="w-full rounded bg-violet-600 px-4 py-2 text-white disabled:opacity-50">開啟 120 秒感應</button>
    </div>}
    {session && <div className="space-y-4 text-center">
      <div className="text-4xl font-bold tabular-nums">{remaining} 秒</div>
      <div className="rounded bg-gray-50 p-4 dark:bg-gray-800">{session.status === "waiting" && "請在指定充電樁感應新卡。第一次感應只會捕捉卡號，不能充電。"}{session.status === "detected" && <><div className="text-sm text-gray-500">已偵測卡號</div><div className="mt-1 font-mono text-xl">{session.detected_id_tag}</div></>}{session.status === "expired" && "感應工作已過期，請關閉後重新開始。"}{session.status === "cancelled" && "感應工作已取消。"}</div>
      <div className="flex gap-2"><button onClick={cancel} className="flex-1 rounded border px-4 py-2">取消</button><button disabled={busy || session.status !== "detected"} onClick={confirm} className="flex-1 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40">確認綁定</button></div>
    </div>}
  </div></div>;
}
