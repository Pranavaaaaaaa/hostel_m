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

export default function WDashboard({ user, onLogout, blockId }) {
  const [students, setStudents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals' or 'complaints'
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchDataForBlock = useCallback(async () => {
    if (!blockId) {
      console.log("Warden has no blockId. Aborting fetch.");
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log(`Warden fetching data for Block ID: ${blockId}`);

    const { data: roomsInBlock, error: roomsError } = await supabase
      .from('rooms').select('id').eq('hostel_id', blockId);
    if (roomsError) { console.error('Error fetching rooms:', roomsError); setLoading(false); return; }
    
    console.log('Step 1: Found rooms in this block:', roomsInBlock);
    const roomIds = (roomsInBlock || []).map(room => room.id);
    if (roomIds.length === 0) {
      console.log("No rooms found for this block. Cannot fetch students or complaints.");
      setStudents([]);
      setComplaints([]);
      setLoading(false);
      return;
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from('students').select('*').in('room_no', roomIds).order('room_no');
    if (studentsError) { console.error('Error fetching students:', studentsError); } 
    else { setStudents(studentsData || []); }
    console.log('Step 2: Found students in those rooms:', studentsData);

    const studentIds = (studentsData || []).map(s => s.id);
    if (studentIds.length > 0) {  
        const { data: complaintsData, error: complaintsError } = await supabase
            .from('complaints').select('*, students!complaints_student_id_fkey!inner(name, room_no)')
            .in('student_id', studentIds)
            .order('created_at', { ascending: true });
        if (complaintsError) { console.error('Error fetching complaints:', complaintsError); }
        else { setComplaints(complaintsData || []); }
        console.log('Step 3: Found complaints for those students:', complaintsData);
    } else {
        console.log("No students found in this block's rooms, so no complaints to fetch.");
        setComplaints([]);
    }
    setLoading(false);
  }, [blockId]);

  useEffect(() => {
    fetchDataForBlock();
  }, [fetchDataForBlock]);

  const handleMarkAsArrived = async (studentId) => {
    // --- THIS IS THE FIX ---
    // We now update both the boolean and the new timestamp column.
    const { error } = await supabase
      .from('students')
      .update({ 
          'arrived?': true,
          'arrival_timestamp': new Date().toISOString() // Set the current time
      })
      .eq('id', studentId);

    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      // Update the state locally for an instant UI change
      setStudents(currentStudents =>
        currentStudents.map(student =>
          student.id === studentId ? { ...student, 'arrived?': true, 'arrival_timestamp': new Date().toISOString() } : student
        )
      );
    }
  };

  const handleForwardToAdmin = async (complaintId) => {
    const { error } = await supabase.from('complaints').update({ status: 'Forwarded to Admin' }).eq('id', complaintId);
    if (error) { alert('Failed to forward complaint: ' + error.message); }
    else {
        alert('Complaint has been forwarded to the admin.');
        // Update UI instantly
        setComplaints(current => current.map(c => c.id === complaintId ? { ...c, status: 'Forwarded to Admin' } : c));
    }
  };

  const renderArrivalsTable = () => (
    <div style={styles.tableContainer}>
      <h3>Student Arrival Status</h3>
      <table style={styles.table}>
        <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>ID</th><th style={styles.th}>Email</th><th style={styles.th}>Room No</th><th style={styles.th}>Arrival Status</th></tr></thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td style={styles.td}>{student.name}</td>
              <td style={styles.td}>{student.id}</td>
              <td style={styles.td}>{student.email}</td>
              <td style={styles.td}>{student.room_no}</td>
              <td style={styles.td}>
                {student['arrived?'] ? (<span style={styles.arrivedText}>✓ Arrived</span>) : (
                  <button onClick={() => handleMarkAsArrived(student.id)} style={styles.actionButton}>Mark as Arrived</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const handleMarkAsResolved = async (complaintId) => {
    const { error } = await supabase.from('complaints').update({ status: 'Resolved' }).eq('id', complaintId);
    if (error) {
      alert('Failed to resolve complaint: ' + error.message);
    } else {
      alert('Complaint has been marked as resolved.');
      setComplaints(current => current.map(c => c.id === complaintId ? { ...c, status: 'Resolved' } : c));
    }
  };

  const renderComplaintsTable = () => {
    return(
      <div style={styles.tableContainer}>
        <h3>Pending Complaints</h3>
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Student</th><th style={styles.th}>Room</th><th style={styles.th}>Category</th><th style={styles.th}>Description</th><th style={styles.th}>Status</th><th style={styles.th}>Action</th></tr></thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr><td colSpan="6" style={styles.td}>No pending complaints in this block.</td></tr>
            ) : (
              complaints.map(complaint => (
                <tr key={complaint.id}>
                  <td style={styles.td}>{complaint.students.name}</td>
                  <td style={styles.td}>{complaint.students.room_no}</td>
                  <td style={styles.td}>{complaint.category}</td>
                  <td style={styles.td}>{complaint.description}</td>
                  <td style={styles.td}><span style={{...styles.status, ...styles[complaint.status.replace(/ /g, '')]}}>{complaint.status}</span></td>
                  <td style={styles.td}>
                    {complaint.status !== 'Resolved' && (
                    <>
                      {complaint.status === 'Pending' && (
                        <button onClick={() => handleForwardToAdmin(complaint.id)} style={styles.forwardButton}>Forward to Admin</button>
                      )}
                      <button onClick={() => handleMarkAsResolved(complaint.id)} style={styles.resolveButton}>Mark as Resolved</button>
                    </>
                  )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  };

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
        <h2>Warden Dashboard - Block {blockId}</h2>
        <button onClick={() => setShowLogoutConfirm(true)}>Logout</button>
      </header>
       <nav style={styles.nav}>
        <button style={activeTab === 'arrivals' ? styles.activeTabButton : styles.tabButton} onClick={() => setActiveTab('arrivals')}>Student Arrivals</button>
        <button style={activeTab === 'complaints' ? styles.activeTabButton : styles.tabButton} onClick={() => setActiveTab('complaints')}>Complaints</button>
      </nav>
      <main>
        {loading ? <p>Loading data...</p> : (activeTab === 'arrivals' ? renderArrivalsTable() : renderComplaintsTable())}
      </main>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: 'black', borderBottom: '1px solid #ddd' },
  nav: { display: 'flex', backgroundColor: 'black' },
  tabButton: { padding: '15px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' },
  activeTabButton: { padding: '15px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', borderBottom: '3px solid #007bff' },
  tableContainer: { overflowX: 'auto', padding: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { backgroundColor: 'black', padding: '12px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '12px', border: '1px solid #ddd' },
  arrivedText: { color: '#28a745', fontWeight: 'bold' },
  actionButton: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' },
  forwardButton: { backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' },
  status: { padding: '4px 8px', borderRadius: '12px', color: 'white', fontSize: '12px', fontWeight: 'bold' },
  Pending: { backgroundColor: '#ffc107', color: 'black' },
  ForwardedtoAdmin: { backgroundColor: '#17a2b8' },
  resolveButton: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', marginLeft: '5px' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '400px', textAlign: 'center', color: "black" },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px'},
  confirmButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
  cancelButton: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
  Resolved: { backgroundColor: '#28a745' }
};

