import { Resend } from 'resend';
import supabase from '../../utils/supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST allowed' });
    }

    const { appointment_id, donor_id } = req.body.record || req.body; // handle both direct & webhook JSON

    if (!appointment_id || !donor_id) {
      return res.status(400).json({ error: 'Missing appointment_id or donor_id' });
    }

    // get donor details
    const { data: donor, error: donorError } = await supabase
      .from('donor')
      .select('name, email')
      .eq('id', donor_id)
      .single();

    if (donorError || !donor)
      throw new Error('Donor not found');

    // get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('date')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment)
      throw new Error('Appointment not found');

    // send email via Resend
    await resend.emails.send({
      from: 'Blood Bank <no-reply@yourdomain.com>',
      to: donor.email,
      subject: 'Appointment Confirmed – Thank You for Donating Blood ❤️',
      text: `Hi ${donor.name}, your blood donation appointment is confirmed for ${appointment.date}. Thank you for saving lives!`,
    });

    res.status(200).json({ message: 'Donor confirmation email sent' });
  } catch (err) {
    console.error('Error sending donor email:', err);
    res.status(500).json({ error: err.message });
  }
}
