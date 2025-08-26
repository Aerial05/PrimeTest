import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

{
  // USER
}
import { Dashboard } from "./pages/user/dashboard/Dashboard";
// NEW LOGIN
import { Login } from "./pages/user/auth/Login";

import { AboutUs } from "./pages/user/aboutUs/AboutUs";
import { Contact } from "./pages/user/contact/Contact";
import { Appointment } from "./pages/user/bookAppointment/Appointment";
import { UserSettingsPage } from "./pages/user/settings/UserSettingsPage";

{
  // ADMIN
}
import { AdminDashboard } from "./pages/admin/adminDashboard/AdminDashboard";
import { StaffManagement } from "./pages/admin/staffManagement/StaffManagement";
import { ReportsPage } from "./pages/admin/reports/ReportsPage";
import { SettingsPage } from "./pages/admin/settings/SettingsPage";

//Components
import { NavBar } from "./components/user/navBar/NavBar";
import { HeaderInfoBar } from "./components/user/HeaderInfoBar/HeaderInfoBar";
import { Footer } from "./components/user/footer/Footer";

import { AdminNavBar } from "/src/components/admin/navbar/AdminNavbar";

export default function App() {
  const Loggedin = true;
  const admin = false;

  return (
    <BrowserRouter>
      {Loggedin && admin ? (
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

      <Routes>
        {
          // USER
        }
        <Route path="/" element={<Dashboard />} />

        {
          // NEW LOGIN
        }
        <Route path="/login" element={<Login />} />

        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/appointment" element={<Appointment />} />
        <Route path="/profile" element={<UserSettingsPage />} />

        {
          // ADMIN
        }
        <Route path="/staff-management" element={<StaffManagement />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-reports" element={<ReportsPage />} />
        <Route path="/admin-settings" element={<SettingsPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

//TO REMEMBER
// I INSTALLED LUCID
// REACT ICONS
// PATH
// REACT TRANSITION GROUP - FOR TRANSITIONS AT HINDI MAG SCROLL TO TOP
//THROUGH NPM

/*

THINGS TO KNOW:
COMPONENTS SHOULD HAVE THE BULK OF THE LOGIC CODE.
PAGES SHOULD HAVE THE RENDERING AND PATH OF THE COMPONENTS

TRY TO KEEP THE FILE HIERARCHY CLEAN.




-ALL BACKEND IS MOSTLY SIMULATED. SINCE GAGAMITIN IS EITHER 
APIS OR BACKEDN FROM FIREBASE PAGKA NAGSETUP NA, ALL OF EM ARE NOW IN ARRAYS MUNA



Things to do.
appointment - look for lates, hanapin ni ico
profile sa navbar ng admin and user

sa profile ng user, ilagay ung dropdown ng choices at yung logout button


THIS VIOLATIONS AY DAHIL SA GOOGLE MAPS IFRAMES
KAYO NA BAHALA KUNG NU GAGAWEN

[Violation] Permissions policy violation: accelerometer is not allowed in this document.
initialize @ sa.js:1516Understand this error
sa.js:1516 The deviceorientation events are blocked by permissions policy. See https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md#sensor-features
initialize @ sa.js:1516Understand this warning
index.js:67 [Violation] Permissions policy violation: accelerometer is not allowed in this document.
connect @ index.js:67Understand this error
index.js:67 The deviceorientation events are blocked by permissions policy. See https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md#sensor-features









*/
