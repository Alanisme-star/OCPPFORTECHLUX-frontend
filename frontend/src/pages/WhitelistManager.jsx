import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

/**
 * 📋 白名單 + 卡片整合管理頁
 * 功能：
 * - 顯示所有白名單充電樁
 * - 顯示對應卡片餘額（若有對應）
 * - 支援即時更新（自動輪詢）
 * - 可手動新增充電樁（同時建立卡片與初始餘額）
 * - ✅ 支援編輯卡片餘額
 */

export default function WhitelistManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    charge_point_id: "",
    name: "",
    card_id: "",
    balance: 100.0,
  });
  const [msg, setMsg] = useState("");

  // ---- 載入資料 ----
  const fetchData = async () => {
    try {
      setLoading(true);
      let merged = [];
      try {
        const { data } = await axios.get("/api/whitelist/with-cards");
        merged = Array.isArray(data)
          ? data.map((item) => ({
              charge_point_id: item.charge_point_id,
              name: item.name,
              status: item.status,
              card_id: item.card_id,
              balance: item.balance,
            }))
          : [];
      } catch {
        // 若後端尚未建立 /api/whitelist/with-cards，則自行合併
        const [cpRes, cardRes] = await Promise.all([
          axios.get("/api/charge-points"),
          axios.get("/api/cards"),
        ]);
        const cps = Array.isArray(cpRes.data)
          ? cpRes.data
          : cpRes.data?.whitelist || [];
        const cards = Array.isArray(cardRes.data) ? cardRes.data : [];
        merged = cps.map((cp) => {
          const match = cards.find((c) => c.card_id === cp.charge_point_id);
          return {
            charge_point_id: cp.charge_point_id,
            name: cp.name || "—",
            status: cp.status || "—",
            card_id: cp.charge_point_id,
            balance: match ? match.balance ?? 0 : 0,
          };
        });
      }
      setList(merged);
    } catch (err) {
      console.error("讀取白名單失敗：", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000); // 每 10 秒自動更新
    return () => clearInterval(timer);
  }, []);

  // ---- 新增充電樁＋卡片（一次完成）----
  const handleAdd = async () => {
    const { charge_point_id, name, card_id, balance } = form;
    if (!charge_point_id || !card_id) {
      setMsg("⚠️ 請輸入充電樁 ID 與卡片 ID");
      return;
    }
    try {
      setMsg("⏳ 處理中...");
      // ✅ 改成一次呼叫後端，直接同時建立充電樁與卡片
      await axios.post("/api/whitelist-manager/add", {
        type: "charge_point",
        charge_point_id,
        name,
        card_id,  // ⚡ 傳給後端作為 default_card_id
        balance,  // ⚡ 同時設定初始餘額
      });
      setMsg(`✅ 已成功新增充電樁 ${charge_point_id} 與卡片 ${card_id}`);
      setForm({ charge_point_id: "", name: "", card_id: "", balance: 100.0 });
      fetchData();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        setMsg(`❌ 新增失敗：${err.response.data.detail}`);
      } else {
        setMsg("❌ 新增失敗");
      }
    }
  };



  // ---- 編輯卡片餘額 ----
  const handleEdit = async (row) => {
    const newBalance = prompt(
      `請輸入新的餘額（目前：${row.balance} 元）`,
      row.balance
    );
    if (newBalance === null) return;
    const val = parseFloat(newBalance);
    if (isNaN(val)) {
      alert("⚠️ 輸入必須是數字");
      return;
    }
    try {
      setMsg("⏳ 更新中...");
      await axios.put("/api/whitelist-manager/update-card-balance", {
        card_id: row.card_id || row.charge_point_id,
        balance: val,
      });
      setMsg(`✅ 已更新 ${row.charge_point_id} 餘額為 ${val} 元`);
      fetchData();
    } catch (err) {
      console.error(err);
      setMsg("❌ 更新失敗");
    }
  };

  // ---- 樣式 ----
  const wrap = {
    padding: "20px",
    color: "#fff",
    background: "#121212",
    minHeight: "100vh",
  };
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  };
  const thtd = {
    border: "1px solid #444",
    padding: "8px 10px",
    textAlign: "center",
  };
  const input = {
    width: "100%",
    padding: "6px",
    margin: "4px 0",
    borderRadius: "6px",
    border: "1px solid #555",
    background: "#1e1e1e",
    color: "#fff",
  };
  const btn = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    background: "#1976d2",
    color: "#fff",
    cursor: "pointer",
  };

  return (
    <div style={wrap}>
      <h2>⚙️ 白名單＋卡片管理</h2>

      <div style={{ marginBottom: "20px" }}>
        <h4>➕ 新增充電樁（自動建立卡片）</h4>
        <table style={{ width: "100%", maxWidth: 600 }}>
          <tbody>
            <tr>
              <td style={{ color: "#bbb", width: "140px" }}>充電樁 ID：</td>
              <td>
                <input
                  style={input}
                  value={form.charge_point_id}
                  onChange={(e) =>
                    setForm({ ...form, charge_point_id: e.target.value })
                  }
                  placeholder="如：TW*MSI*E000100"
                />
              </td>
            </tr>
            <tr>
              <td style={{ color: "#bbb" }}>充電樁名稱：</td>
              <td>
                <input
                  style={input}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="如：MSI充電樁"
                />
              </td>
            </tr>
            <tr>
              <td style={{ color: "#bbb" }}>卡片 ID：</td>
              <td>
                <input
                  style={input}
                  value={form.card_id}
                  onChange={(e) =>
                    setForm({ ...form, card_id: e.target.value })
                  }
                  placeholder="如：6678B3EB"
                />
              </td>
            </tr>
            <tr>
              <td style={{ color: "#bbb" }}>初始餘額：</td>
              <td>
                <input
                  style={input}
                  type="number"
                  step="0.1"
                  value={form.balance}
                  onChange={(e) =>
                    setForm({ ...form, balance: parseFloat(e.target.value) })
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
        <button style={btn} onClick={handleAdd}>
          新增
        </button>
        {msg && <p style={{ marginTop: "10px", color: "#0f0" }}>{msg}</p>}
      </div>

      <hr style={{ margin: "30px 0", borderColor: "#333" }} />

      <h4>📋 白名單與卡片餘額</h4>

      {loading ? (
        <p>⏳ 讀取中...</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "#222" }}>
              <th style={thtd}>充電樁 ID</th>
              <th style={thtd}>名稱</th>
              <th style={thtd}>狀態</th>
              <th style={thtd}>卡片餘額（元）</th>
              <th style={thtd}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} style={thtd}>
                  無資料
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.charge_point_id}>
                  <td style={thtd}>{row.charge_point_id}</td>
                  <td style={thtd}>{row.name || "—"}</td>
                  <td style={thtd}>{row.status || "—"}</td>
                  <td style={thtd}>
                    {typeof row.balance === "number"
                      ? row.balance.toFixed(2)
                      : "—"}
                  </td>
                  <td style={thtd}>
                    <button
                      style={{ ...btn, background: "#4caf50" }}
                      onClick={() => handleEdit(row)}
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
