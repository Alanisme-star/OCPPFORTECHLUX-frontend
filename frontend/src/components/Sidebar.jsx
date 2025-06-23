import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Calendar,
  Users as UsersIcon,
  FileText,
  CreditCard,
  ClipboardList,
  LogOut,
  ActivitySquare,
  DollarSign,
  DownloadIcon,
  BarChart3,
  CalendarDays,
  Clock
} from "lucide-react";

const menu = [
  { path: "/", label: "Dashboard", icon: <Home size={18} /> },
  { path: "/reservations", label: "Reservations", icon: <Calendar size={18} /> },
  { path: "/users", label: "Users", icon: <UsersIcon size={18} /> },
  { path: "/transactions", label: "交易紀錄", icon: <FileText size={18} /> },
  { path: "/cards", label: "卡片管理", icon: <CreditCard size={18} /> },
  { path: "/status-logs", label: "狀態日誌", icon: <ClipboardList size={18} /> },
  { path: "/export", label: "匯出資料", icon: <FileText size={18} /> },
  { path: "/bound-users", label: "身分綁定", icon: <UsersIcon size={18} /> },
  { path: "/top-chart", label: "用電排行圖表", icon: <BarChart3 size={18} /> },
  { path: "/pricing-chart", label: "電價圖表", icon: <DollarSign size={18} /> },
  { path: "/compare-chart", label: "樁用電對比", icon: <ActivitySquare size={18} /> },
  { path: "/export-reservations", label: "匯出預約", icon: <DownloadIcon size={18} /> },
  { path: "/holiday-checker", label: "假日查詢", icon: <CalendarDays size={18} /> },
  { path: "/card-topup", label: "卡片儲值", icon: <CreditCard size={18} /> },
  { path: "/payment-history", label: "扣款紀錄", icon: <FileText size={18} /> },
  { path: "/weekly-pricing", label: "週期性電價設定", icon: <Clock size={18} /> },
  { path: "/live-demo", label: "即時充電資訊", icon: <ActivitySquare size={18} /> },
  { path: "/cost-summary", label: "成本查詢", icon: <DollarSign size={18} /> },
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
    <div className="w-60 h-screen fixed top-0 left-0 bg-[#1E293B] text-white p-4 flex flex-col justify-between">
      <div>
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
