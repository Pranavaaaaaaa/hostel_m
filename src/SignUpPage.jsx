import React, { useState } from 'react';
// No longer needs supabase client directly

export default function SignUpPage({ onBackToLogin, onProceedToPayment }) {
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomCapacity, setRoomCapacity] = useState(2);
  const [loading, setLoading] = useState(false); // We still use this for user feedback

  async function handleFormSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Package all the user's data into a single object
    const userData = {
      name,
      usn,
      email,
      password,
      chosen_capacity: roomCapacity,
    };

    onProceedToPayment(userData);
    
    // The component will be unmounted, so no need to setLoading(false)
  }

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: 'auto' }}>
      <h2>New Student Registration</h2>
      <form onSubmit={handleFormSubmit}>
        {/* All your input fields remain the same */}
        <div style={{ marginBottom: 15 }}><label>Full Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 5 }}/></div>
        <div style={{ marginBottom: 15 }}><label>USN</label><input type="text" value={usn} onChange={(e) => setUsn(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 5 }}/></div>
        <div style={{ marginBottom: 15 }}><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 5 }}/></div>
        <div style={{ marginBottom: 15 }}><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 5 }}/></div>
        <div style={{ marginBottom: 15 }}><label>Select Room Capacity</label><div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '5px' }}>{[1, 2, 3].map(cap => (<label key={cap} style={{ cursor: 'pointer' }}><input type="radio" name="capacity" value={cap} checked={roomCapacity === cap} onChange={() => setRoomCapacity(cap)} />{` ${cap}-Seater`}</label>))}</div></div>
        
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', width: '100%' }}>
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </form>
      <hr style={{ margin: '20px 0' }} />
      <button onClick={onBackToLogin}>Already have an account? Login</button>
    </div>
  );
}

