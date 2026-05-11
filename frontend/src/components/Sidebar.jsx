import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  CreditCard,
  ClipboardList,
  ActivitySquare,
  Clock,
  MessageSquare,
  LogOut
} from "lucide-react";

const menu = [
  { path: "/", label: "管委會總覽", icon: <Home size={18} /> },
  { path: "/transactions", label: "交易紀錄", icon: <FileText size={18} /> },
  { path: "/cards", label: "卡片管理", icon: <CreditCard size={18} /> },
  { path: "/charge-points", label: "充電樁管理", icon: <ClipboardList size={18} /> },
  { path: "/daily-pricing", label: "每日電價設定", icon: <Clock size={18} /> },
  { path: "/live-status", label: "即時狀態", icon: <ActivitySquare size={18} /> },
  { path: "/line-push", label: "LINE 通知推送", icon: <MessageSquare size={18} /> },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("確定要登出嗎？")) {
      localStorage.removeItem("auth");
      navigate("/login");
    }
  };

  return (
    <div className="w-60 h-screen fixed top-0 left-0 bg-[#1E293B] text-white p-4 flex flex-col z-50">
      <div className="overflow-y-auto flex-1">
        <h1 className="text-xl font-bold mb-6">🔌 Energy Admin</h1>
        <nav className="space-y-2">
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#334155] transition ${
                location.pathname === item.path ? "bg-[#334155] text-blue-400" : "text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-white hover:bg-red-600"
      >
        <LogOut size={18} /> 登出
      </button>
    </div>
  );
};

export default Sidebar;