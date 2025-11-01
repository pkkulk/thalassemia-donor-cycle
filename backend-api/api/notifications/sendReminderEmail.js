import { Resend } from 'resend';
import supabase from '../../utils/supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 1); // one day before donation
    const formattedDate = reminderDate.toISOString().split('T')[0];

    // find tomorrow’s appointments
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('donor_id, date')
      .eq('date', formattedDate);

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0)
      return res.status(200).json({ message: 'No reminders to send today' });

    const donorIds = appointments.map(a => a.donor_id).filter(Boolean);

    const { data: donors, error: donorError } = await supabase
      .from('donor')
      .select('name, email')
      .in('id', donorIds);

    if (donorError) throw donorError;

    // send email to each donor
    for (const donor of donors) {
      await resend.emails.send({
        from: 'Blood Bank <no-reply@yourdomain.com>',
        to: donor.email,
        subject: 'Reminder: Blood Donation Tomorrow',
        text: `Hi ${donor.name}, this is a reminder for your blood donation scheduled on ${formattedDate}. Thank you for being a lifesaver!`,
      });
    }

    res.status(200).json({ message: `Sent ${donors.length} reminder emails` });
  } catch (err) {
    console.error('Error sending reminders:', err);
    res.status(500).json({ error: err.message });
  }
}
