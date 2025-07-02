// frontend/src/pages/BoundUsers.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const BoundUsers = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("讀取使用者失敗：", err);
    }
  };

  const unbindUser = async (idTag) => {
    if (!window.confirm(`確定要解除綁定 ${idTag} 嗎？`)) return;
    try {
      await axios.put(`/users/${idTag}`, { cardNumber: null });
      fetchUsers();
    } catch (err) {
      alert("解除綁定失敗：" + err.message);
    }
  };

  const bound = users.filter((u) => u.cardNumber);
  const unbound = users.filter((u) => !u.cardNumber);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📋 使用者綁定狀態</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">✅ 已綁定 ({bound.length})</h3>
          <ul className="text-sm max-h-64 overflow-y-auto space-y-1">
            {bound.map((u) => (
              <li key={u.idTag} className="flex justify-between items-center">
                <span>
                  ▸ {u.name || u.idTag}（{u.department || "-"}）
                </span>
                <button
                  onClick={() => unbindUser(u.idTag)}
                  className="text-red-400 hover:underline text-xs"
                >解除</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">❌ 未綁定 ({unbound.length})</h3>
          <ul className="text-sm max-h-64 overflow-y-auto">
            {unbound.map((u) => (
              <li key={u.idTag}>
                ▸ {u.name || u.idTag}（{u.department || "-"}）
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BoundUsers;
