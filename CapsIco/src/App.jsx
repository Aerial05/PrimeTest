import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

{
  // USER
}
import { Dashboard } from "./pages/user/dashboard/Dashboard";
import { LoginForm } from "./pages/user/logginginForm/LoginForm"; // Adjust the import path as necessary
import { RegisterForm } from "./pages/user/registeringForm/RegisterForm"; // Adjust the import path as necessary
import { AboutUs } from "./pages/user/aboutUs/AboutUs";
import { Contact } from "./pages/user/contact/Contact";
import { BookAppointment } from "./components/user/bookAppointment/BookAppointment";

{
  // ADMIN
}
import { StaffApointmentPending } from "./pages/admin/appointmentRequest/StaffApointmentPending";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {
          // USER
        }
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book-appointment" element={<BookAppointment />} />

        {
          // ADMIN
        }
        <Route path="/StaffApointmentPending" element={<StaffApointmentPending />} />

        {}
      </Routes>
    </BrowserRouter>
  );
}
