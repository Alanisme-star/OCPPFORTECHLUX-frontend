// frontend/src/pages/Users.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    idTag: "",
    name: "",
    department: "",
    cardNumber: ""
  });

  const fetchUsers = () => {
    axios
      .get("/api/users")
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Failed to fetch users:", err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("/api/users", formData)
      .then(() => {
        setFormData({ idTag: "", name: "", department: "", cardNumber: "" });
        setShowForm(false);
        fetchUsers(); // refresh table
      })
      .catch((err) => console.error("Failed to add user:", err));
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">👤 Registered Users</h2>

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        {showForm ? "取消" : "➕ 新增使用者"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 p-4 rounded mb-6 space-y-4"
        >
          <div className="flex gap-4">
            <input
              className="bg-gray-700 p-2 rounded w-full"
              type="text"
              placeholder="ID Tag"
              value={formData.idTag}
              onChange={(e) => setFormData({ ...formData, idTag: e.target.value })}
              required
            />
            <input
              className="bg-gray-700 p-2 rounded w-full"
              type="text"
              placeholder="姓名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <input
              className="bg-gray-700 p-2 rounded w-full"
              type="text"
              placeholder="部門"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <input
              className="bg-gray-700 p-2 rounded w-full"
              type="text"
              placeholder="卡號"
              value={formData.cardNumber}
              onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            ✅ 送出
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-[#1E293B] text-white">
              <th className="px-4 py-2">ID Tag</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Card Number</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.idTag}
                className="border-b border-gray-700 hover:bg-[#1E293B]/50"
              >
                <td className="px-4 py-2">{u.idTag}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.department}</td>
                <td className="px-4 py-2">{u.cardNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
