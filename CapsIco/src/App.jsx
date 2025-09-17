import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { onAuthStateChanged } from "firebase/auth";
import "/src/styles/routeTransitions.css";

// User pages
import { Dashboard } from "./pages/user/dashboard/Dashboard";
import { Login } from "./pages/user/auth/Login";
import { AboutUs } from "./pages/user/aboutUs/AboutUs";
import { Contact } from "./pages/user/contact/Contact";
import { Services } from "./pages/user/Services/Services";
import { Appointment } from "./pages/user/bookAppointment/Appointment";
import { UserSettingsPage } from "./pages/user/settings/UserSettingsPage";
import { ProfileWithMeta } from "./pages/user/settings/ProfileWithMeta";

// Admin pages
import { AdminDashboard } from "./pages/admin/adminDashboard/AdminDashboard";
import { Appointments } from "./pages/admin/appointments/Appointments";
import { AccountManagement } from "./pages/admin/accountManagement/AccountManagement";
import { ReportsPage } from "./pages/admin/reports/ReportsPage";
import { SettingsPage } from "./pages/admin/settings/SettingsPage";
import { PackagesPage } from "./pages/admin/packages/PackagesPage";
import { MessagesPage } from "./pages/admin/messages/MessagesPage";

// Shared components
import { NavBar } from "./components/user/navBar/NavBar";
import { HeaderInfoBar } from "./components/user/headerInfoBar/HeaderInfoBar";
import { Footer } from "./components/user/footer/Footer";
import { AdminNavBar } from "/src/components/admin/navbar/AdminNavbar";
import { AdminFooter } from "/src/components/admin/footer/AdminFooter";

import authService from "./services/AuthService";
import { auth } from "./config/firebase-config";

const getPreferredDashboard = () => {
  if (typeof window === "undefined") return "user";
  return localStorage.getItem("preferredDashboard") || "user";
};

function AnimatedRoutes({ role }) {
  const location = useLocation();
  const nodeRef = useRef(null);

  const isAdmin = role === "admin";
  const isLoggedIn = !!role;
  const preferredDashboard = isAdmin ? getPreferredDashboard() : "user";

  const guardAdminRoute = (element) =>
    isAdmin ? element : <Navigate to={isLoggedIn ? "/" : "/login"} replace />;

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition key={location.key} classNames="page" timeout={350} unmountOnExit nodeRef={nodeRef}>
        <div ref={nodeRef} className="page-wrapper">
          <Routes location={location}>
            <Route
              path="/"
              element={isAdmin && preferredDashboard === "admin" ? (
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <Dashboard />
              )}
            />
            <Route
              path="/login"
              element={isLoggedIn ? (
                <Navigate
                  to={preferredDashboard === "admin" ? "/admin-dashboard" : "/"}
                  replace
                />
              ) : (
                <Login />
              )}
            />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/appointment" element={<Appointment />} />
            <Route path="/profile" element={<ProfileWithMeta />} />
            <Route path="/services" element={<Services />} />
            <Route path="/settings/*" element={<UserSettingsPage />} />

            <Route path="/staff-management" element={guardAdminRoute(<Appointments />)} />
            <Route path="/account-management" element={guardAdminRoute(<AccountManagement />)} />
            <Route path="/admin-dashboard" element={guardAdminRoute(<AdminDashboard />)} />
            <Route path="/admin-reports" element={guardAdminRoute(<ReportsPage />)} />
            <Route path="/admin-settings" element={guardAdminRoute(<SettingsPage />)} />
            <Route path="/admin-packages" element={guardAdminRoute(<PackagesPage />)} />
            <Route path="/admin-messages" element={guardAdminRoute(<MessagesPage />)} />

            <Route
              path="*"
              element={<Navigate to={preferredDashboard === "admin" ? "/admin-dashboard" : "/"} replace />}
            />
          </Routes>
        </div>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const fetchedRole = await authService.getUserRole(user);
          setRole(fetchedRole === "admin" ? "admin" : "user");
        } catch (error) {
          console.warn("Failed to resolve user role", error);
          setRole("user");
        }
      } else {
        setRole(null);
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = role === "admin";
  const preferredDashboard = isAdmin ? getPreferredDashboard() : "user";

  return (
    <BrowserRouter>
      <div className="appShell">
        {checkingAuth ? null : isAdmin && preferredDashboard === "admin" ? (
          <AdminNavBar />
        ) : (
          <>
            <HeaderInfoBar />
            <NavBar />
          </>
        )}

        <main className="appMain">
          {!checkingAuth && <AnimatedRoutes role={role} />}
        </main>

        {checkingAuth ? null : isAdmin && preferredDashboard === "admin" ? <AdminFooter /> : <Footer />}
      </div>
    </BrowserRouter>
  );
}
