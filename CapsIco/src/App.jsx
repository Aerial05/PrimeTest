import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { onAuthStateChanged } from "firebase/auth";
import { ref, update as dbUpdate, get as dbGet } from 'firebase/database';
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
import { SettingsContent as ProfileSettingsContent } from "/src/pages/user/settings/Profile/SettingsContentUser";
import { RulesSettingsPage } from "/src/pages/user/settings/Rules/RulesSettingsPage";
import { AppointmentsSettingsPage } from "/src/pages/user/settings/Appointments/Appointments.SettingsPage";

// Admin pages
import { AdminDashboard } from "./pages/admin/adminDashboard/AdminDashboard";
import { Appointments } from "./pages/admin/appointments/Appointments";
import { AccountManagement } from "./pages/admin/accountManagement/AccountManagement";
import { ReportsPage } from "./pages/admin/reports/ReportsPage";
import { SettingsPage } from "./pages/admin/settings/SettingsPage";
import { PackagesPage } from "./pages/admin/Services/PackagesPage";
import { FeedbackPage } from "./pages/admin/feedback/FeedbackPage";

// Shared components
import { NavBar } from "./components/user/navBar/NavBar";
import { HeaderInfoBar } from "./components/user/headerInfoBar/HeaderInfoBar";
import { Footer } from "./components/user/footer/Footer";
import { AdminNavBar } from "/src/components/admin/navbar/AdminNavbar";
import { AdminHeaderInfoBar } from "/src/components/admin/headerInfoBar/AdminHeaderInfoBar";
import { AdminFooter } from "/src/components/admin/footer/AdminFooter";
import { BookingCard } from "./components/user/dashboard/bookingCard/BookingCard";
import { Chatbot } from "./components/shared/chatbot/Chatbot";

import authService from "./services/AuthService";
import { auth, usersDB } from "./config/firebase-config";

// Legacy /settings redirect helper to keep query params and map to new nested routes
function SettingsRedirect() {
  const location = useLocation();
  const qp = new URLSearchParams(location.search || '');
  const tab = (qp.get('tab') || '').toLowerCase();
  let to = '/profile';
  if (tab === 'history' || tab === 'appointments') to = '/profile/appointments';
  else if (tab === 'rules') to = '/profile/rules';
  else if (tab === 'profile') to = '/profile';
  return <Navigate to={to} replace />;
}

function AnimatedRoutes({ role, preferUserView, setIsHomePage }) {
  const location = useLocation();
  const nodeRef = useRef(null);

  // Track if we're on the home page
  useEffect(() => {
    setIsHomePage(location.pathname === '/');
  }, [location.pathname, setIsHomePage]);

  const isAdmin = role === "admin";
  const isLoggedIn = !!role;
  const allowAdminWelcome = (() => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem('allowLoginWelcome') === '1';
      }
    } catch (_e) {}
    return false;
  })();

  const guardAdminRoute = (element) =>
    isAdmin ? element : <Navigate to={isLoggedIn ? "/" : "/login"} replace />;

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition key={location.key} classNames="page" timeout={350} unmountOnExit nodeRef={nodeRef}>
        <div ref={nodeRef} className="page-wrapper">
          <Routes location={location}>
            <Route
              path="/"
              element={isAdmin && !preferUserView ? <Navigate to="/admin-dashboard" replace /> : <Dashboard />}
            />
            <Route
              path="/login"
              element={
                isLoggedIn
                  ? isAdmin
                    ? (allowAdminWelcome ? <Login /> : <Navigate to="/admin-dashboard" replace />)
                    : <Login />
                  : <Login />
              }
            />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/appointment" element={<Appointment />} />
            {/* Profile nested routes */}
            <Route path="/profile" element={<ProfileWithMeta />}>
              <Route index element={<ProfileSettingsContent />} />
              <Route path="appointments" element={<AppointmentsSettingsPage />} />
              <Route path="rules" element={<RulesSettingsPage />} />
            </Route>
            <Route path="/services" element={<Services />} />
            {/* Legacy settings route -> redirect to new /profile routes for known tabs; otherwise keep old page */}
            <Route path="/settings" element={<SettingsRedirect />} />
            <Route path="/settings/:rest*" element={<SettingsRedirect />} />

            <Route path="/appointment-management" element={guardAdminRoute(<Appointments />)} />
            {/* Back-compat redirect */}
            <Route path="/staff-management" element={<Navigate to="/appointment-management" replace />} />
            <Route path="/account-management" element={guardAdminRoute(<AccountManagement />)} />
            <Route path="/admin-dashboard" element={guardAdminRoute(<AdminDashboard />)} />
            <Route path="/admin-reports" element={guardAdminRoute(<ReportsPage />)} />
            <Route path="/admin-settings" element={guardAdminRoute(<SettingsPage />)} />
            <Route path="/admin-services" element={guardAdminRoute(<PackagesPage />)} />
            <Route path="/admin-feedback" element={guardAdminRoute(<FeedbackPage />)} />
            <Route path="/admin-messages" element={<Navigate to="/admin-feedback" replace />} />

            <Route path="*" element={<Navigate to={isAdmin ? "/admin-dashboard" : "/"} replace />} />
          </Routes>
        </div>
      </CSSTransition>
    </SwitchTransition>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const heartbeatRef = useRef(null);
  const [preferredDashboard, setPreferredDashboard] = useState('user');
  const [isHomePage, setIsHomePage] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Auto-sync provider to Realtime DB for this user
          try {
            const pids = (user.providerData || []).map(p => p.providerId).filter(Boolean);
            let providerId = 'password';
            if (pids.includes('google.com')) providerId = 'google.com';
            else if (pids.includes('facebook.com')) providerId = 'facebook.com';
            else if (pids.includes('password')) providerId = 'password';
            else providerId = pids[0] || 'password';
            const userRef = ref(usersDB, `users/${user.uid}`);
            await dbUpdate(userRef, {
              authProvider: providerId,
              email: user.email || '',
              lastLoginAt: new Date().toISOString(),
            });
            // Ensure createdAt exists for provider-based first-time sign-ins
            try {
              const createdSnap = await dbGet(ref(usersDB, `users/${user.uid}/createdAt`));
              if (!createdSnap.exists() || !createdSnap.val()) {
                const created = user.metadata?.creationTime || new Date().toISOString();
                await dbUpdate(userRef, { createdAt: created });
              }
            } catch (_inner) {
              // best-effort; ignore
            }
          } catch (e) {
            console.warn('Failed to sync auth provider to DB', e);
          }

          const fetchedRole = await authService.getUserRole(user);
          const normalized = (fetchedRole || '').toString().trim().toLowerCase();
          setRole(normalized === "admin" ? "admin" : "user");

          // Remove lastActive/updatedAt heartbeat. Only lastLoginAt is tracked on sign-in.
        } catch (error) {
          console.warn("Failed to resolve user role", error);
          setRole("user");
        }
      } else {
        setRole(null);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = role === "admin";
  const preferUserView = isAdmin && preferredDashboard === 'user';

  useEffect(() => {
    // Sync preferredDashboard from localStorage when role changes
    try {
      if (isAdmin) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('preferredDashboard') : null;
        setPreferredDashboard(stored || 'admin');
      } else {
        setPreferredDashboard('user');
      }
    } catch (_e) {
      setPreferredDashboard(isAdmin ? 'admin' : 'user');
    }
  }, [isAdmin]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'preferredDashboard') {
        setPreferredDashboard(e.newValue || (isAdmin ? 'admin' : 'user'));
      }
    };
    const onPreferredChanged = (e) => {
      const val = e && e.detail ? String(e.detail) : null;
      if (val === 'admin' || val === 'user') {
        setPreferredDashboard(val);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      window.addEventListener('preferred-dashboard-changed', onPreferredChanged);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('preferred-dashboard-changed', onPreferredChanged);
      }
    };
  }, [isAdmin]);

  return (
    <BrowserRouter>
      <div className="appShell">
        {checkingAuth ? null : isAdmin && !preferUserView ? (
          <>
            <AdminHeaderInfoBar />
            <AdminNavBar />
          </>
        ) : (
          <>
            <HeaderInfoBar />
            <NavBar />
          </>
        )}

        <main className="appMain">
          {!checkingAuth && <AnimatedRoutes role={role} preferUserView={preferUserView} setIsHomePage={setIsHomePage} />}
        </main>

        {checkingAuth ? null : isAdmin && !preferUserView ? <AdminFooter /> : <Footer />}
        
        {/* Floating Booking Button - Visible only on home page for user view */}
        {!checkingAuth && (!isAdmin || preferUserView) && isHomePage && (
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '1.5rem',
            zIndex: 9999,
            animation: 'floatIn 0.5s ease-out',
            filter: 'drop-shadow(0 8px 24px rgba(124, 58, 237, 0.3))',
            pointerEvents: 'auto'
          }}>
            <BookingCard align="left" />
          </div>
        )}

        {/* Floating AI Chatbot - Visible on main user-facing pages */}
        {!checkingAuth && (!isAdmin || preferUserView) && (
          // Show on home, services, about, contact and appointment pages
          ['/','/dashboard','/services','/about','/contact','/appointment'].includes(window.location.pathname.toLowerCase()) && (
            <Chatbot />
          )
        )}
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



Things to do. URGENT 
DOUBLE CHECK THE Flow of the Appointments Page
1. When user selects a service, the details of the service must appear in the right side
2. The user must be able to select the date and time after selecting the service
3. The user must be able to select the staff after selecting the date and time
4. The user must be able to see the summary of the appointment before confirming
5. The user must be able to confirm the appointment and see a success message

PROFILE
Must have appointment history (Picture na galing sa Prime medical lab (proof successful appointment))

USE Object Oriented Programming IN ALL OF THE BACKEND CODES

1. Create Classes for Accounts, Services, Appointments, Reports
2. Create Methods for CRUD operations
3. Integrate the classes and methods to the components and pages that needs them

BACKEND: 
1. Admin account (google/facebook) must go to admin dashboard (done)
2. User account (google/facebook) must go to user dashboard (done)
3. Admin must be able to manage accounts (CRUD) (done)
4. Services(Packages and Single Services) must come from database and can be edited and be Added in admin panel
   Attributes per Service: 11
5. Services in the Appointment Page (Browse Services) must update based on the Services in the database and
 must have appropriate attributes (must have same attributes per Service)
 when Appointment is confirmed, the appointment must be saved in the database with appropriate attributes
 and can be managed in admin panel
 When choosing time, the available time slots must be updated based on 
 timeslots already booked in the database(check for conflicts(Service, Date, Time(Especially for Surgical Procedures)))

6. Accounts must come from database and can be edited in admin panel
7. Reports must be generated from database and can be viewed in admin panel

Admin must insert image per successful appointment and Users must be able to view the image in their profile appointment history

8. Messages must be stored in database and can be viewed in admin panel
9. Contact form must send message to database and can be viewed in admin panel
            

NEW TO DO(DONE):
AUTOMATE Email after 10 mins Send an Approved Appointment
  if Service has Per Appointment (this must be manualy approved in the admin panel)

Send Email per Update of Status of Appointment (Approved, Declined, Successful)
  + if successful, include image link if available 
  



  

NEW TO DO(Finishings): 
Dashboard include reports for the feedback

Add a Activity log on the recent activity on the dashboard (call all actions done by an admin
 (editing account management, appointments, curd services, sending email to a feedback and such))

Services should be seen complete in the screen (no need to scroll), 
Add tab for checking of list of services and packages (so no need to scroll to bottom)
  on the list of services and packages should have pagination so no need to scroll








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
