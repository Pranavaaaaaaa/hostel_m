// App.jsx

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseclient";
import AuthPage from "./AuthPage";
import Dashboard from "./Student_dashboard";
import WDashboard from "./Warden_dashboard";
import ADashboard from "./Admin_dashboard";
import PaymentPage from "./PaymentPage";
import ReceiptPage from "./ReceiptPage";

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
     const handleResize = () => setMatches(mediaQueryList.matches);

    // Add the listener
    window.addEventListener('resize', handleResize);

    // Clean up the listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, [query]);

  return matches;
};

const MobileBlocker = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6 text-center font-sans">
    <svg className="w-20 h-20 text-blue-400 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
    <h1 className="text-2xl font-bold">Desktop Experience Required</h1>
    <p className="mt-2 text-gray-400 max-w-sm">
      The Hostel Hub dashboard is designed for larger screens. Please turn on Desktop view on your browser or switch to a desktop or laptop to access the application.
    </p>
  </div>
);

const AppContent = () => {
  // This state will now track the role of the logged-in user
  const [userRole, setUserRole] = useState(null);
  const [blockId, setBlockId] = useState(null); // To store warden's block ID
  const [user, setUser] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // New state to control which page is visible
  const [currentPage, setCurrentPage] = useState('auth'); // auth, payment, dashboard
  const [pendingUserData, setPendingUserData] = useState(null); //temp hold for user info

  // This function is the "instruction" that was missing
  const handleProceedToPayment = (userData) => {
    setPendingUserData(userData);
    console.log("App: Proceeding to payment with user data:", userData);
    setCurrentPage('payment');
  };

    // This will be called from PaymentPage on success
  const handlePaymentSuccess = (student, payment) => {
    console.log("App: Payment successful. Showing receipt for:", student);
    setPendingUserData(null); // Clear the temporary data
    setReceiptData({ student, payment });
    setCurrentPage('receipt'); 
  };

  const handlePaymentFailure = () => {
  console.log("App: Payment failed. Returning to auth.");
  setPendingUserData(null);
  setCurrentPage('auth');
  };

  const handleGoToLogin = () => {
    setReceiptData(null); // Clear receipt data
    setCurrentPage('auth'); // Go to login page
  };

  // This function will be passed to AuthPage
  // It updates the state when a login is successful
  function handleLogin(role, id = null,userObject = null) {
    setUserRole(role);
    setUser(userObject);
    if (id) setBlockId(id);
    setCurrentPage('dashboard');
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null); setUser(null);
    setCurrentPage('auth');
  };

  // Check if a student is already logged in via Supabase session
  useEffect(() => {
    const checkSupabaseSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const curruser = data.session.user;
        setUser(curruser);
        if(curruser.email.includes("admin")) setUserRole("admin")

        else if(curruser.email.includes("ward")){
          const match = curruser.email.match(/warden(\d+)/);
          if (match && match[1]) {
            const id = parseInt(match[1], 10);
            setBlockId(id);
          }
          setUserRole("warden");
        }

        else setUserRole("student");

        setCurrentPage('dashboard');

      }
    };
    checkSupabaseSession();
  }, []);


  // --- Conditional Rendering ---

  if (currentPage === 'receipt') {
    return <ReceiptPage receiptData={receiptData} onGoToLogin={handleGoToLogin} />;
  }

  if (currentPage === 'payment') {
    return <PaymentPage 
        pendingUserData={pendingUserData}
        onPaymentSuccess={handlePaymentSuccess} 
        onPaymentFailure={handlePaymentFailure}
    />;
  }

  if (currentPage === 'dashboard' && userRole) {
    if (userRole === 'admin') {
      return <ADashboard onLogout={handleLogout} user={user} />;
    }
    if (userRole === 'warden') {
      return <WDashboard onLogout={handleLogout} user={user} blockId={blockId} />;
    }
    return <Dashboard onLogout={handleLogout} user={user} />;
  }
  
  // If no one is logged in, show the AuthPage
  return <AuthPage onLogin={handleLogin} onProceedToPayment={handleProceedToPayment} />;

};

function App() {
  // We use 1024px as the breakpoint for "desktop" (Tailwind's 'lg' breakpoint)
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // If it's a desktop, show the app. Otherwise, show the blocker message.
  return isDesktop ? <AppContent /> : <MobileBlocker />;
}

export default App;