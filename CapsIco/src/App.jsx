import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

{
  // USER
}
import { Dashboard } from "./pages/user/dashboard/Dashboard";
//OLD LOG IN IS HERE
//import { LoginForm } from "./pages/user/logginginForm/LoginForm";
//import { RegisterForm } from "./pages/user/registeringForm/RegisterForm";

// NEW LOGIN
import { Login } from "./pages/user/auth/Login";

import { AboutUs } from "./pages/user/aboutUs/AboutUs";
import { Contact } from "./pages/user/contact/Contact";
import { Appointment } from "./pages/user/bookAppointment/Appointment";

{
  // ADMIN
}
import { StaffManagement } from "./pages/admin/staffManagement/StaffManagement";


//Components
import { NavBar } from "./components/common/navBar/NavBar";
import { HeaderInfoBar } from "./components/user/HeaderInfoBar/HeaderInfoBar";
import { Footer } from "./components/common/footer/Footer";

import { AdminNavBar } from '/src/components/admin/navbar/AdminNavbar';

export default function App() {
  return (
    <BrowserRouter>
      <HeaderInfoBar />
      <NavBar />

      {
        // NEED LOGIC PARA SA RENDERING NG NAVBAR AND HEADER INFO BASED ON AUTHENTICATION STATUS
      }

      <Routes>
        {
          // USER
        }
        <Route path="/" element={<Dashboard />} />

        {
          // OLD LOGIN AND REGISTER
          /*      <Route path="/register" element={<RegisterForm />} />
        <Route path="/login" element={<LoginForm />} />
        */
        }
        {
          // NEW LOGIN
        }
        <Route path="/login" element={<Login />} />

        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/appointment" element={<Appointment />} />

        {
          // ADMIN
        }
        <Route path="/staff-management" element={<StaffManagement />} />

      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
