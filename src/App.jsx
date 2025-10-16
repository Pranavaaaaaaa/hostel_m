// App.jsx

import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseclient";
import AuthPage from "./AuthPage";
import Dashboard from "./Student_dashboard";
import WDashboard from "./Warden_dashboard";
import ADashboard from "./Admin_dashboard";
import PaymentPage from "./PaymentPage";
import ReceiptPage from "./ReceiptPage";

function App() {
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
  return <AuthPage onLogin={handleLogin} onProceedToPayment={handleProceedToPayment} />;}

export default App;