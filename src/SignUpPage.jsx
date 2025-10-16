import React, {useState } from 'react';

export default function SignUpPage({ onBackToLogin, onProceedToPayment }) {
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const userData = { name, usn, email, password, chosen_capacity: roomCapacity };
    onProceedToPayment(userData);
  };

  // Helper to determine the slider's position based on the selected capacity
  const sliderPositionClass = () => {
    if (roomCapacity === 1) return 'translate-x-0';
    if (roomCapacity === 2) return 'translate-x-full'; // translate-x-full is 100%
    if (roomCapacity === 3) return 'translate-x-[200%]'; // translate-x-[200%] is 200%
    return 'translate-x-full'; // Default case
  };

  return (
    <div className="min-h-screen bg-cover bg-center font-sans" style={{backgroundImage: "url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop')"}}>
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-black bg-opacity-50">
        
        <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white tracking-tight">Create an Account</h2>
            <p className="mt-2 text-gray-300">Join The Hostel Hub community.</p>
          </div>
          <br></br>
          <form className="space-y-5" onSubmit={handleFormSubmit}>
            {/* ... (Name, USN, Email, Password inputs remain the same) ... */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
              </div>
              <div>
                <label htmlFor="usn" className="block text-sm font-medium text-gray-300">USN</label>
                <input id="usn" type="text" value={usn} onChange={(e) => setUsn(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/30 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-300"/>
            </div>

            {/* --- THIS IS THE NEW, ANIMATED SLIDER COMPONENT --- */}
            <fieldset className="pt-2">
                <legend className="block text-sm font-medium text-gray-300 mb-2">Select Room Capacity</legend>
                <div className="relative flex w-full bg-gray-800/50 p-1 rounded-lg">
                    {/* The sliding blue background */}
                    <div 
                        className={`absolute top-1 left-1 h-[calc(100%-0.5rem)] w-[calc((100%-0.5rem)/3)] bg-blue-600 rounded-md transition-transform duration-10 ease-in-out ${sliderPositionClass()}`}
                    />
                    
                    {/* The three clickable label options */}
                    {[1, 2, 3].map(cap => (
                    <label key={cap} className="relative z-10 flex-1 text-center cursor-pointer p-2 rounded-md">
                        <input type="radio" name="capacity" value={cap} checked={roomCapacity === cap} onChange={() => setRoomCapacity(cap)} className="sr-only"/>
                        <span className={`text-sm font-semibold transition-colors duration-100 ${roomCapacity === cap ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                            {cap} Occupancy
                        </span>
                    </label>
                    ))}
                </div>
            </fieldset>
            
            <div>
              <button type="submit" disabled={loading} className="w-full mt-4 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition">
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button onClick={onBackToLogin} className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

