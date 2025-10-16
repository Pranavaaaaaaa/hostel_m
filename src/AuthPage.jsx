import React, { useState } from "react";
import { supabase } from "./supabaseclient";
import SignUpPage from './SignUpPage';



export default function AuthPage({ onLogin, onProceedToPayment }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignUp, setShowSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    // Prevent login if fields are empty
    if (!email || !password) {
      alert("Please enter both email and password.");
      setLoading(false);
      return;
    }
   
  // Login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    setError(error.message);
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
  setLoading(false);
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
  <div
    className="min-h-screen flex items-center justify-center bg-cover bg-center font-sans"
    style={{
      backgroundImage:
        "url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop')",
    }}
  >
    {/* Dark overlay for contrast */}
    <div className="absolute inset-0 bg-black bg-opacity-50"></div>

    {/* Centered translucent login form */}
    <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white">SJBIT HOSTEL HUB</h2>
        <p className="mt-2 text-sm text-gray-200">
          Welcome!! Please enter your details.
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-200"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter Email"
            className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-200"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Password"
            className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-md bg-blue-600/80 hover:bg-blue-700 text-white font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-200">
        Don’t have an account?{" "}
        <button
          onClick={() => setShowSignUp(true)}
          className="font-medium text-blue-300 hover:text-blue-200"
        >
          Sign Up
        </button>
      </p>
    </div>
  </div>
);


}