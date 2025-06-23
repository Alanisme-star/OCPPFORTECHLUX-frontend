import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import BoundUsers from './pages/BoundUsers';
import Cards from './pages/Cards';
import CardTopUp from './pages/CardTopUp';
import ChargePointComparisonChart from './pages/ChargePointComparisonChart';
import CostSummaryPage from './pages/CostSummaryPage';
import CostSummaryTable from './pages/CostSummaryTable';
import DailyPricingManager from './pages/DailyPricingManager';
import Dashboard from './pages/Dashboard';
import DashboardCards from './components/DashboardCards';
import ExportReservations from './pages/ExportReservations';
import ExportTransactions from './pages/ExportTransactions';
import HolidayChecker from './pages/HolidayChecker';
import LinePush from './pages/LinePush';
import LiveChargingStatus from './pages/LiveChargingStatus';
import LiveDemo from './pages/LiveDemo';
import Login from './pages/Login';
import MonthlyReportDownload from './pages/MonthlyReportDownload';
import PaymentHistory from './pages/PaymentHistory';
import PricingRuleChart from './pages/PricingRuleChart';
import PricingSettings from './pages/PricingSettings';
import Reservations from './pages/Reservations';
import StatusLogs from './pages/StatusLogs';
import TopEnergyChart from './pages/TopEnergyChart';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import WeeklyPricingSettings from './pages/WeeklyPricingSettings';

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
            <Route path="/dashboard-cards" element={<DashboardCards />} />
            <Route path="/users" element={<Users />} />
            <Route path="/bound-users" element={<BoundUsers />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/card-topup" element={<CardTopUp />} />
            <Route path="/weekly-pricing" element={<WeeklyPricingSettings />} />
            <Route path="/daily-pricing" element={<DailyPricingManager />} />
            <Route path="/pricing-settings" element={<PricingSettings />} />
            <Route path="/pricing-rule-chart" element={<PricingRuleChart />} />
            <Route path="/cost-summary" element={<CostSummaryPage />} />
            <Route path="/cost-summary-table" element={<CostSummaryTable />} />
            <Route path="/payment-history" element={<PaymentHistory />} />
            <Route path="/monthly-report" element={<MonthlyReportDownload />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/export-reservations" element={<ExportReservations />} />
            <Route path="/export-transactions" element={<ExportTransactions />} />
            <Route path="/holiday-checker" element={<HolidayChecker />} />
            <Route path="/live-charging-status" element={<LiveChargingStatus />} />
            <Route path="/line-push" element={<LinePush />} />
            <Route path="/live-demo" element={<LiveDemo />} />
            <Route path="/status-logs" element={<StatusLogs />} />
            <Route path="/chargepoint-comparison" element={<ChargePointComparisonChart />} />
            <Route path="/top-energy-chart" element={<TopEnergyChart />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<div className="text-red-400 text-xl">404 找不到頁面</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
