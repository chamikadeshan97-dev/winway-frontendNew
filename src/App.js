import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

// Layouts & Pages
import DashboardLayout from "./Pages/DashboardLayout";
import FileUploadForm from "./Pages/FileUploadForm";
import ResultsView from "./Pages/ResultsView";
import Login from "./Pages/Auth/Login";
import Loyality from "./Pages/Loyality";
import MonthlyUpgrade from "./Pages/MonthlyUpgrade";
import Settings from "./Pages/Settings";
import LoyaltyCustomers from "./Pages/LoyaltyCustomers";
import LoyaltyEmails from "./Pages/LoyaltyEmails";
import Dashboard from "./Pages/DashBoardPage";
import CustomSMS from "./Pages/CustomSMS";
import CustomEmails from "./Pages/CustomEmails";

import LoyalityPromotions from "./Pages/LoyalityPromotions";
import MonthlyUpgradesTable from "./Pages/MonthlyUpgradesTable";
import LoyaltyEvaluationManager from "./Pages/LoyaltyEvaluationManager.js";


import FileManager from "./Pages/FileManager.js";
import WeeklyImagesManager from "./Pages/WeeklyImagesManager.js";
import RegistrationCountPage from "./Pages/RegistrationCountPage.js";
import DailySalesSummery from "./Pages/DailySalesSummery.js";
import DailyFullSummaryRecc from "./Pages/DailyFullSummaryRecc.js";
import SmsWelcome from "./SMS/SmsWelcome.js";
import ReconciliationSummary from "./Pages/DailyLastSoldTime.js";
import DailyFullSummary from "./Pages/DailyFullSummary.js";
import SuperAdminUsersPage from "./Pages/Auth/SuperAdminUsersPage.js";
import ChangePassword from "./Pages/Auth/ChangePassword";

import Overview from "./Pages/Overview";
import OrderEntry from "./Pages/OrderEntry.js";
import Assignment from "./Pages/Assignment.js";
import SplitPage from "./Pages/SplitPage.js";
import UploadPage from "./Pages/UploadPage.js";
import DownloadPage from "./Pages/DownloadPage.js";

import ResultUpload from "./Pages/ResultUpload.js";
import ResultSplit from "./Pages/ResultSplit.js";
import ResultDownload from "./Pages/ResultDownload.js";

/* =========================================================
   Role helpers
========================================================= */

const isFinancialUser = () => {
  const role = (localStorage.getItem("role") || "").trim().toLowerCase();

  const financialRoles = [
    "financial",
    "financial user",
    "financial_user",
    "financial-user",
    "finance",
  ];

  return financialRoles.includes(role);
};

const getDefaultTab = () => {
  return isFinancialUser() ? "10-1" : "0";
};

/* =========================================================
   App
========================================================= */

function App() {
  const navigate = useNavigate();

  const [results, setResults] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem("token"));
  });

  const [activeTab, setActiveTab] = useState(() => {
    return getDefaultTab();
  });

  /* =========================================================
     Sync authentication
  ========================================================= */

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  /* =========================================================
     Warn before refresh / close
  ========================================================= */

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  /* =========================================================
     Results
  ========================================================= */

  const handleResults = (data) => {
    setResults(data);
    setActiveTab("2");
  };

  /* =========================================================
     Login
  ========================================================= */

  const handleLoginSuccess = () => {
    /*
     * Login.js should save these BEFORE calling onLogin():
     *
     * localStorage.setItem("token", ...)
     * localStorage.setItem("role", ...)
     */

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    setIsAuthenticated(true);

    const defaultTab = getDefaultTab();

    setActiveTab(defaultTab);

    navigate("/dashboard", {
      replace: true,
    });
  };

  /* =========================================================
     Logout
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    // If you intentionally want EVERYTHING cleared,
    // use localStorage.clear() instead.

    setIsAuthenticated(false);
    setActiveTab("0");
    setResults(null);

    navigate("/login", {
      replace: true,
    });
  };

  /* =========================================================
     Dashboard content
  ========================================================= */

  const renderDashboardContent = () => {
    switch (activeTab) {
      /* ================= Dashboard ================= */

      case "0":
        return <Dashboard />;

      case "1":
        return <FileUploadForm setResults={handleResults} />;

      case "2":
        return <ResultsView results={results} />;

      case "4":
        return <Settings />;

      /* ================= Loyalty ================= */

      case "5-1":
        return <Loyality />;

      case "5-2":
        return <LoyaltyCustomers />;

      case "5-3":
        return <MonthlyUpgrade />;

      case "5-4":
        return <LoyalityPromotions />;

      case "5-5":
        return <LoyaltyEmails />;

      case "5-7":
        return <MonthlyUpgradesTable />;

      case "5-8":
        return <LoyaltyEvaluationManager />;
      /* ================= Custom messages ================= */

      case "6-1":
        return <CustomSMS />;

      case "6-2":
        return <CustomEmails />;

      /* ================= Files ================= */

      case "7":
        return <FileManager />;

      case "8":
        return <WeeklyImagesManager />;

      /* ================= Reports ================= */

      case "9-1":
        return <RegistrationCountPage />;

      case "9-2":
        return <DailySalesSummery />;

      case "9-3":
        return <ReconciliationSummary />;

      case "9-4":
        return <DailyFullSummary />;

      case "9-5":
        return <DailyFullSummaryRecc />;

      /* ================= Order Management ================= */

      case "10-1":
        return <Overview />;

      case "10-2-1":
        return <OrderEntry />;

      case "10-2-2":
        return <Assignment />;

      case "10-2-3":
        return <UploadPage />;

      case "10-2-4":
        return <SplitPage />;

      case "10-2-5":
        return <DownloadPage />;

      /* ================= Winning Result Management ================= */

      case "10-3-1":
        return <ResultUpload />;

      case "10-3-2":
        return <ResultSplit />;

      case "10-3-3":
        return <ResultDownload />;

      /* ================= Super Admin ================= */

      case "11":
        return <SuperAdminUsersPage />;

      /* ================= Fallback ================= */

      default:
        return isFinancialUser() ? <Overview /> : <Dashboard />;
    }
  };

  /* =========================================================
     Routes
  ========================================================= */

  return (
    <Routes>
      {/* =====================================================
          ROOT
      ====================================================== */}

      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />

      {/* =====================================================
          LOGIN
      ====================================================== */}

      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={handleLoginSuccess} />
          )
        }
      />

      {/* =====================================================
          PUBLIC
      ====================================================== */}

      <Route path="/change-password" element={<ChangePassword />} />

      <Route path="/sms/welcome" element={<SmsWelcome />} />
<Route
  path="/loyalty-evaluation"
  element={<LoyaltyEvaluationManager />}
/>
      {/* =====================================================
          PROTECTED DASHBOARD
      ====================================================== */}

      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <DashboardLayout
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={handleLogout}
            >
              {renderDashboardContent()}
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* =====================================================
          UNKNOWN ROUTES
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />
    </Routes>
  );
}

export default App;
