// api/appointments/new.js
import supabase from '../../utils/supabaseClient.js';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { patient_id, donor_id, date } = req.body;

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ patient_id, donor_id, date }])
      .select();

    if (error) throw error;

    // Trigger donor email notification (optional)
    if (donor_id) {
      await axios.post(`${process.env.VERCEL_URL}/api/notifications/sendDonorEmail`, {
        donor_id,
        date,
      });
    }

    res.status(200).json({ message: 'Appointment created', data });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: error.message });
  }
}
