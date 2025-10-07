import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DailyPricingSettings from "./pages/DailyPricingSettings";
import CardTopUp from './pages/CardTopUp';
import Dashboard from './pages/Dashboard';
import LinePush from './pages/LinePush';
import LiveChargingStatus from './components/LiveChargingStatus';
import Login from './pages/Login';
import Transactions from './pages/Transactions';
import RealtimeStatusPage from "./pages/RealtimeStatusPage";
import LiveStatus from "./pages/LiveStatus";
// 🆕 新增整合頁
import WhitelistManager from "./pages/WhitelistManager";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-900 text-white">
        {/* 左側側邊欄 */}
        <Sidebar />

        {/* 主頁面內容 */}
        <main className="ml-60 flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/card-topup" element={<CardTopUp />} />
            <Route path="/line-push" element={<LinePush />} />
            <Route path="/login" element={<Login />} />
            <Route path="/daily-pricing" element={<DailyPricingSettings />} />
            <Route path="/realtime-status" element={<RealtimeStatusPage />} />
            <Route path="/live-status" element={<LiveStatus />} />

            {/* 🆕 新增整合頁：取代 Cards.jsx 與 ChargePoints.jsx */}
            <Route path="/whitelist-manager" element={<WhitelistManager />} />

            {/* ❌ 移除舊頁 */}
            {/* <Route path="/cards" element={<Cards />} /> */}
            {/* <Route path="/charge-points" element={<ChargePoints />} /> */}

            {/* 404 頁面 */}
            <Route
              path="*"
              element={<div className="text-red-400 text-xl">404 找不到頁面</div>}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
