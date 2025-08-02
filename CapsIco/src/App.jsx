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
import { BookAppointment } from "./components/user/bookAppointment/BookAppointment";

{
  // ADMIN
}
import { StaffApointmentPending } from "./pages/admin/appointmentRequest/StaffApointmentPending";

//Components
import { NavBar } from "./components/common/navBar/NavBar";
import { HeaderInfoBar } from "./components/user/HeaderInfoBar/HeaderInfoBar";
import { Footer } from "./components/common/footer/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <HeaderInfoBar />
      <NavBar />
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
        <Route path="/book-appointment" element={<BookAppointment />} />

        {
          // ADMIN
        }
        <Route
          path="/StaffApointmentPending"
          element={<StaffApointmentPending />}
        />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
