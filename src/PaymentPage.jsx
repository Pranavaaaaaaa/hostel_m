import React, { useState } from 'react';
import { supabase } from './supabaseclient';

export default function PaymentPage({ pendingUserData, onPaymentSuccess, onPaymentFailure }) {
  const [paying, setPaying] = useState(false);
  const feeAmount = 1; // You can change this later

  const handlePayment = async () => {
    setPaying(true);

    // --- The 4-Step Transaction ---

    // 1. Find and allot a room.
    const { data: allottedRoomId, error: allotmentError } = await supabase.rpc('find_and_allot_room', {
      chosen_capacity: pendingUserData.chosen_capacity,
    });
    if (allotmentError || !allottedRoomId) {
      alert(`Sorry, no rooms with capacity ${pendingUserData.chosen_capacity} are available.`);
      onPaymentFailure(); // Go back to the sign-up page
      return;
    }

    // 2. Create the user in Supabase Auth. This sends the verification email.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: pendingUserData.email,
      password: pendingUserData.password,
    });
    if (authError) {
      alert('Could not create user account: ' + authError.message);
      onPaymentFailure();
      return;
    }
    if (!authData.user) {
      alert('An unknown error occurred creating the user.');
      onPaymentFailure();
      return;
    }

    // 3. Create the STUDENT record first (without fee_id)
    const { data: newStudent, error: studentError } = await supabase
      .from('students')
      .insert({
        id: authData.user.id,
        name: pendingUserData.name,
        USN: pendingUserData.usn,
        email: pendingUserData.email,
        room_no: allottedRoomId.id,
        "arrived?": false,
      }).select().single();

    if (studentError) {
      alert('Payment successful, but failed to create student profile: ' + studentError.message);
      onPaymentFailure();
      return;
    }

    // 4. Create the PAYMENT record, now with the student's ID
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({ student_id: newStudent.id, amount_paid: feeAmount, status: 'successful' })
      .select()
      .single();
    if (paymentError) {
      alert('Student profile created, but failed to create fee record.');
      onPaymentFailure();
      return;
    }

    // 5. FINAL STEP: Update the student record with the new payment ID (fee_id)
    await supabase
      .from('students')
      .update({ fee_id: newPayment.id })
      .eq('id', newStudent.id);
      
    onPaymentSuccess(newStudent, newPayment, allottedRoomId.hostel_id);
  };

  if (!pendingUserData) {
    return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <h2>Invalid Session</h2>
            <p>Your sign-up information was lost. Please start the process again.</p>
            <button onClick={onPaymentFailure}>Return to Sign Up</button>
        </div>
    );
  }
  
  return (
    <div style={styles.paymentContainer}>
      <div style={styles.paymentBox}>
        <h2 style={styles.header}>Confirm Your Payment</h2>
        <p style={styles.subHeader}>Final step to confirm your room allotment.</p>
        <div style={styles.detailRow}><span>Student Name:</span><span>{pendingUserData.name}</span></div>
        <div style={styles.detailRow}><span>Room Choice:</span><span>{pendingUserData.chosen_capacity}-Seater</span></div>
        <hr style={styles.hr} />
        <div style={styles.totalRow}><span>Amount Payable:</span><span style={styles.amount}>₹{feeAmount}.00</span></div>
        <button onClick={handlePayment} disabled={paying} style={styles.payButton}>
          {paying ? 'Confirming Allotment...' : `Pay ₹${feeAmount}.00 Securely`}
        </button>
        <p style={styles.disclaimer}>This is a simulated payment for demonstration purposes.</p>
      </div>
    </div>
  );
}

const styles = {
    paymentContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' },
    paymentBox: { width: '100%', maxWidth: '400px', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    header: { textAlign: 'center', color: '#333', margin: '0 0 10px 0' },
    subHeader: { textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '30px' },
    detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '16px' },
    hr: { border: 'none', borderTop: '1px solid #eee', margin: '20px 0' },
    totalRow: { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginBottom: '30px' },
    amount: { color: '#007bff' },
    payButton: { width: '100%', padding: '15px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', transition: 'background-color 0.2s' },
    disclaimer: { fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '20px' }
};

