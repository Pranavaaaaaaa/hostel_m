import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseclient';

const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmText }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center border border-gray-700">
            <h3 className="text-lg font-semibold text-white">{title || 'Confirmation'}</h3>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
            <div className="mt-6 flex justify-center gap-4">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 font-medium transition-colors">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors">{confirmText || 'Confirm'}</button>
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

  const StatusBadge = ({ status }) => {
    const baseStyle = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
    const statusStyles = {
        'Pending': "bg-yellow-100 text-yellow-800",
        'Forwarded to Admin': "bg-blue-100 text-blue-800",
        'Resolved': "bg-green-100 text-green-800",
    };
    return <span className={`${baseStyle} ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  const renderArrivalsTable = () => (
    <div>
      <h3 className="text-xl font-semibold text-white mb-4">Student Arrival Status</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-gray-800">
          <thead><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Room No</th><th className="th">Arrival Status</th></tr></thead>
          <tbody className="divide-y divide-gray-700">
            {students.length > 0 ? students.map(student => (
              <tr key={student.id} className="hover:bg-gray-700">
                <td className="td font-medium text-gray-100">{student.name}</td>
                <td className="td text-gray-400">{student.email}</td>
                <td className="td text-gray-400">{student.room_no}</td>
                <td className="td">
                  {student['arrived?'] ? (<span className="font-semibold text-green-400">✓ Arrived</span>) : (
                    <button onClick={() => handleMarkAsArrived(student.id)} className="action-button bg-blue-600 hover:bg-blue-700">Mark as Arrived</button>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan="4" className="td text-center text-gray-500">No students assigned to this block.</td></tr>}
          </tbody>
        </table>
      </div>
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

  const renderComplaintsTable = () => (
    <div>
      <h3 className="text-xl font-semibold text-white mb-4">Complaint History</h3>
       <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-gray-800">
          <thead><tr><th className="th">Student</th><th className="th">Room</th><th className="th">Category</th><th className="th w-1/3">Description</th><th className="th">Status</th><th className="th">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-700">
          {complaints.length > 0 ? complaints.map(complaint => (
              <tr key={complaint.id} className="hover:bg-gray-700">
                <td className="td font-medium text-gray-100">{complaint.students?.name || 'N/A'}</td>
                <td className="td text-gray-400">{complaint.students?.room_no || 'N/A'}</td>
                <td className="td text-gray-400">{complaint.category}</td>
                <td className="td text-gray-400">{complaint.description}</td>
                <td className="td"><StatusBadge status={complaint.status} /></td>
                <td className="td space-x-2">
                  {complaint.status !== 'Resolved' && (
                    <>
                      {complaint.status === 'Pending' && <button onClick={() => handleForwardToAdmin(complaint.id)} className="action-button bg-yellow-500 hover:bg-yellow-600 text-black">Forward</button>}
                      <button onClick={() => handleMarkAsResolved(complaint.id)} className="action-button bg-green-500 hover:bg-green-600">Resolve</button>
                    </>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan="6" className="td text-center text-gray-500">No complaints found for this block.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-300">
        <style>{`
            .th { 
                padding: 12px 24px; 
                text-align: left; 
                font-semibold; 
                color: #D1D5DB; /* Lighter text color (gray-300) */
                text-transform: uppercase; 
                letter-spacing: 0.05em; 
                font-size: 12px; 
                background-color: #374151; /* Lighter background (gray-700) */
                border-bottom: 2px solid #4B5563; /* Distinct border (gray-600) */
            }
            .td { padding: 16px 24px; white-space: nowrap; font-size: 14px; }
            .action-button { color: white; border: none; padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background-color 0.2s; }
        `}</style>
      {showLogoutConfirm && <ConfirmationModal title="Confirm Logout" message="Are you sure you want to log out?" onConfirm={onLogout} onCancel={() => setShowLogoutConfirm(false)} confirmText="Logout" />}
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Warden Dashboard - Block {blockId}</h1>
          <button onClick={() => setShowLogoutConfirm(true)} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">Logout</button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8" aria-label="">
            <button onClick={() => setActiveTab('complaints')} className="relative py-4 px-1 w-1/2 font-medium text-sm focus:outline-none">
              <span className={activeTab === 'complaints' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}>Complaints</span>
              <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-300 ${activeTab === 'complaints' ? 'w-full' : 'w-0'}`} />
            </button>
            <button onClick={() => setActiveTab('arrivals')} className="relative py-4 px-1 w-1/2 font-medium text-sm focus:outline-none">
              <span className={activeTab === 'arrivals' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}>Student Arrivals</span>
              <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-300 ${activeTab === 'arrivals' ? 'w-full' : 'w-0'}`} />
            </button>
          </nav>
        </div>
        <div>
            {loading ? <p className="text-center text-gray-400">Loading data...</p> : (activeTab === 'arrivals' ? renderArrivalsTable() : renderComplaintsTable())}
        </div>
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

