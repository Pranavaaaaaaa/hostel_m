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
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white">Import Rooms from CSV</h3>
      <p className="text-sm text-gray-400 mt-1">Quickly populate your rooms table by uploading a CSV file.</p>
      
      <div className="mt-4">
        {/* If no file is selected, show the drop zone */}
        {!fileName ? (
          <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H12a4 4 0 014 4v1m-4 4h-2m2 4h4a4 4 0 004-4v-1m-4-4H7a4 4 0 00-4 4v1a4 4 0 004 4h2"></path></svg>
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">CSV format only</p>
            </div>
            <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} disabled={uploading} />
          </label>
        ) : (
          // If a file IS selected, show its name and the upload button
          <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
               <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <span className="text-sm font-medium text-white">{fileName}</span>
            </div>
            <button onClick={handleUpload} disabled={uploading || !parsedData} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </div>
        )}

        {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
            </div>
        )}
      </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Add New Rooms</h2>
                        <p className="text-sm text-gray-400">Creation Time: {creationTime}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6">
                        <label htmlFor="numRooms" className="block text-sm font-medium text-gray-300 mb-2">Number of Rooms to Add (Max 5)</label>
                        <select
                            id="numRooms"
                            value={numRooms}
                            onChange={(e) => setNumRooms(Number(e.target.value))}
                            className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="space-y-6">
                        {rooms.map((room, index) => (
                            <div key={index} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                <h4 className="font-semibold text-white mb-3">Room {index + 1}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="number" placeholder="Room ID (e.g., 101)" value={room.id} onChange={(e) => handleInputChange(index, 'id', e.target.value)} required className="bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    <input type="number" placeholder="Hostel ID (1-5)" value={room.hostel_id} onChange={(e) => handleInputChange(index, 'hostel_id', e.target.value)} required className="bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    <input type="number" placeholder="Capacity (1-3)" value={room.capacity} onChange={(e) => handleInputChange(index, 'capacity', e.target.value)} required className="bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                {room.error && <p className="text-red-400 text-xs mt-2 text-center">{room.error}</p>}
                            </div>
                        ))}
                    </div>
                </form>

                {/* Modal Footer */}
                <div className="flex justify-end items-center p-6 border-t border-gray-700 gap-4">
                    <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                    <button type="submit" onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
                        {submitting ? 'Adding...' : `Add ${numRooms} Room(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel, isProcessing, confirmText, processingText, confirmButtonColor }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center border border-gray-700">
            <h3 className="text-lg font-semibold text-white">{title || 'Confirmation'}</h3>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
            <div className="mt-6 flex justify-center gap-4">
                <button onClick={onCancel} disabled={isProcessing} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 font-medium transition-colors">Cancel</button>
                <button onClick={onConfirm} disabled={isProcessing} style={{backgroundColor: confirmButtonColor || '#dc3545' }} className="px-4 py-2 text-white rounded-md font-medium transition-colors">
                    {isProcessing ? (processingText || 'Processing...') : (confirmText || 'Confirm')}
                </button>
            </div>
        </div>
    </div>
);

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const tabs = ['students','rooms','complaints','payments'];

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

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const getValueByKey = (row, key) => {
    if (!key) return undefined;
    if (key.includes('.')) {
      const parts = key.split('.');
      let val = row;
      for (const p of parts) {
        if (val === null || val === undefined) return undefined;
        val = val[p];
      }
      return val;
    }
    return row[key];
  };

  const buildColumnsConfig = (tableData, tab) => {
  // If no data, return sensible defaults per tab
  if (!tableData || tableData.length === 0) {
    if (tab === 'complaints') {
      return [
        { key: 'id', label: 'ID' },
        { key: 'students.name', label: 'Student Name' },
        { key: 'students.room_no', label: 'Room No' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created At' },
      ];
    }

    if (tab === 'students') {
      return [
        { key: 'id', label: 'ID', width: '80px' },
        { key: 'name', label: 'Name', width: '220px' },
        { key: 'USN', label: 'USN', width: '140px' },
        { key: 'email', label: 'Email', width: '220px' },
        { key: 'room_no', label: 'Room ID', width: '160px' },
        { key: 'fee_id', label: 'Fee ID', width: '140px' },
        { key: 'actions', label: 'ACTIONS', width: '160px' },
      ];
    }

    return [{ key: 'id', label: 'ID' }, { key: 'actions', label: 'ACTIONS' }];
  }

  // Use keys from first row to keep stable order
  let keys = Object.keys(tableData[0]);

  // Remove unwanted columns globally (case-insensitive)
  const forbidden = ['arrived?', 'students', 'arrival_timestamp', 'avatar_url', 'avatar', 'password', 'complaint_id'];
  keys = keys.filter(k => !forbidden.includes(String(k).toLowerCase()));

  // Special layout for students: force desired columns & widths (remove complaint_id)
  if (tab === 'students') {
    // pick values if they exist in object, otherwise fallback to defaults
    const cols = [
      { key: 'id', label: 'ID', width: '80px' },
      { key: 'name', label: 'Name', width: '220px' },
      { key: 'USN', label: 'USN', width: '140px' },
      { key: 'email', label: 'Email', width: '220px' },
      { key: 'room_no', label: 'Room ID', width: '160px' }, // resized / filled column
      { key: 'fee_id', label: 'Fee ID', width: '140px' },   // resized / filled column
      { key: 'actions', label: 'ACTIONS', width: '160px' }
    ];
    return cols;
  }

  // Complaints: explicit ordering
  if (tab === 'complaints') {
    return [
      { key: 'id', label: 'ID' },
      { key: 'students.name', label: 'Student Name' },
      { key: 'students.room_no', label: 'Room No' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At' },
    ];
  }

  // Generic conversion for other tabs
  const cols = keys.map(k => ({ key: k, label: String(k).replace(/_/g, ' ').toUpperCase() }));

  // Ensure actions column exists for rooms/payments if needed
  if ((tab === 'rooms' || tab === 'students') && !cols.some(c => c.key === 'actions')) {
    cols.push({ key: 'actions', label: 'ACTIONS' });
  }

  return cols;
};

const handleForeignKeyClick = (targetTab, id) => {
    if (id === null || id === undefined) return;
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    // Switch to target tab first, then set highlight and bring to page 1
    setActiveTab(targetTab);
    setCurrentPage(1);
    setHighlightedRow({ tab: targetTab, id });

    // scroll top so user sees the table
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Set timer to remove highlight after 5s
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedRow({ tab: null, id: null });
    }, 5000);
  };

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
          <p style={{ color: 'white', textAlign: 'center' }}>No data available for this view.</p>
        </div>
      );
    }

    // If highlighted row belongs to this tab, bring to top so user sees it
    if (highlightedRow.tab === activeTab && highlightedRow.id !== null) {
      const highlightedIndex = displayData.findIndex(item => Number(item.id) === Number(highlightedRow.id));
      if (highlightedIndex > -1) {
        const [item] = displayData.splice(highlightedIndex, 1);
        displayData.unshift(item);
      }
    }

    const totalEntries = displayData.length;
    const totalPages = Math.ceil(totalEntries / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalEntries);
    const paginatedData = displayData.slice(startIndex, endIndex);

    const columnsConfig = buildColumnsConfig(tableData, activeTab);

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
            <thead>
              <tr>
                {columnsConfig.map(col => (
                  <th key={col.key} style={{ ...styles.th, width: col.width || 'auto' }}>
                  {col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(row => {
                const isHighlighted = highlightedRow.tab === activeTab && Number(row.id) === Number(highlightedRow.id);
                return (
                  <tr key={row.id} className={isHighlighted ? 'highlight-fade' : ''}>
                    {columnsConfig.map(col => {
                      if (col.key === 'actions') {
                        return (
                          <td key={`${row.id}-actions`} style={{ ...styles.td, paddingTop:'9px', width: col.width || '160px',padding:'5px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => setItemToDelete({ type: activeTab.slice(0, -1), data: row })}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                            {activeTab === 'students' && (
                              <button onClick={() => setStudentForReport(row)} style={styles.reportButton}>Report</button>
                            )}
                          </td>
                        );
                      }

                      const value = col.key.includes('.') ? col.key.split('.').reduce((acc, k) => acc && acc[k], row) : row[col.key];
                      const cellContent = renderCellContent(col.key, value, row);
                      return <td key={`${row.id}-${col.key}`} style={{ ...styles.td, width: col.width || 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>{cellContent}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={styles.paginationContainer}>
          <span>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</span>
          <div>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={currentPage === 1 ? styles.disabledButton : styles.paginationButton}
            >
              &lt; Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
  
  const renderCellContent = (headerKey, value, row = {}) => {
    const foreignKeyMap = { complaint_id: 'complaints', fee_id: 'payments', room_no: 'rooms' };

    // If the headerKey is nested like 'students.name' we just return the value
    if (headerKey && headerKey.includes('.')) {
      return value !== null && value !== undefined ? String(value) : 'N/A';
    }

    // Links when in students tab for certain foreign keys
    if (activeTab === 'students' && headerKey && foreignKeyMap[headerKey] && value !== null && value !== undefined) {
      const targetTab = foreignKeyMap[headerKey];
      return (
        <a
          href="#"
          style={styles.link}
          onClick={(e) => { e.preventDefault(); handleForeignKeyClick(targetTab, value); }}
        >
          {String(value)}
        </a>
      );
    }

    if (headerKey === 'created_at' && value) {
      try {
        return formatDateForDisplay(new Date(value));
      } catch {
        return String(value);
      }
    }

    if (value === null || value === undefined) return 'N/A';
    return String(value);
  };

  if (loading) return <div>Loading dashboard...</div>;

  const totalStudents = data.students.length;
  const totalRooms = data.rooms.length;
  const occupiedRooms = data.rooms.filter(r => r.current_occupancy > 0).length;
  const pendingComplaints = data.complaints.filter(c => c.status !== 'Resolved').length;

  const StatsCard = ({ title, value, icon }) => (
    <div className="bg-gray-900 rounded-xl p-6 flex items-center space-x-4 w-full">
      <div className="bg-gray-800 p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-800 font-sans">

      {/* Confirmation / Modals */}
      {studentForReport && (
        <ConfirmationModal
          title="Confirm Report Download"
          message={`Do you want to generate and download a full report for ${studentForReport.name}?`}
          onConfirm={() => handleGenerateReport(studentForReport)}
          onCancel={() => setStudentForReport(null)}
          isProcessing={isGeneratingReport}
          confirmText="Download"
          processingText="Generating..."
          confirmButtonColor="#007bff"
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

      {showAddRoomsModal && <AddRoomsModal onClose={() => setShowAddRoomsModal(false)} onAddSuccess={fetchData} />}

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

      {/* NAV */}
      <nav className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-gray-900 text-white flex flex-col transition-all duration-150`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4"/></svg> */}
            <span style={{ display: sidebarCollapsed ? 'none' : 'inline' }} className="text-lg font-bold">Admin Dashboard</span>
          </div>
          <button onClick={() => setSidebarCollapsed(s => !s)} className="p-1 rounded hover:bg-gray-800">
            {/* toggle icon */}
            <svg xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transform transition-transform duration-50 ${sidebarCollapsed ? '-translate-x-5' : 'translate-x-0'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>

          </button>
        </div>

        <div className="flex-1 p-2">
  <div className="relative" style={{ ['--active-index']: tabs.indexOf(activeTab) }}>
    {/* Sliding blue indicator behind the buttons */}

    {/* Buttons on top of the indicator */}
    <div className="flex-1 p-2">
  <div
    className="relative"
    style={{
      // constants used in the calc below (keep in sync with button classes: h-12 + gap-2)
      // BTN_HEIGHT = 3rem (h-12), BTN_GAP = 0.5rem (gap-2)
      ['--btn-height']: '3rem',
      ['--btn-gap']: '0.5rem',
    }}
  >
    {/* Sliding blue indicator (behind buttons). 
        When collapsed: centered & fully rounded (width = 3rem).
        When expanded: stretches horizontally with rounded-lg. */}
    <div
      aria-hidden="true"
      className="absolute bg-blue-600 pointer-events-none transition-all duration-150 ease-in-out"
      style={{
        height: '3rem',                                      // BTN_HEIGHT
        borderRadius: sidebarCollapsed ? '9999px' : '0.5rem',
        // expanded: leave small left/right padding; collapsed: center the indicator
        left: sidebarCollapsed ? '50%' : '0.5rem',
        right: sidebarCollapsed ? 'auto' : '0.5rem',
        width: sidebarCollapsed ? '3rem' : 'calc(100% - 1rem)',
        // translateY must account for both button height and the gap between buttons
        transform: sidebarCollapsed
          ? `translate(-50%, calc(${tabs.indexOf(activeTab)} * (var(--btn-height) + var(--btn-gap))))`
          : `translateY(calc(${tabs.indexOf(activeTab)} * (var(--btn-height) + var(--btn-gap))))`,
      }}
    />

    {/* Buttons on top of the indicator */}
    <div className="relative z-10 flex flex-col gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => { setActiveTab(tab); setHighlightedRow({ tab: null, id: null }); }}
          className={`h-12 flex items-center gap-3 px-3 text-sm font-medium relative transition-colors
            ${sidebarCollapsed ? 'justify-center' : ''} ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        >
          {/* icons (your SVGs) */}
          {tab === 'students' && <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          {tab === 'rooms' && <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 21h20"/><path d="M5 21V7l7-4 7 4v14"/><path d="M15 7v4h-4V7h4z"/></svg>}
          {tab === 'complaints' && <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
          {tab === 'payments' && <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>}

          {/* label — hidden when sidebar is collapsed */}
          <span style={{ display: sidebarCollapsed ? 'none' : 'inline' }} className="ml-2">
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </span>
        </button>
      ))}
    </div>
  </div>
</div>
  </div>
</div>


        <div className="p-3 border-t border-gray-700">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium text-gray-400 hover:bg-red-600/10 hover:text-red-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span style={{ display: sidebarCollapsed ? 'none' : 'inline' }}>Logout</span>
          </button>
        </div>
      </nav>

      {/* styles for highlight fade animation — uses an explicit final color */}
      <style>{`
        @keyframes fadeHighlight {
          from { background-color: #ff4d4d; } /* bright red start */
          to { background-color: #111827; } /* match table cell BG */
        }
        .highlight-fade > td {
          animation: fadeHighlight 5s ease-out forwards;
        }
      `}</style>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-white mb-6">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Overview</h1>

        {/* Stats: single row, horizontally scrollable on small screens */}
        <div className="mb-8">
           <div className="flex gap-6 overflow-x-auto lg:grid lg:grid-cols-4 lg:gap-6">
            <StatsCard
              title="Total Students"
              value={totalStudents}
              icon={<svg className="h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
            />
            <StatsCard
              title="Rooms Occupied"
              value={`${occupiedRooms} / ${totalRooms}`}
              icon={<svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M2 21h20"/><path d="M5 21V7l7-4 7 4v14"/></svg>}
            />
            <StatsCard
              title="Pending Complaints"
              value={pendingComplaints}
              icon={<svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/></svg>}
            />
            <StatsCard
              title="Total Payments"
              value={data.payments.length}
              icon={<svg className="h-6 w-6 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>}
            />
          </div>
        </div>

        {/* Table container */}
        <div className="bg-gray-900 shadow-lg rounded-xl">
          <div className="p-6 flex justify-between items-center">
            <div>
              <label htmlFor="rowsPerPage" className="text-gray-400 mr-2">View</label>
              <select id="rowsPerPage" value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} className="bg-gray-700 text-white rounded-md border-gray-600 focus:ring-blue-500 focus:border-blue-500">
                <option value={25}>25</option><option value={50}>50</option><option value={75}>75</option><option value={100}>100</option>
              </select>
              <label className="text-gray-400 mr-2">  Rows</label>
            </div>
            {activeTab === 'rooms' && (<button onClick={() => setShowAddRoomsModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">+ Add Rooms</button>)}
          </div>

          {activeTab === 'rooms' && <div className="px-6 pb-4">{<CsvUploader onUploadSuccess={fetchData} />}</div>}

          {renderTable()}
        </div>
      </main>
    </div>
  );
}

// STYLES OBJECT
const styles = {
  paginationContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px', marginTop: '10px', color: 'white' },
  paginationButton: { padding: '8px 16px', margin: '0 5px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', },
  disabledButton: { padding: '8px 16px', margin: '0 5px', backgroundColor: '#343a40', color: '#6c757d', border: 'none', borderRadius: '5px', cursor: 'not-allowed', },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { backgroundColor: '#111835', padding: '12px', border: '2px solid #1f2945', textAlign: 'left', color: '#9ca3af' },
  td: { padding: '12px', border: '1.5px solid #111827', backgroundColor: '#111827' },
  link: { color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' },
  csvUploader: { border: '1px solid #ddd', padding: '20px', marginBottom: '20px', borderRadius: '5px', color:"#ddd"},
  deleteButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' },
  reportButton: { backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' },
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

