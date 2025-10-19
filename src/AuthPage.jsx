import React, { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseclient";

const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setCanvasSize();

        let particlesArray = [];
        const numberOfParticles = 100;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
                this.x += this.speedX;
                this.y += this.speedY;
            }
            draw() {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            particlesArray = [];
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        };
        init();

        const connect = () => {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                                 + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 20000);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            connect();
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            setCanvasSize();
            init();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, background: '#111827' }} />;
};

export default function AuthPage({ onLogin, onProceedToPayment }) {
  // State to control which view is visible: 'login' or 'signup'
  const [view, setView] = useState('login');

  // State for Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');

  // State for Sign Up form
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [loadingSignUp, setLoadingSignUp] = useState(false);

  async function handleLogin() {
    setLoadingLogin(true);
    setErrorLogin('');
    // Prevent login if fields are empty
    if (!email || !password) {
      setErrorLogin("Please enter both email and password.");
      setLoadingLogin(false);
      return;
    }
   
  // Login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    setErrorLogin(error.message);
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
  setLoadingLogin(false);
}

  const handleSignUp = (e) => {
    e.preventDefault();
    setLoadingSignUp(true);
    const userData = { name, usn, email: signUpEmail, password: signUpPassword, chosen_capacity: roomCapacity };
    onProceedToPayment(userData);
  };

  const sliderPositionClass = () => {
    if (roomCapacity === 1) return 'translate-x-0';
    if (roomCapacity === 2) return 'translate-x-[50%]';
    if (roomCapacity === 3) return 'translate-x-[100%]';
    return 'translate-x-[50%]';
  };

return (
    <div className="min-h-screen font-sans">
      <ParticleBackground />
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        
        {/* The main container card that will animate its height */}
        <div className={`relative z-10 w-full max-w-md space-y-8 p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 transition-[height] duration-100 ease-in-out ${view === 'login' ? 'h-[580px]' : 'h-[760px]'}`}>
            <div className="relative h-full overflow-hidden p-8">

              {/* --- LOGIN FORM --- */}
              <div className={`absolute inset-0 p-8 flex flex-col justify-center transition-all duration-200 ease-in-out ${view === 'login' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="flex justify-center items-center gap-4 mb-8">
                    <img src="https://sjbit.edu.in/wp-content/uploads/2021/06/sjbit-new-logo.png" alt="SJBIT Logo" className="h-16 w-16"/>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">The Hostel Hub</h2>
                        <p className="mt-1 text-gray-300">Sign in to your account.</p>
                    </div>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    {/* ... Login email and password inputs ... */}
                    <div className="relative">
                        <input id="email" type="email" placeholder=" " required value={email} onChange={(e) => setEmail(e.target.value) } className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
                        <label htmlFor="email" className="absolute left-0 -top-5 text-sm text-gray-400 ...">Email address</label>
                    </div>
                     <div className="relative">
                        <input id="password" type="password" placeholder=" " required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
                        <label htmlFor="password" className="absolute left-0 -top-5 text-sm text-gray-400 ...">Password</label>
                    </div>
                    {errorLogin && <p className="text-sm text-red-400 text-center">{errorLogin}</p>}
                    <button type="submit" disabled={loadingLogin} className="w-full py-3 px-4 rounded-md bg-blue-600/80 hover:bg-blue-700 text-white font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-300">{loadingLogin ? "Signing In..." : "Sign In"}</button>
                </form>
                <p className="mt-8 text-center text-sm text-gray-400">
                    Don’t have an account? <button onClick={() => setView('signup')} className="font-medium text-blue-400 hover:text-blue-300">Sign Up</button>
                </p>
              </div>

              {/* --- SIGN UP FORM --- */}
              <div className={`absolute inset-0 p-8 flex flex-col justify-center transition-all duration-200 ease-in-out ${view === 'signup' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                 <div className="flex justify-center items-center gap-6 mb-4">
                    <img src="https://sjbit.edu.in/wp-content/uploads/2021/06/sjbit-new-logo.png" alt="SJBIT Logo" className="h-16 w-16"/>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Create Account</h2>
                        <p className="mt-1 text-gray-300">Join The Hostel Hub.</p>
                    </div>
                </div>
                <form className="space-y-5" onSubmit={handleSignUp}>
                   {/* ... Sign up inputs and slider ... */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="relative">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                        <input id="name" type="text" placeholder=" " value={name} onChange={(e) => setName(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/> 
                      </div>
                      <div className="relative">
                        <label htmlFor="usn" className="block text-sm font-medium text-gray-300">USN</label>
                        <input id="usn" type="text" placeholder=" " value={usn} onChange={(e) => setUsn(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
                      </div>
                   </div>
                    <div className="relative pt-2">
                        <label htmlFor="signUpEmail" className="block text-sm font-medium text-gray-300">Email Address</label>
                        <input id="signUpEmail" type="email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
                    </div>
                    <div className="relative pt-2">
                        <label htmlFor="signUpPassword" className="block text-sm font-medium text-gray-300">Password</label>
                        <input id="signUpPassword" type="password" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
                    </div>


                   <fieldset className="pt-2">
                        <legend className="block text-sm font-medium text-gray-300 mb-2">Select Room Capacity</legend>
                        <div className="relative flex w-full bg-gray-800/50 p-1 rounded-lg">
                            <div className={`absolute top-1 left-1 h-[calc(100%-0.5rem)] w-[calc((100%-0.5rem)/3)] bg-blue-600 rounded-md transition-transform duration-170 ease-in-out ${sliderPositionClass()}`}/>
                            {[1, 2, 3].map(cap => (
                            <label key={cap} className="relative z-10 flex-1 text-center cursor-pointer p-2 rounded-md">
                                <input type="radio" name="capacity" value={cap} checked={roomCapacity === cap} onChange={() => setRoomCapacity(cap)} className="sr-only"/>
                                <span className={`text-sm font-semibold transition-colors duration-100 ${roomCapacity === cap ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                                    {cap}-Seater
                                </span>
                            </label>
                            ))}
                        </div>
                    </fieldset>


                   <button type="submit" disabled={loadingSignUp} className="w-full mt-4 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition">{loadingSignUp ? 'Processing...' : 'Proceed to Payment'}</button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-400">
                    Already have an account? <button onClick={() => setView('login')} className="font-medium text-blue-400 hover:text-blue-300">Sign In</button>
                </p>
              </div>

            </div>
        </div>
      </div>
    </div>
  );


}