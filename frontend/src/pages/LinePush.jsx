// frontend/src/pages/LinePush.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "../axiosInstance";

const LinePush = () => {
  const [message, setMessage] = useState("LINE 推播測試成功：OCPP 後台手動測試");
  const [loading, setLoading] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [result, setResult] = useState(null);
  const [targets, setTargets] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    setLoadingTargets(true);
    setResult(null);

    try {
      const [cardsResult, bindingsResult] = await Promise.allSettled([
        axios.get("/api/cards"),
        axios.get("/api/line/bindings"),
      ]);

      const cards =
        cardsResult.status === "fulfilled" && Array.isArray(cardsResult.value.data)
          ? cardsResult.value.data
          : [];

      const bindings =
        bindingsResult.status === "fulfilled" &&
        Array.isArray(bindingsResult.value.data?.bindings)
          ? bindingsResult.value.data.bindings
          : [];

      const bindingMap = new Map();

      bindings.forEach((binding) => {
        if (binding?.idTag) {
          bindingMap.set(binding.idTag, binding);
        }
      });

      const mergedFromCards = cards
        .map((card) => {
          const idTag = card.card_id || card.idTag || card.cardId || card.id_tag;

          if (!idTag) {
            return null;
          }

          const binding = bindingMap.get(idTag);

          return {
            idTag,
            name: card.name || binding?.residentName || binding?.displayName || "",
            balance: card.balance,
            cardStatus: card.status,
            validUntil: card.validUntil,
            lineBound: Boolean(binding?.lineUserId),
            lineEnabled: Boolean(binding?.enabled),
            lineDisplayName: binding?.displayName || "",
            residentName: binding?.residentName || card.name || "",
          };
        })
        .filter(Boolean);

      const cardIdSet = new Set(mergedFromCards.map((item) => item.idTag));

      const bindingOnlyTargets = bindings
        .filter((binding) => binding?.idTag && !cardIdSet.has(binding.idTag))
        .map((binding) => ({
          idTag: binding.idTag,
          name: binding.residentName || binding.displayName || "",
          balance: binding.balance,
          cardStatus: "",
          validUntil: "",
          lineBound: Boolean(binding.lineUserId),
          lineEnabled: Boolean(binding.enabled),
          lineDisplayName: binding.displayName || "",
          residentName: binding.residentName || "",
        }));

      const merged = [...mergedFromCards, ...bindingOnlyTargets].sort((a, b) =>
        String(a.idTag).localeCompare(String(b.idTag))
      );

      setTargets(merged);
    } catch (err) {
      console.error("LINE 推播對象載入失敗：", err);
      setResult({
        ok: false,
        message: "LINE 推播對象載入失敗：" + (err?.message || "未知錯誤"),
      });
    } finally {
      setLoadingTargets(false);
    }
  };

  const toggleSelect = (idTag) => {
    setSelectedTargets((prev) =>
      prev.includes(idTag)
        ? prev.filter((item) => item !== idTag)
        : [...prev, idTag]
    );
  };

  const selectedCount = useMemo(() => selectedTargets.length, [selectedTargets]);

  const sendMessage = async () => {
    if (!message.trim()) {
      setResult({
        ok: false,
        message: "請先輸入訊息內容",
      });
      return;
    }

    if (selectedTargets.length === 0) {
      setResult({
        ok: false,
        message: "請至少選擇一個推播對象",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post("/api/messaging/test", {
        message: message.trim(),
        targets: selectedTargets,
      });

      setResult(res.data);
    } catch (err) {
      console.error("LINE 推播失敗：", err);
      setResult({
        ok: false,
        message:
          "LINE 推播失敗：" +
          (err?.response?.data?.message ||
            err?.response?.data?.detail ||
            err?.message ||
            "未知錯誤"),
        raw: err?.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderLineStatus = (target) => {
    if (target.lineBound && target.lineEnabled) {
      return "✅ 已綁定";
    }

    if (target.lineBound && !target.lineEnabled) {
      return "⏸️ 已停用";
    }

    return "⚠️ 未綁定";
  };

  const renderResult = () => {
    if (!result) {
      return null;
    }

    if (result.summary) {
      return (
        <div className="mt-4 rounded border border-gray-700 bg-gray-900 p-3 text-sm">
          <div className={result.ok ? "text-green-400" : "text-yellow-300"}>
            {result.ok ? "✅ 推播完成" : "⚠️ 推播完成，但沒有全部成功"}
          </div>

          <div className="mt-2 text-gray-200">
            總數：{result.summary.total}，
            成功：{result.summary.sent}，
            跳過：{result.summary.skipped}，
            失敗：{result.summary.failed}
          </div>

          {Array.isArray(result.results) && result.results.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.results.map((item, index) => (
                <div
                  key={`${item.idTag}-${index}`}
                  className="rounded bg-gray-800 p-2"
                >
                  <div>
                    <span className="font-semibold">{item.idTag}</span>
                    {item.residentName ? ` / ${item.residentName}` : ""}
                  </div>
                  <div className="text-gray-300">
                    狀態：
                    {item.status === "sent"
                      ? "✅ sent"
                      : item.status === "skipped"
                      ? "⚠️ skipped"
                      : "❌ failed"}
                  </div>
                  {item.reason && (
                    <div className="text-gray-400">原因：{item.reason}</div>
                  )}
                  {item.message && (
                    <div className="text-gray-400">{item.message}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`mt-4 rounded border p-3 text-sm ${
          result.ok
            ? "border-green-700 bg-green-950 text-green-200"
            : "border-red-700 bg-red-950 text-red-200"
        }`}
      >
        {result.message || (result.ok ? "✅ 發送成功" : "❌ 發送失敗")}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">🔔 LINE 推播測試</h2>

        <button
          onClick={fetchTargets}
          disabled={loadingTargets || loading}
          className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {loadingTargets ? "更新中..." : "重新整理對象"}
        </button>
      </div>

      <label className="mb-2 block font-semibold">訊息內容：</label>
      <textarea
        className="h-28 w-full rounded bg-gray-800 p-3 text-white"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="mt-4 mb-2 flex items-center justify-between">
        <label className="font-semibold">選擇推播對象：</label>
        <span className="text-sm text-gray-400">已選擇 {selectedCount} 位</span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded border border-gray-700 bg-gray-900 p-2">
        {loadingTargets && (
          <div className="p-3 text-sm text-gray-300">載入推播對象中...</div>
        )}

        {!loadingTargets && targets.length === 0 && (
          <div className="p-3 text-sm text-yellow-300">
            目前沒有可顯示的卡號資料，請確認 /api/cards 或 /api/line/bindings 是否有資料。
          </div>
        )}

        {!loadingTargets &&
          targets.map((target) => (
            <label
              key={target.idTag}
              className="mb-2 block cursor-pointer rounded bg-gray-800 p-3 text-sm hover:bg-gray-700"
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedTargets.includes(target.idTag)}
                  onChange={() => toggleSelect(target.idTag)}
                  className="mt-1"
                />

                <div className="flex-1">
                  <div className="font-semibold text-white">
                    {target.name || target.residentName || "未命名住戶"}
                  </div>

                  <div className="text-gray-300">卡號：{target.idTag}</div>

                  <div className="mt-1 text-gray-400">
                    LINE 狀態：{renderLineStatus(target)}
                    {target.balance !== undefined && target.balance !== null
                      ? ` ｜ 餘額：${target.balance}`
                      : ""}
                  </div>
                </div>
              </div>
            </label>
          ))}
      </div>

      <button
        onClick={sendMessage}
        disabled={loading || loadingTargets || selectedTargets.length === 0}
        className="mt-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "發送中..." : "立即發送"}
      </button>

      {renderResult()}
    </div>
  );
};

export default LinePush;