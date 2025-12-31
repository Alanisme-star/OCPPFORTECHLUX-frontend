import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DailyPricingSettings from "./pages/DailyPricingSettings";
import Cards from './pages/Cards';
import CardTopUp from './pages/CardTopUp';
import Dashboard from './pages/Dashboard';
import LinePush from './pages/LinePush';
import LiveChargingStatus from './components/LiveChargingStatus';
import Login from './pages/Login';
import Transactions from './pages/Transactions';
import RealtimeStatusPage from "./pages/RealtimeStatusPage";
import LiveStatus from "./pages/LiveStatus";
import ChargePoints from "./pages/ChargePoints";


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
            <Route path="/cards" element={<Cards />} />
            <Route path="/card-topup" element={<CardTopUp />} />
            <Route path="/line-push" element={<LinePush />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<div className="text-red-400 text-xl">404 找不到頁面</div>} />
            <Route path="/daily-pricing" element={<DailyPricingSettings />} />
            <Route path="/charge-points" element={<ChargePoints />} />
            <Route path="/realtime-status" element={<RealtimeStatusPage />} />
            <Route path="/live-status" element={<LiveStatus />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
