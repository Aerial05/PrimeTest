import React, { useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import "/src/styles/routeTransitions.css";

{
  // USER
}
import { Dashboard } from "./pages/user/dashboard/Dashboard";
// NEW LOGIN
import { Login } from "./pages/user/auth/Login";

import { AboutUs } from "./pages/user/aboutUs/AboutUs";
import { Contact } from "./pages/user/contact/Contact";
import { Services } from "./pages/user/Services/Services";
import { Appointment } from "./pages/user/bookAppointment/Appointment";
import { UserSettingsPage } from "./pages/user/settings/UserSettingsPage";
import { ProfileWithMeta } from "./pages/user/settings/ProfileWithMeta";

{
  // ADMIN
}
import { AdminDashboard } from "./pages/admin/adminDashboard/AdminDashboard";
import { Appointments } from "./pages/admin/appointments/Appointments";
import { AccountManagement } from "./pages/admin/accountManagement/AccountManagement";
import { ReportsPage } from "./pages/admin/reports/ReportsPage";
import { SettingsPage } from "./pages/admin/settings/SettingsPage";
import { PackagesPage } from "./pages/admin/packages/PackagesPage";
import { MessagesPage } from "./pages/admin/messages/MessagesPage";

//Components
import { NavBar } from "./components/user/navBar/NavBar";
import { HeaderInfoBar } from "./components/user/headerInfoBar/HeaderInfoBar";
import { Footer } from "./components/user/footer/Footer";

import { AdminNavBar } from "/src/components/admin/navbar/AdminNavbar";
import { AdminFooter } from "/src/components/admin/footer/AdminFooter";

function AnimatedRoutes({ admin }) {
  const location = useLocation();
  const nodeRef = useRef(null);

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition key={location.key} classNames="page" timeout={350} unmountOnExit nodeRef={nodeRef}>
        <div ref={nodeRef} className="page-wrapper">
          <Routes location={location}>
            {
              // USER
            }
            <Route
              path="/"
              element={admin ? <Navigate to="/admin-dashboard" replace /> : <Dashboard />}
            />

            {
              // NEW LOGIN
            }
            <Route path="/login" element={<Login />} />

            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/appointment" element={<Appointment />} />
            <Route path="/profile" element={<ProfileWithMeta />} />
            <Route path="/services" element={<Services />} />

            {
              // ADMIN
            }
            <Route path="/staff-management" element={<Appointments />} />
            <Route path="/account-management" element={<AccountManagement />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-reports" element={<ReportsPage />} />
            <Route path="/admin-settings" element={<SettingsPage />} />
            <Route path="/admin-packages" element={<PackagesPage />} />
            <Route path="/admin-messages" element={<MessagesPage />} />
          </Routes>
        </div>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default function App() {
  const Loggedin = false;
  const admin = false;

  return (
    <BrowserRouter>
      <div className="appShell">
  {admin ? (
        <AdminNavBar />
      ) : (
        <>
          <HeaderInfoBar />
          <NavBar />
        </>
      )}

      {
        // NEED LOGIC PARA SA RENDERING NG NAVBAR AND HEADER INFO BASED ON AUTHENTICATION STATUS
      }

      <main className="appMain">
        <AnimatedRoutes admin={admin} />
      </main>
  {admin ? <AdminFooter /> : <Footer />}
      </div>
    </BrowserRouter>
  );
}

//TO REMEMBER
// I INSTALLED LUCID
// REACT ICONS
// PATH
// REACT TRANSITION GROUP - FOR TRANSITIONS AT HINDI MAG SCROLL TO TOP
//THROUGH NPM


//TO USE LOCALY DO:
// npm install
// npm run dev
// IF WANT TO GET OUT ON NPM RUN DEV USE             Q+Enter 



/*

THINGS TO KNOW:
COMPONENTS SHOULD HAVE THE BULK OF THE LOGIC CODE.
PAGES SHOULD HAVE THE RENDERING AND PATH OF THE COMPONENTS

TRY TO KEEP THE FILE HIERARCHY CLEAN.




-ALL BACKEND IS MOSTLY SIMULATED. SINCE GAGAMITIN IS EITHER 
APIS OR BACKEDN FROM FIREBASE PAGKA NAGSETUP NA, ALL OF EM ARE NOW IN ARRAYS MUNA



Things to do.
appointment Page
profile sa navbar ng admin and user (DONE)

sa profile ng user, ilagay ung dropdown ng choices at yung logout button(DONE)


THIS VIOLATIONS AY DAHIL SA GOOGLE MAPS IFRAMES

[Violation] Permissions policy violation: accelerometer is not allowed in this document.
initialize @ sa.js:1516Understand this error
sa.js:1516 The deviceorientation events are blocked by permissions policy. See https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md#sensor-features
initialize @ sa.js:1516Understand this warning
index.js:67 [Violation] Permissions policy violation: accelerometer is not allowed in this document.
connect @ index.js:67Understand this error
index.js:67 The deviceorientation events are blocked by permissions policy. See https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md#sensor-features









*/
