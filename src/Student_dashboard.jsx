import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseclient';

const ConfirmationModal = ({ title, message, onConfirm, onCancel, isProcessing, confirmText, processingText }) => (
    <div style={styles.modalBackdrop}>
        <div style={styles.modalContent}>
            <h3 style={{marginTop: 0}}>{title || 'Confirmation'}</h3>
            <p>{message}</p>
            <div style={styles.modalActions}>
                <button onClick={onCancel} disabled={isProcessing} style={styles.cancelButton}>Cancel</button>
                <button onClick={onConfirm} disabled={isProcessing} style={styles.confirmButton}>
                    {isProcessing ? (processingText || 'Processing...') : (confirmText || 'Confirm')}
                </button>
            </div>
        </div>
    </div>
);


export default function Dashboard({ user, onLogout }) {
  const [studentProfile, setStudentProfile] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Electrical');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchStudentData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Fetch student profile (including 'arrived?' status)
    const { data: profile, error: profileError } = await supabase
      .from('students')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching student profile:', profileError);
    } else {
      setStudentProfile(profile);
      // If the student has arrived, fetch their complaints
      if (profile['arrived?']) {
        const { data: complaintsData, error: complaintsError } = await supabase
          .from('complaints')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        
        if (complaintsError) console.error('Error fetching complaints:', complaintsError);
        else setComplaints(complaintsData);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    if (!description) {
        alert('Please provide a description for your complaint.');
        return;
    }
    setSubmitting(true);

    const { error } = await supabase
      .from('complaints')
      .insert({
        student_id: user.id,
        category,
        description,
        status: 'Pending'
      });

    if (error) {
      alert('Failed to submit complaint: ' + error.message);
    } else {
      alert('Complaint submitted successfully!');
      setDescription(''); // Reset form
      fetchStudentData(); // Refresh complaints list
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div style={styles.container}>Loading your dashboard...</div>;
  }

  // Conditional view based on arrival status
  if (!studentProfile || !studentProfile['arrived?']) {
    return (
      <div style={styles.container}>
        {showLogoutConfirm && (
          <ConfirmationModal
            title="Confirm Logout"
            message="Are you sure you want to log out?"
            onConfirm={onLogout}
            onCancel={() => setShowLogoutConfirm(false)}
            isProcessing={false}
            confirmText="Logout"
          />
        )}
        <header style={styles.header}>
          <h2>Student Dashboard</h2>
          <button onClick={() => setShowLogoutConfirm(true)}>Logout</button>
        </header>
        <main style={styles.waitingContainer}>
          <h3>Welcome, {studentProfile?.name || user.email}!</h3>
          <p>Your dashboard is not yet active.</p>
          <p>Please complete your physical check-in at the hostel. The warden will then approve your arrival and activate your account features.</p>
        </main>
      </div>
    );
  }

  // Full dashboard for arrived students
  return (
    <div style={styles.container}>
      {showLogoutConfirm && (
          <ConfirmationModal
            title="Confirm Logout"
            message="Are you sure you want to log out?"
            onConfirm={onLogout}
            onCancel={() => setShowLogoutConfirm(false)}
            isProcessing={false}
            confirmText="Logout"
          />
        )}
      <header style={styles.header}>
        <h2>Student Dashboard</h2>
        <button onClick={() => setShowLogoutConfirm(true)}>Logout</button>
      </header>
      <main style={styles.main}>
        <div style={styles.profileBox}>
            <h3>Welcome, {studentProfile.name}!</h3>
            <p><strong>USN:</strong> {studentProfile.USN}</p>
            <p><strong>Room No:</strong> {studentProfile.room_no}</p>
        </div>
        <div style={styles.complaintSection}>
            <h3>Lodge a New Complaint</h3>
            <form onSubmit={handleComplaintSubmit} style={styles.form}>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
                    <option>Electrical</option>
                    <option>Plumbing</option>
                    <option>Furniture</option>
                    <option>Wi-Fi</option>
                    <option>Other</option>
                </select>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows="4"
                    style={styles.textarea}
                />
                <button type="submit" disabled={submitting} style={styles.button}>
                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
            </form>
        </div>
        <div style={styles.complaintList}>
            <h3>Your Complaint History</h3>
            {complaints.length > 0 ? (
                complaints.map(c => (
                    <div key={c.id} style={styles.complaintItem}>
                        <span style={{...styles.status, ...styles[c.status.toLowerCase()]}}>{c.status}</span>
                        <div><strong>{c.category}</strong>: {c.description}</div>
                        <small>{new Date(c.created_at).toLocaleString()}</small>
                    </div>
                ))
            ) : <p>You have no past complaints.</p>}
        </div>
      </main>
    </div>
  );
}

const styles = {
    container: { fontFamily: 'Arial, sans-serif', backgroundColor: '#1e1e1eff', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: 'black', borderBottom: '1px solid #ddd' },
    main: { padding: '20px' },
    waitingContainer: { padding: '40px', textAlign: 'center' },
    profileBox: { backgroundColor: 'grey', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    complaintSection: { backgroundColor: 'grey', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
    textarea: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc', resize: 'vertical' },
    button: { padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    complaintList: { backgroundColor: 'grey', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    complaintItem: { borderBottom: '1px solid #eee', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' },
    status: { padding: '4px 8px', borderRadius: '12px', color: 'white', fontSize: '12px', fontWeight: 'bold' },
    pending: { backgroundColor: '#ffc107' },
    resolved: { backgroundColor: '#28a745' },
    modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '400px', textAlign: 'center', color: "black" },
    modalActions: { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' },
    confirmButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
    cancelButton: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
};
