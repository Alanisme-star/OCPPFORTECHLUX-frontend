import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DailyPricingSettings from "./pages/DailyPricingSettings";
import Cards from './pages/Cards';
import CardTopUp from './pages/CardTopUp';
import Dashboard from './pages/Dashboard';
import ExportTransactions from './pages/ExportTransactions';
import HolidayChecker from './pages/HolidayChecker';
import LinePush from './pages/LinePush';
import LiveChargingStatus from './components/LiveChargingStatus';
import LiveDemo from './pages/LiveDemo';
import Login from './pages/Login';
import StatusLogs from './pages/StatusLogs';
import Transactions from './pages/Transactions';
import ChargePoints from './pages/ChargePoints';
import RealtimeStatusPage from "./pages/RealtimeStatusPage";

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
            <Route path="/export-transactions" element={<ExportTransactions />} />
            <Route path="/holiday-checker" element={<HolidayChecker />} />
            <Route path="/line-push" element={<LinePush />} />
            <Route path="/live-demo" element={<LiveDemo />} />
            <Route path="/status-logs" element={<StatusLogs />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<div className="text-red-400 text-xl">404 找不到頁面</div>} />
            <Route path="/daily-pricing" element={<DailyPricingSettings />} />
            <Route path="/charge-points" element={<ChargePoints />} />
            <Route path="/realtime-status" element={<RealtimeStatusPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
