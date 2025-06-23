import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

// 自動引入全部 pages（依你剛剛截圖排序）：
import BoundUsers from './pages/BoundUsers';
import Cards from './pages/Cards';
import CardTopUp from './pages/CardTopUp';
import ChargePointComparisonChart from './pages/ChargePointComparisonChart';
import CostSummaryPage from './pages/CostSummaryPage';
import CostSummaryTable from './pages/CostSummaryTable';
import DailyPricingManager from './pages/DailyPricingManager';
import Dashboard from './pages/Dashboard';
import DashboardCards from './pages/DashboardCards';
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
      {/* 上方導覽列，可改為側邊欄 Sidebar */}
      <nav className="flex flex-wrap gap-2 p-2 bg-gray-900 text-white text-sm">
        <Link to="/">Dashboard</Link>
        <Link to="/dashboard-cards">Dashboard Cards</Link>
        <Link to="/users">用戶管理</Link>
        <Link to="/bound-users">已綁定用戶</Link>
        <Link to="/transactions">交易紀錄</Link>
        <Link to="/cards">卡片管理</Link>
        <Link to="/card-topup">卡片儲值</Link>
        <Link to="/weekly-pricing">週期性電價</Link>
        <Link to="/daily-pricing">每日電價</Link>
        <Link to="/pricing-settings">電價總表</Link>
        <Link to="/pricing-rule-chart">時段電價圖</Link>
        <Link to="/cost-summary">費用明細頁</Link>
        <Link to="/cost-summary-table">費用明細表</Link>
        <Link to="/payment-history">扣款紀錄</Link>
        <Link to="/monthly-report">月報下載</Link>
        <Link to="/reservations">預約管理</Link>
        <Link to="/export-reservations">預約匯出</Link>
        <Link to="/export-transactions">交易匯出</Link>
        <Link to="/holiday-checker">假日查詢</Link>
        <Link to="/live-charging-status">即時狀態</Link>
        <Link to="/line-push">LINE推播</Link>
        <Link to="/live-demo">Live Demo</Link>
        <Link to="/status-logs">狀態紀錄</Link>
        <Link to="/chargepoint-comparison">充電樁比較圖</Link>
        <Link to="/top-energy-chart">能耗排行</Link>
        <Link to="/login">登入</Link>
      </nav>
      <div className="p-4">
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
          {/* 404 Not Found fallback，可以加強用 */}
          <Route path="*" element={<div className="text-red-500 text-xl">404 找不到頁面</div>} />
        </Routes>
      </div>
    </Router>
  );
}
