import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import SignUpPage from './SignUpPage';


export default function AuthPage({ onLogin, onProceedToPayment }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignUp, setShowSignUp] = useState(false);

  async function handleLogin() {
    // Prevent login if fields are empty
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
   
  // Login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Logged in successfully!");

    if(email.includes("admin")){
      onLogin("admin", null, data.user);
      console.log(data);
      return;
    }

    else if(email.includes("ward")){
      // Use a regular expression to find the number after "warden"
      const match = email.match(/warden(\d+)/);

      // Check if a match was found and it has a number
      if (match && match[1]) {
        // match[1] contains the captured number (as a string)
        const blockId = parseInt(match[1], 10); 
        
        // Log in the warden with the dynamically found blockId
        onLogin("warden", blockId, data.user);
        console.log(data);
        return;
      }
    }

    else{
      onLogin("student", null, data.user);
      console.log(data);
      return;
    }
  }
}

  // This function checks if the 'Enter' key was pressed
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

    if (showSignUp) {
    // Pass the new prop down to SignUpPage
    return <SignUpPage onBackToLogin={() => setShowSignUp(false)} onProceedToPayment={onProceedToPayment} />;
  }

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: 'auto'  }}>
      <h2>Hostel Management Auth</h2>
      <div style={{ marginBottom: 15 }}>
      <input
        type="email"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyPress} // Added this line
        style={{ width: '100%', padding: 8 }}
      />
      </div>
      <div style={{ marginBottom: 15 }}>
      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyPress} // Added this line
      />
      </div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => setShowSignUp(true)} style={{ padding: '10px 20px' }}>
        Sign Up
      </button>
    </div>
  );
}