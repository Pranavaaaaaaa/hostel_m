import React from 'react';

// This component receives the final student and payment data after a successful transaction.
export default function ReceiptPage({ receiptData, onGoToLogin }) {
  if (!receiptData || !receiptData.student || !receiptData.payment) {
    return (
      <div>
        <h2>Error</h2>
        <p>Could not load receipt data. Please check your email for confirmation and log in.</p>
        <button onClick={onGoToLogin}>Go to Login</button>
      </div>
    );
  }

  const { student, payment, hostel_id } = receiptData;
  const paymentDate = new Date(payment.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.receiptContainer}>
        <div style={styles.header}>
          <h1>Payment Receipt</h1>
          <p style={styles.hostelName}>SJBIT Hostel</p>
        </div>
        <div style={styles.details}>
          <div style={styles.detailRow}>
            <strong>Receipt ID:</strong>
            <span>PAY-{String(payment.id).padStart(6, '0')}</span>
          </div>
          <div style={styles.detailRow}>
            <strong>Payment Date:</strong>
            <span>{paymentDate}</span>
          </div>
          <hr style={styles.hr} />
          <div style={styles.detailRow}>
            <strong>Student Name:</strong>
            <span>{student.name}</span>
          </div>
          <div style={styles.detailRow}>
            <strong>Student USN:</strong>
            <span>{student.USN}</span>
          </div>
           <div style={styles.detailRow}>
            <strong>Allotted Room No:</strong>
            <span>{student.room_no}</span>
          </div>
          <div style={styles.detailRow}>
            <strong>Hostel ID:</strong>
            <span>{hostel_id}</span>
          </div>
          <hr style={styles.hr} />
          <div style={styles.totalRow}>
            <strong>Amount Paid:</strong>
            <span style={styles.amount}>₹{payment.amount_paid}.00</span>
          </div>
        </div>
        <div style={styles.footer}>
          <p>Thank you for your payment. Your room is confirmed.</p>
          <p>Please check your email to verify your account and log in.</p>
        </div>
      </div>
      <div style={styles.actions}>
          <button onClick={handlePrint} style={styles.printButton}>Print Receipt</button>
          <button onClick={onGoToLogin} style={styles.loginButton}>Go to Login Page</button>
      </div>
    </div>
  );
}

const styles = {
    pageContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#e9e9e9', fontFamily: 'Arial, sans-serif' },
    receiptContainer: { width: '100%', maxWidth: '450px', padding: '30px', backgroundColor: 'white', border: '1px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    header: { textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '15px', marginBottom: '20px' },
    h1: {color: "#000"},
    hostelName: { margin: 0, color: '#555', fontSize: '16px' },
    details: { marginBottom: '30px' },
    detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color:"#333" },
    hr: { border: 'none', borderTop: '1px dashed #ccc', margin: '15px 0' },
    totalRow: { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginTop: '20px', color:"#000" },
    amount: { color: '#28a745' },
    footer: { textAlign: 'center', fontSize: '12px', color: '#777', borderTop: '1px solid #eee', paddingTop: '15px' },
    actions: { marginTop: '20px', display: 'flex', gap: '15px' },
    printButton: { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    loginButton: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
};
