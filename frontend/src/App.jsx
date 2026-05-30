// frontend/src/App.jsx — FINAL COMPLETE VERSION
// Every page wired up

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth
import Login from "./pages/Login";

// Core
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";

// Master
import Customers from "./pages/Customers";
import CommodityMaster from "./pages/CommodityMaster";

// Transactions
import InwardEntry from "./pages/InwardEntry";
import OutwardEntry from "./pages/OutwardEntry";
import GenerateBill from "./pages/GenerateBill";
import Vouchers from "./pages/Vouchers";
import EditVoucher from "./pages/EditVoucher";

// Reports
import StockStatus from "./pages/StockStatus";
import InwardRegister from "./pages/InwardRegister";
import OutwardRegister from "./pages/OutwardRegister";
import PartyLedger from "./pages/PartyLedger";
import DetailLedger from "./pages/PartyLedgerDetail";
import PartyBalance from "./pages/PartyBalance";
import GatePass from "./pages/GatePass";
import LocationMap from "./pages/LocationMap";
import DayBook from "./pages/DayBook";
import StockByVariety from "./pages/StockByVariety";
import StockByParty from "./pages/StockByParty";
import PartyRentReport from "./pages/PartyRentReport";
import ExcelInwardUpload from "./pages/ExcelInwardUpload";

// Settings
import Settings from "./pages/Settings";

function Guard({ children }) {
  return localStorage.getItem("token") ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}
const P = ({ c: C }) => (
  <Guard>
    <C />
  </Guard>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Core */}
        <Route path="/home" element={<P c={Home} />} />
        <Route path="/dashboard" element={<P c={Dashboard} />} />
        {/* Master */}
        <Route path="/master/customer" element={<P c={Customers} />} />
        <Route path="/master/village" element={<P c={Customers} />} />{" "}
        {/* placeholder */}
        <Route path="/commodity/master" element={<P c={CommodityMaster} />} />
        <Route path="/commodity/labour" element={<P c={CommodityMaster} />} />
        {/* Transactions */}
        <Route path="/transaction/inward" element={<P c={InwardEntry} />} />
        <Route path="/transaction/outward" element={<P c={OutwardEntry} />} />
        <Route path="/transaction/bill" element={<P c={GenerateBill} />} />
        <Route path="/transaction/voucher" element={<P c={Vouchers} />} />
        <Route path="/transaction/voucher-register" element={<EditVoucher />} />
        {/* Reports */}
        <Route path="/report/stock-summary" element={<P c={StockStatus} />} />
        <Route path="/report/inward" element={<P c={InwardRegister} />} />
        <Route path="/report/outward" element={<P c={OutwardRegister} />} />
        <Route path="/report/party-ledger" element={<P c={PartyLedger} />} />
        <Route path="/report/party-balance" element={<P c={PartyBalance} />} />
        <Route path="/report/gate-pass" element={<P c={GatePass} />} />
        <Route path="/report/location" element={<P c={LocationMap} />} />
        <Route
          path="/report/stock-variety"
          element={<P c={StockByVariety} />}
        />
        <Route path="/report/stock-party" element={<P c={StockByParty} />} />
        <Route path="/report/party-rent" element={<P c={PartyRentReport} />} />
        <Route path="/report/bill" element={<P c={GenerateBill} />} />
        <Route path="/account/day" element={<P c={DayBook} />} />
        <Route
          path="/transaction/inward-upload"
          element={<ExcelInwardUpload />}
        />
        {/* Settings */}
        <Route path="/settings" element={<P c={Settings} />} />
        {/* Detail ledger — full page, no sidebar */}
        <Route
          path="/report/party-ledger/detail/:id"
          element={
            <Guard>
              <DetailLedger />
            </Guard>
          }
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
