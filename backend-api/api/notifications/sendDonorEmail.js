import { Resend } from 'resend';
import supabase from '../../utils/supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    // Supabase webhook payload has "record" containing new row
    const { record } = req.body;

    if (!record) {
      return res.status(400).json({ error: 'No record found in request body' });
    }

    const { donor_id, date, id } = record;

    if (!donor_id) {
      return res.status(200).json({ message: 'No donor assigned yet, skipping email' });
    }

    // Fetch donor details from Supabase
    const { data: donor, error: donorError } = await supabase
      .from('donor')
      .select('name, email')
      .eq('id', donor_id)
      .single();

    if (donorError || !donor) throw donorError || new Error('Donor not found');

    // Send confirmation email via Resend
    await resend.emails.send({
      from: 'Blood Bank <onboarding@resend.dev>',
      to: donor.email,
      subject: 'Blood Donation Appointment Confirmed',
      text: `Hi ${donor.name},

Your blood donation appointment has been confirmed.

🩸 Appointment Date: ${date}
📍 Appointment ID: ${id}

Thank you for supporting life-saving donations!`,
    });

    return res.status(200).json({ message: `Email sent successfully to ${donor.email}` });
  } catch (error) {
    console.error('Error in sendDonorEmail:', error);
    return res.status(500).json({ error: error.message });
  }
}
