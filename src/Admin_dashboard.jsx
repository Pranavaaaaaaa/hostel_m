import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseclient';

// Helper function to format dates as dd-mm-yyyy hh:mm
const formatDateForDisplay = (date = new Date()) => {
    const pad = (num) => String(num).padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); // Months are 0-indexed
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${day}-${month}-${year} ${hours}:${minutes}`;
};


// Helper component for the CSV Upload section
const CsvUploader = ({ onUploadSuccess }) => {
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState(null); // Store the parsed data in state
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      // Reset if user cancels file selection
      setParsedData(null);
      setFileName('');
      setError('');
      return;
    }

    setFileName(file.name);
    setError('');

    // Parse the file immediately on selection
    window.Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setError('CSV file is empty or invalid.');
          setParsedData(null);
        } else {
          const nowISO = new Date().toISOString();
          const processedData = results.data.map(row => ({
            ...row,
            created_at: row.created_at || nowISO, //defaulting to now if empty/missing
          }));
          setParsedData(processedData); // Store the valid data
        }
      },
      error: (err) => {
        setError(`CSV parsing error: ${err.message}`);
        setParsedData(null);
      },
    });
  };

  const handleUpload = async () => {
    if (!parsedData) {
      setError('Please select a valid CSV file.');
      return;
    }

    setUploading(true);
    setError('');
    
    // Now we insert the data we already have in state
    const { error: insertError } = await supabase.from('rooms').insert(parsedData);

    if (insertError) {
      setError(`Upload failed: ${insertError.message}`);
    } else {
      alert('Rooms uploaded successfully!');
      setFileName('');
      setParsedData(null);
      onUploadSuccess(); // Callback to refresh data in parent
    }
    setUploading(false);
  };

  return (
    <div style={styles.csvUploader}>
      <h3>Import Rooms from CSV</h3>
      <p>Ensure CSV headers match the table columns: `created at` is optional and will default to now.</p>
      <input type="file" accept=".csv" onChange={handleFileChange} disabled={uploading} />
      <button onClick={handleUpload} disabled={uploading || !parsedData}>
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </button>
      {fileName && <p style={{ marginTop: '10px', fontStyle: 'italic' }}>Selected file: {fileName}</p>}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

// NEW: Modal component for adding rooms manually
const AddRoomsModal = ({ onClose, onAddSuccess }) => {
    const [numRooms, setNumRooms] = useState(1);
    const [rooms, setRooms] = useState([{ id: '', hostel_id: '', capacity: '', current_occupancy: 0, error: null }]);
    const [submitting, setSubmitting] = useState(false);
    const [creationTime, setCreationTime] = useState(formatDateForDisplay());
    
    useEffect(() => {
      setRooms(currentRooms => {
          const newRooms = [];
          for (let i = 0; i < numRooms; i++) {
              newRooms.push(currentRooms[i] || { id: '', hostel_id: '', capacity: '', current_occupancy: 0, error: null });
          }
          return newRooms;
      });
    }, [numRooms]);

    const handleInputChange = (index, field, value) => {
        const updatedRooms = [...rooms];
        updatedRooms[index][field] = value;
        const roomToUpdate = { ...updatedRooms[index], [field]: value };

        // --- Validation Logic for Hostel ID ---
        if (field === 'hostel_id') {
            const numericValue = parseInt(value, 10);
            if (numericValue > 5 || numericValue < 1) {
                roomToUpdate.error = 'Valid hostel IDs are 1-5 only';
            } else {
                roomToUpdate.error = null; // Clear error if the value is valid
            }
        }
        else if (field === 'capacity') {
            const numericValue = parseInt(value, 10);
            if (numericValue > 3 || numericValue < 1) {
                roomToUpdate.error = 'Capacity must be between 1-3.';
            } else {
                roomToUpdate.error = null; // Clear error if valid
            }
        }

        updatedRooms[index] = roomToUpdate;
        setRooms(updatedRooms);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check for any validation errors before submitting
        const hasErrors = rooms.some(room => room.error);
        if (hasErrors) {
            alert('Please correct the errors before submitting.');
            return;
        }

        setSubmitting(true);

        const nowISO = new Date().toISOString();

        // Prepare data for Supabase (remove the temporary 'error' field)
        const roomsToInsert = rooms.map(({ error, ...rest }) => ({
          ...rest,
          current_occupancy: 0, //default occupancy
          created_at: nowISO
    })); 


        try {
            for (const room of rooms) {
                if (!room.id || !room.hostel_id || !room.capacity) throw new Error('Please fill out all fields for each room.');
                
                // Call the correct, robust function
                const { error } = await supabase.rpc('insert_room_and_cascade', {
                    new_id: Number(room.id),
                    new_hostel_id: Number(room.hostel_id),
                    new_capacity: Number(room.capacity)
                });

                if (error) throw error;
            }
            alert('Rooms added successfully!');
            onAddSuccess();
            onClose();
        } catch (error) {
            alert(`Failed to add rooms: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div style={styles.modalBackdrop}>
            <div style={styles.modalContent}>
                <h2>Add New Rooms</h2>
                {/*Current Time*/}
                <p style = {{textAlign: 'center', fontsize: '14px', color: '#555'}}>
                  Creation Time: <strong>{creationTime}</strong>
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label htmlFor="numRooms">Number of Rooms to Add (Max 5):</label>
                        <select
                            id="numRooms"
                            value={numRooms}
                            onChange={(e) => setNumRooms(Number(e.target.value))}
                            style={{ marginLeft: '10px' }}
                        >
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <hr style={{ margin: '20px 0' }} />

                    {rooms.map((room, index) => (
                        <div key={index} style={styles.roomFormWrapper}>
                            <h4>Room {index + 1}</h4>
                            <div style={styles.roomForm}>
                              <input
                                  type="number"
                                  placeholder="Room ID (e.g., 101)"
                                  value={room.id}
                                  onChange={(e) => handleInputChange(index, 'id', e.target.value)}
                                  required
                              />
                              <input
                                  type="number"
                                  placeholder="Hostel ID (e.g., 1)"
                                  value={room.hostel_id}
                                  onChange={(e) => handleInputChange(index, 'hostel_id', e.target.value)}
                                  required
                              />
                              <input
                                  type="number"
                                  placeholder="Capacity (e.g., 2)"
                                  value={room.capacity}
                                  onChange={(e) => handleInputChange(index, 'capacity', e.target.value)}
                                  required
                              />
                            </div>
                            {/* Conditionally render the error message for this specific room */}
                            {room.error && <p style={styles.errorMessage}>{room.error}</p>}
                        </div>
                    ))}
                    
                    <div style={styles.modalActions}>
                        <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" disabled={submitting}>
                            {submitting ? 'Adding...' : 'Add Rooms'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel, isProcessing, confirmText, processingText, confirmButtonColor }) => {
    return (
        <div style={styles.modalBackdrop}>
            <div style={styles.modalContent}>
                <h3 style={{ marginTop: 0 }}>{title || 'Confirmation'}</h3>
                <p>{message}</p>
                <div style={styles.modalActions}>
                    <button onClick={onCancel} disabled={isProcessing} style={styles.cancelButton}>Cancel</button>
                    <button 
                        onClick={onConfirm} 
                        disabled={isProcessing} 
                        style={{...styles.confirmButton, backgroundColor: confirmButtonColor || '#dc3545' }}
                    >
                        {isProcessing ? (processingText || 'Processing...') : (confirmText || 'Confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Dashboard Component
function ADashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('students');
  const [data, setData] = useState({ students: [], rooms: [], complaints: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [highlightedRow, setHighlightedRow] = useState({ tab: null, id: null });
  const [showAddRoomsModal, setShowAddRoomsModal] = useState(false); // State for the new modal
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Generic state
  const [currentPage, setCurrentPage] = useState(1);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [studentForReport, setStudentForReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [studentFilter, setStudentFilter] = useState(null);
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    setCurrentPage(1);
    // Clear the student filter when the tab changes
    if (activeTab !== 'complaints') {
      setStudentFilter(null);
    }
  }, [activeTab, rowsPerPage]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, roomsRes, complaintsRes, paymentsRes] = await Promise.all([
        supabase.from('students').select('*').order('id', { ascending: true }),
        supabase.from('rooms').select('*').order('id', { ascending: true }),
        supabase
          .from('complaints')
          .select('*, students!complaints_student_id_fkey(name, room_no)')
          .order('created_at', { ascending: true }),
        supabase.from('payments').select('*').order('id', { ascending: true }),
      ]);

      setData({
        students: studentsRes.data || [],
        rooms: roomsRes.data || [],
        complaints: complaintsRes.data || [],
        payments: paymentsRes.data || [],
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {fetchData();}, [fetchData]);

  const handleGenerateReport = async (student) => {
    if (!student) return;
    setIsGeneratingReport(true);

    try {
      // 1. Fetch the student's full, up-to-date record, including their hostel_id
      const { data: fullStudentData, error: studentError } = await supabase
        .from('students')
        .select('*, rooms(hostel_id)')
        .eq('id', student.id)
        .single();

      if (studentError) throw studentError;

      // 2. Fetch the student's complete complaint history
      const { data: complaints, error: complaintsError } = await supabase
        .from('complaints')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (complaintsError) throw complaintsError;

      // 3. Initialize jsPDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // 4. Build the PDF content
      doc.setFontSize(18);
      doc.text('Student Report', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, 25, { align: 'center' });
      
      doc.setLineWidth(0.5);
      doc.line(15, 30, 195, 30);

      doc.setFontSize(12);
      doc.text('STUDENT DETAILS', 15, 40);
      doc.setFontSize(10);
      doc.text(`Name:    ${fullStudentData.name}`, 20, 48);
      doc.text(`USN:     ${fullStudentData.USN}`, 20, 53);
      doc.text(`Email:   ${fullStudentData.email}`, 20, 58);
      doc.text(`Room No: ${fullStudentData.room_no}`, 120, 48);
      doc.text(`Hostel ID: ${fullStudentData.rooms.hostel_id}`, 120, 53);

      doc.setFontSize(12);
      doc.text('ARRIVAL STATUS', 15, 70);
      doc.setFontSize(10);
      if (fullStudentData['arrived?']) {
        const arrivalDate = new Date(fullStudentData.arrival_timestamp).toLocaleString('en-IN');
        doc.text(`Status: Arrived on ${arrivalDate}`, 20, 78);
      } else {
        doc.text('Status: Student has NOT physically arrived at the hostel yet.', 20, 78);
      }
      
      doc.setFontSize(12);
      doc.text(`COMPLAINT HISTORY (${complaints.length} records)`, 15, 90);

      // 5. Create a table for complaints using jspdf-autotable
      if (complaints.length > 0) {
        const tableBody = complaints.map(c => [
          c.id,
          new Date(c.created_at).toLocaleDateString('en-IN'),
          c.category,
          c.status,
          c.description
        ]);
        
        doc.autoTable({
          startY: 95,
          head: [['ID', 'Date', 'Category', 'Status', 'Description']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
        });
      } else {
         doc.setFontSize(10);
         doc.text('- No complaints have been lodged by this student.', 20, 98);
      }

      // 6. Save the PDF
      doc.save(`Student_Report_${fullStudentData.USN}.pdf`);

    } catch (error) {
      alert(`Failed to generate report: ${error.message}`);
    } finally {
      setIsGeneratingReport(false);
      setStudentForReport(null);
    }
  };

  // This hook runs whenever the activeTab changes, ensuring the highlight is always cleared.
  useEffect(() => {
    setHighlightedRow({ tab: null, id: null });
  }, [activeTab]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
        let resultMessage;
        let error;

        if (itemToDelete.type === 'student') {
            const { data: msg, error: err } = await supabase.rpc('delete_student_and_cleanup', { student_id_to_delete: itemToDelete.data.id });
            resultMessage = msg;
            error = err;
        } else if (itemToDelete.type === 'room') {
            const { data: msg, error: err } = await supabase.rpc('delete_room_and_cascade', { room_id_to_delete: itemToDelete.data.id });
            resultMessage = msg;
            error = err;
        }

        if (error) throw error; // Throw the error to be caught by the catch block

        alert(resultMessage || 'Deletion successful.');
        fetchData(); // Refresh data on success

    } catch (error) {
        alert(`Failed to delete: ${error.message}`);
    } finally {
        // This 'finally' block GUARANTEES the UI will un-freeze
        setIsDeleting(false);
        setItemToDelete(null);
    }
  };

  const handleForeignKeyClick = (tab, id) => {
    if (id === null || id === undefined) return;

    // 1. Clear any existing fade-out timer. This is crucial if the user clicks another link quickly.
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    // 2. Set the highlight state and switch tabs as before.
    setHighlightedRow({ tab, id });
    setActiveTab(tab);
    window.scrollTo(0, 0);

    // 3. Set a new timer. After 5 seconds, it will reset the highlight state.
    // This causes React to re-render and remove the animation class.
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedRow({ tab: null, id: null });
    }, 5000); // 5000 milliseconds = 5 seconds
  };
  
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const renderTable = () => {
    const tableData = data[activeTab] || [];
    let displayData = [...tableData];

    const totalEntries = displayData.length;
    const totalPages = Math.ceil(totalEntries / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalEntries);
    const paginatedData = displayData.slice(startIndex, endIndex);
    
    // if (highlightedRow.tab === activeTab && highlightedRow.id !== null) {
    //     const highlightedIndex = displayData.findIndex(item => Number(item.id) === Number(highlightedRow.id));
    //     if (highlightedIndex > -1) {
    //         const [item] = displayData.splice(highlightedIndex, 1);
    //         displayData.unshift(item);
    //     }
    // }

    if (activeTab === 'complaints' && studentFilter) {
      displayData = displayData.filter(complaint => complaint.student_id === studentFilter.id);
    }

    if (displayData.length === 0) {
      return (
        <div>
          {activeTab === 'complaints' && studentFilter && (
            <div style={styles.filterBar}>
              <span>Showing complaints for: <strong>{studentFilter.name}</strong></span>
              <button onClick={() => setStudentFilter(null)} style={styles.clearFilterButton}>Clear Filter</button>
            </div>
          )}
          <p style={{color: 'white', textAlign: 'center'}}>No data available for this view.</p>
        </div>
      );
    }

    if (highlightedRow.tab === activeTab && highlightedRow.id !== null) {
        const highlightedIndex = displayData.findIndex(item => Number(item.id) === Number(highlightedRow.id));
        if (highlightedIndex > -1) { 
            const [item] = displayData.splice(highlightedIndex, 1); 
            displayData.unshift(item); 
        }
    }


    // const paginatedData = displayData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let headers = tableData.length > 0 ? Object.keys(tableData[0]) : [];
    headers = headers.filter(h => h !== 'arrived?' && h !== 'students' && h !== 'arrival_timestamp');
    
    if (activeTab === 'complaints' && headers.length > 0) {
        headers = ['ID', 'Student Name', 'Room No', 'Category', 'Description', 'Status', 'Created At'];
    } else {
        if (activeTab === 'students') {
            headers = headers.filter(header => header !== 'arrived?');
        }
        if ((activeTab === 'students' || activeTab === 'rooms') && !headers.includes('actions')) {
            headers.push('actions');
        }
    }


    return (
      <>
        {activeTab === 'complaints' && studentFilter && (
            <div style={styles.filterBar}>
                <span>Showing complaints for: <strong>{studentFilter.name}</strong></span>
                <button onClick={() => setStudentFilter(null)} style={styles.clearFilterButton}>Clear Filter</button>
            </div>
        )}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead><tr>{headers.map(header => <th key={header} style={styles.th}>{header.replace(/_/g, ' ').toUpperCase()}</th>)}</tr></thead>
            <tbody>
              {paginatedData.map((row) => {
                const isHighlighted = highlightedRow.tab === activeTab && Number(row.id) === Number(highlightedRow.id);
                return (
                  <tr key={row.id} className={isHighlighted ? 'highlight-fade' : ''}>
                    {/* --- Smarter Cell Rendering Logic --- */}
                    {activeTab === 'complaints' ? (
                      <>
                        <td style={{...styles.td, color: 'white'}}>{row.id}</td>
                        <td style={{...styles.td, color: 'white'}}>{row.students?.name || 'N/A'}</td>
                        <td style={{...styles.td, color: 'white'}}>{row.students?.room_no || 'N/A'}</td>
                        <td style={{...styles.td, color: 'white'}}>{row.category}</td>
                        <td style={{...styles.td, color: 'white'}}>{row.description}</td>
                        <td style={{...styles.td, color: 'white'}}>{row.status}</td>
                        <td style={{...styles.td, color: 'white'}}>{renderCellContent('created_at', row.created_at)}</td>
                      </>
                    ) : (
                      // Original logic for all other tables
                      headers.map(header => {
                        if (header === 'actions') {
                          return (
                            <td key={`${row.id}-actions`} style={{...styles.td, display: 'flex', gap: '20px', padding:'25px'}}>
                              <button
                                  onClick={() => setItemToDelete({ type: activeTab.slice(0, -1), data: row })}
                                  style={styles.deleteButton}
                              >
                                  Delete
                              </button>
                              {/* --- NEW "Download Report" BUTTON --- */}
                              {activeTab === 'students' && (
                                  <button
                                      onClick={() => setStudentForReport(row)}
                                      style={styles.reportButton}
                                  >
                                      Report
                                  </button>
                                  )}
                              </td>
                            );
                          }
                        const dataKey = header.replace(/ /g, '_').toLowerCase();
                        const cellContent = renderCellContent(header, row[header]);
                        const isLink = React.isValidElement(cellContent);
                        const cellStyle = {...styles.td, color: isLink ? 'inherit' : 'white'};
                        return (<td key={`${row.id}-${header}`} style={cellStyle}>{cellContent}</td>);
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationContainer}>
            <span>
                Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
            </span>
            <div>
                <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 1}
                    style={currentPage === 1 ? styles.disabledButton : styles.paginationButton}
                >
                    &lt; Previous
                </button>
                <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= totalPages}
                    style={currentPage >= totalPages ? styles.disabledButton : styles.paginationButton}
                >
                    Next &gt;
                </button>
            </div>
        </div>
      </>  
    );
  };

  const renderCellContent = (headerKey, value, row) => {
    const foreignKeyMap = {complaint_id: 'complaints', fee_id: 'payments', room_no: 'rooms',};

    if (headerKey === 'students') {
        return row.students?.name || 'N/A';
    }

    if (activeTab === 'students' && foreignKeyMap[headerKey] && value !== null) {
      const targetTab = foreignKeyMap[headerKey];
      return (<a href="#" style={styles.link} onClick={(e) => { e.preventDefault(); handleForeignKeyClick(targetTab, value); }}>{value}</a>);
    }
    if (headerKey === 'created_at' && value) { return formatDateForDisplay(new Date(value)); }
    return value !== null && value !== undefined ? String(value) : 'N/A';
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={styles.dashboard}>

      {studentForReport && (
          <ConfirmationModal
              title="Confirm Report Download"
              message={`Do you want to generate and download a full report for ${studentForReport.name}?`}
              onConfirm={() => handleGenerateReport(studentForReport)}
              onCancel={() => setStudentForReport(null)}
              isProcessing={isGeneratingReport}
              confirmText="Download"
              processingText="Generating..."
              confirmButtonColor="#007bff" // Blue color for a non-destructive action
          />
      )}

      {itemToDelete && (
          <ConfirmationModal
              title="Confirm Deletion"
              message={`Are you sure you want to permanently delete this ${itemToDelete.type}? This action cannot be undone.`}
              onConfirm={handleConfirmDelete}
              onCancel={() => setItemToDelete(null)}
              isProcessing={isDeleting}
              confirmText="Delete"
              processingText="Deleting..."
          />
      )}
      
      {/* --- RENDER THE MODALS --- */}
      {showAddRoomsModal && <AddRoomsModal onClose={() => setShowAddRoomsModal(false)} onAddSuccess={fetchData} />}

      {showLogoutConfirm && (
        <ConfirmationModal
          title="Confirm Logout"
          message="Are you sure you want to log out?"
          onConfirm={onLogout}
          onCancel={() => setShowLogoutConfirm(false)}
          isProcessing={false} // Logout is instant, no processing state needed
          confirmText="Logout"
        />
      )}

      <style>{`
        @keyframes fadeHighlight {
          from { background-color: #ff4d4d; } /* Start bright red */
          to { background-color: ${styles.td.backgroundColor}; } /* Fade to the normal cell color */
        }
        .highlight-fade > td {
          animation: fadeHighlight 5s ease-out forwards;
        }
      `}</style>

      {showAddRoomsModal && <AddRoomsModal onClose={() => setShowAddRoomsModal(false)} onAddSuccess={fetchData} />}
      <header style={styles.header}><h2>Admin Dashboard</h2>
      <button onClick={() => setShowLogoutConfirm(true)}>Logout</button></header>
      <nav style={styles.nav}>
          {['students', 'rooms', 'complaints', 'payments'].map(tab => (
            // --- FIX #1: The onClick handler now resets the highlight state ---
            <button
              key={tab}
              style={activeTab === tab ? styles.activeTabButton : styles.tabButton}
              onClick={() => {
                setActiveTab(tab);
                // This line prevents the "ghost row" bug
                setHighlightedRow({ tab: null, id: null }); 
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
      </nav>
      <main style={styles.main}>
          <div style={styles.controls}>
              <div><label htmlFor="rowsPerPage">View </label><select id="rowsPerPage" value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={75}>75</option><option value={100}>100</option></select><span> entries</span></div>
              {activeTab === 'rooms' && (<button onClick={() => setShowAddRoomsModal(true)} style={{ marginLeft: '20px' }}>+ Add Rooms Manually</button>)}
          </div>
          {activeTab === 'rooms' && <CsvUploader onUploadSuccess={fetchData} />}
          {renderTable()}
      </main>
    </div>
  );
}

// STYLES OBJECT
const styles = {
    paginationContainer: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px', marginTop: '10px', color: 'white'},
    paginationButton: {padding: '8px 16px', margin: '0 5px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer',},
    disabledButton: {padding: '8px 16px', margin: '0 5px', backgroundColor: '#343a40', color: '#6c757d', border: 'none', borderRadius: '5px', cursor: 'not-allowed',},
    dashboard: { fontFamily: 'Arial, sans-serif', color: '#333' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: '#000000ff', borderBottom: '1px solid #ddd', color:"#ddd" },
    nav: { display: 'flex', backgroundColor: '#000000ff', padding: '0 20px' },
    tabButton: { padding: '15px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' },
    activeTabButton: { padding: '15px 20px', border: 'none', background: '#000000ff', cursor: 'pointer', fontSize: '16px', borderBottom: '3px solid #007bff' },
    main: { padding: '20px' },
    controls: { marginBottom: '20px', display: 'flex', alignItems: 'center' , color: "#ddd"},
    csvUploader: { border: '1px solid #ddd', padding: '20px', marginBottom: '20px', borderRadius: '5px', color:"#ddd"},
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f2f2f2', padding: '12px', border: '1px solid #ddd', textAlign: 'left' },
    tr: { '&:hover': { backgroundColor: '#f5f5f5' } },
    td: { padding: '12px', border: '1px solid #ffffffff' },
    link: { color: '#007bff', textDecoration: 'underline', cursor: 'pointer' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    confirmButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
    cancelButton: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' },
    // Styles for the new modal
    modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
    formGroup: { marginBottom: '15px' },
    roomFormWrapper: { border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '10px' },
    roomForm: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', border: '1px solid #eee', padding: '10px', borderRadius: '5px', marginBottom: '10px' , color:"#ddd"},
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    errorMessage: { color: 'red', fontSize: '12px', margin: '5px 0 0', textAlign: 'center' },
    reportButton: { 
        backgroundColor: '#17a2b8', // A teal/info color
        color: 'white', 
        border: 'none', 
        padding: '5px 10px', 
        borderRadius: '4px', 
        cursor: 'pointer' 
    },
    filterBar: {
        backgroundColor: '#333',
        color: 'white',
        padding: '10px 15px',
        marginBottom: '15px',
        borderRadius: '5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clearFilterButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '5px 10px',
        borderRadius: '4px',
        cursor: 'pointer'
    },
  };

export default ADashboard;

