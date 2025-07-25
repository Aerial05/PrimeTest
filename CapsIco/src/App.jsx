import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from './Pages/user/dashboard/Dashboard'; 
import { LoginForm } from './Pages/user/logginginForm/LoginForm'; // Adjust the import path as necessary
import { RegisterForm } from './Pages/user/registeringForm/RegisterForm'; // Adjust the import path as necessary
import { AboutUs } from './Pages/user/aboutUs/AboutUs';
import { Contact } from './Pages/user/contact/Contact';


export default function App() {
    return (
        <BrowserRouter>
            
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/register" element={<RegisterForm />} />
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/contact" element={<Contact />} />

                    
                </Routes>
            
        </BrowserRouter>
    );
}
