import supabase from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { patientId, donorId, date } = req.body;

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ patient_id: patientId, donor_id: donorId, date }])
      .select();

    if (error) throw error;

    // Call email API after insertion
    await fetch(`${process.env.VERCEL_URL}/api/notifications/sendDonorEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorId, appointmentDate: date }),
    });

    res.status(200).json({ message: 'Appointment created and email sent', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
