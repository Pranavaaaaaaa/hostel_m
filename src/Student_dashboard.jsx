import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const ProfileView = ({ student, onBack, onAvatarUpload }) => {
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    return (
        <>
            {showAvatarModal && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4" onClick={() => setShowAvatarModal(false)}>
                    <img src={student.avatar_url} alt="Profile Avatar" className="max-w-full max-h-full rounded-lg" />
                </div>
            )}
            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Back to Dashboard
                </button>
                <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                        {/* Profile Picture Section */}
                        <div className="flex-shrink-0">
                            <div className="relative group">
                                <img 
                                    src={student.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${student.name}`} 
                                    alt="Profile" 
                                    className="h-32 w-32 rounded-full object-cover border-4 border-gray-600"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full transition-opacity duration-300 flex items-center justify-center gap-4">
                                    <button onClick={() => setShowAvatarModal(true)} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                    <label htmlFor="avatar-upload-profile" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                        <input id="avatar-upload-profile" type="file" accept="image/*" onChange={onAvatarUpload} className="hidden"/>
                                    </label>
                                </div>
                            </div>
                        </div>
                        {/* Details Section */}
                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-3xl font-bold text-white">{student.name}</h2>
                            <p className="text-md text-gray-400 mt-1">{student.USN}</p>
                            <div className="mt-6 border-t border-gray-700 pt-6 space-y-4 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400 font-medium">Email:</span><span className="font-mono text-gray-300">{student.email}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400 font-medium">Room Number:</span><span className="font-mono text-gray-300">{student.room_no}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400 font-medium">Hostel ID:</span><span className="font-mono text-gray-300">{student.rooms?.hostel_id || 'N/A'}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};


export default function Dashboard({ user, onLogout }) {
  const [studentProfile, setStudentProfile] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const fetchStudentData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Fetch student profile (including 'arrived?' status)
    const { data: profile, error: profileError } = await supabase
      .from('students')
      .select('*, rooms(hostel_id)')
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const DashboardView = () => {
    const [category, setCategory] = useState('Electrical');
    const [description, setDescription] = useState('');

    const handleComplaintSubmit = async (e) => {
      e.preventDefault();
      if (!description) {
          alert('Please provide a description for your complaint.');
          return;
      }
      setSubmitting(true);

      const { error } = await supabase.from('complaints').insert({
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

    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* --- ALIGNMENT FIX: Changed to a 2-column grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Lodge Complaint Card (takes up 1 column) */}
          <div className="lg:col-span-1 bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-6 h-fit">
            <h3 className="text-xl font-semibold text-white mb-4">Lodge a New Complaint</h3>
            <form onSubmit={handleComplaintSubmit} className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-400">Category</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>Electrical</option><option>Plumbing</option><option>Furniture</option><option>Wi-Fi</option><option>Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-400">Description</label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue..." rows="4" required className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-2 resize-none"/>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400/50 transition-colors">
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </form>
          </div>

          {/* Complaint History Card (takes up 1 column) */}
          <div className="lg:col-span-1 bg-gray-800 border border-gray-700 shadow-lg rounded-lg">
            <div className="p-6 border-b border-gray-700"><h3 className="text-xl font-semibold text-white">Your Complaint History</h3></div>
            <div className="divide-y divide-gray-700">
              {complaints.length > 0 ? (
                complaints.map(c => (
                  // --- DATE POSITION FIX: Restructured the item layout ---
                  <div key={c.id} className="p-6 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={c.status} />
                        <p className="font-semibold text-gray-200">{c.category}</p>
                      </div>
                      <small className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString('en-IN')}</small>
                    </div>
                    <p className="text-sm text-gray-400 pl-1">{c.description}</p>
                  </div>
                ))
              ) : <p className="p-6 text-gray-500">You have no past complaints.</p>}
            </div>
          </div>
        </div>
      </main>
    );
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        const publicUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
            .from('students')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id);
        
        if (updateError) throw updateError;
        
        // Update state instantly
        setStudentProfile(prev => ({...prev, avatar_url: publicUrl}));
        alert('Profile picture updated!');
    } catch (error) {
        alert('Error uploading image: ' + error.message);
    }
  };

  const StatusBadge = ({ status }) => {
    const baseStyle = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
    const statusStyles = {
        'Pending': "bg-yellow-900/50 text-yellow-300",
        'Forwarded to Admin': "bg-blue-900/50 text-blue-300",
        'Resolved': "bg-green-900/50 text-green-300",
    };
    return <span className={`${baseStyle} ${statusStyles[status] || 'bg-gray-700 text-gray-300'}`}>{status}</span>;
  };

  const WaitingView = () => (
    <main className="max-w-4xl mx-auto py-10 sm:px-6 lg:px-8">
      <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900/50">
          <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">Dashboard Activation Pending</h3>
        <p className="mt-2 text-gray-400">Welcome, {studentProfile?.name || user.email}!</p>
        <p className="mt-4 text-gray-400">Your account is ready, but your dashboard features will be activated after you physically check in at the hostel. Please visit the warden to confirm your arrival.</p>
      </div>
    </main>
  );

if (loading) { return <p className="text-center py-10 text-gray-400">Loading...</p>; }

  // const FullDashboardView = () => (
  //   <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
  //     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  //       {/* Left Column: Profile & New Complaint */}
  //       <div className="lg:col-span-1 space-y-8">
  //         <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-6">
  //           <div className="flex items-center space-x-4 mb-6">
  //             <div className="relative">
  //               <img 
  //                 src={studentProfile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${studentProfile.name}`} 
  //                 alt="Profile" 
  //                 className="h-20 w-20 rounded-full object-cover border-2 border-gray-600"
  //               />
  //               <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full cursor-pointer hover:bg-blue-700">
  //                  <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
  //                  <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden"/>
  //               </label>
  //             </div>
  //             <div>
  //               <h3 className="text-xl font-semibold text-white">{studentProfile.name}</h3>
  //               <p className="text-sm text-gray-400">{studentProfile.USN}</p>
  //             </div>
  //           </div>
  //           <div className="space-y-3 text-sm">
  //             <div className="flex justify-between"><span className="text-gray-400">Room No:</span><span className="font-medium text-gray-200">{studentProfile.room_no}</span></div>
  //             <div className="flex justify-between"><span className="text-gray-400">Hostel ID:</span><span className="font-medium text-gray-200">{studentProfile.rooms.hostel_id}</span></div>
  //           </div>
  //         </div>
  //         <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-6">
  //           <h3 className="text-xl font-semibold text-white mb-4">Lodge a New Complaint</h3>
  //           <form onSubmit={handleComplaintSubmit} className="space-y-4">
  //             <div>
  //               <label htmlFor="category" className="block text-sm font-medium text-gray-400">Category</label>
  //               <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
  //                 <option>Electrical</option><option>Plumbing</option><option>Furniture</option><option>Wi-Fi</option><option>Other</option>
  //               </select>
  //             </div>
  //             <div>
  //               <label htmlFor="description" className="block text-sm font-medium text-gray-400">Description</label>
  //               <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue in detail..." rows="4" required className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 resize-none"/>
  //             </div>
  //             <button type="submit" disabled={submitting} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400/50 transition-colors">
  //               {submitting ? 'Submitting...' : 'Submit Complaint'}
  //             </button>
  //           </form>
  //         </div>
  //       </div>
  //       {/* Right Column: Complaint History */}
  //       <div className="lg:col-span-2 bg-gray-800 border border-gray-700 shadow-lg rounded-lg">
  //         <div className="p-6 border-b border-gray-700"><h3 className="text-xl font-semibold text-white">Your Complaint History</h3></div>
  //         <div className="divide-y divide-gray-700">
  //           {complaints.length > 0 ? (
  //             complaints.map(c => (
  //               <div key={c.id} className="p-6 flex justify-between items-center space-x-4">
  //                 <div className="flex-1">
  //                   <div className="flex items-center gap-3">
  //                      <StatusBadge status={c.status} />
  //                      <p className="font-semibold text-gray-200">{c.category}</p>
  //                   </div>
  //                   <p className="mt-2 text-sm text-gray-400">{c.description}</p>
  //                 </div>
  //                 <small className="text-xs text-gray-500 whitespace-nowrap">{new Date(c.created_at).toLocaleString('en-IN')}</small>
  //               </div>
  //             ))
  //           ) : <p className="p-6 text-gray-500">You have no past complaints.</p>}
  //         </div>
  //       </div>
  //     </div>
  //   </main>
  // );

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-300">
      {showLogoutConfirm && <ConfirmationModal title="Confirm Logout" message="Are you sure?" onConfirm={onLogout} onCancel={() => setShowLogoutConfirm(false)} confirmText="Logout" />}
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="block focus:outline-none">
              <img src={studentProfile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${studentProfile?.name || user.email}`} alt="Profile" className="h-10 w-10 rounded-full object-cover border-2 border-gray-600 hover:border-blue-500 transition"/>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-20">
                <button onClick={() => { setIsDropdownOpen(false); setCurrentView('profile'); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">View Profile</button>
                <button onClick={() => { setIsDropdownOpen(false); setShowLogoutConfirm(true); }} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {studentProfile && studentProfile['arrived?'] 
        ? (currentView === 'dashboard' ? <DashboardView /> : <ProfileView student={studentProfile} onBack={() => setCurrentView('dashboard')} onAvatarUpload={handleAvatarUpload} />)
        : <WaitingView />
      }
    </div>
  );

  

//   // Conditional view based on arrival status
//   if (!studentProfile || !studentProfile['arrived?']) {
//     return (
//       <div style={styles.container}>
//         {showLogoutConfirm && (
//           <ConfirmationModal
//             title="Confirm Logout"
//             message="Are you sure you want to log out?"
//             onConfirm={onLogout}
//             onCancel={() => setShowLogoutConfirm(false)}
//             isProcessing={false}
//             confirmText="Logout"
//           />
//         )}
//         <header style={styles.header}>
//           <h2>Student Dashboard</h2>
//           <button onClick={() => setShowLogoutConfirm(true)}>Logout</button>
//         </header>
//         <main style={styles.waitingContainer}>
//           <h3>Welcome, {studentProfile?.name || user.email}!</h3>
//           <p>Your dashboard is not yet active.</p>
//           <p>Please complete your physical check-in at the hostel. The warden will then approve your arrival and activate your account features.</p>
//         </main>
//       </div>
//     );
//   }

//   // Full dashboard for arrived students
//   return (
//     <div style={styles.container}>
//       {showLogoutConfirm && (
//           <ConfirmationModal
//             title="Confirm Logout"
//             message="Are you sure you want to log out?"
//             onConfirm={onLogout}
//             onCancel={() => setShowLogoutConfirm(false)}
//             isProcessing={false}
//             confirmText="Logout"
//           />
//         )}
//       <header style={styles.header}>
//         <h2>Student Dashboard</h2>
//         <button onClick={() => setShowLogoutConfirm(true)}>Logout</button>
//       </header>
//       <main style={styles.main}>
//         <div style={styles.profileBox}>
//             <h3>Welcome, {studentProfile.name}!</h3>
//             <p><strong>USN:</strong> {studentProfile.USN}</p>
//             <p><strong>Room No:</strong> {studentProfile.room_no}</p>
//         </div>
//         <div style={styles.complaintSection}>
//             <h3>Lodge a New Complaint</h3>
//             <form onSubmit={handleComplaintSubmit} style={styles.form}>
//                 <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
//                     <option>Electrical</option>
//                     <option>Plumbing</option>
//                     <option>Furniture</option>
//                     <option>Wi-Fi</option>
//                     <option>Other</option>
//                 </select>
//                 <textarea
//                     value={description}
//                     onChange={(e) => setDescription(e.target.value)}
//                     placeholder="Describe your issue in detail..."
//                     rows="4"
//                     style={styles.textarea}
//                 />
//                 <button type="submit" disabled={submitting} style={styles.button}>
//                     {submitting ? 'Submitting...' : 'Submit Complaint'}
//                 </button>
//             </form>
//         </div>
//         <div style={styles.complaintList}>
//             <h3>Your Complaint History</h3>
//             {complaints.length > 0 ? (
//                 complaints.map(c => (
//                     <div key={c.id} style={styles.complaintItem}>
//                         <span style={{...styles.status, ...styles[c.status.toLowerCase()]}}>{c.status}</span>
//                         <div><strong>{c.category}</strong>: {c.description}</div>
//                         <small>{new Date(c.created_at).toLocaleString()}</small>
//                     </div>
//                 ))
//             ) : <p>You have no past complaints.</p>}
//         </div>
//       </main>
//     </div>
//   );
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
