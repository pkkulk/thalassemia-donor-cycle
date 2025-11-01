import { Resend } from 'resend';
import supabase from '../../utils/supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 1);

    const formattedDate = reminderDate.toISOString().split('T')[0];

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('donor_id, date')
      .eq('date', formattedDate);

    if (error) throw error;

    if (!appointments || appointments.length === 0)
      return res.status(200).json({ message: 'No reminders to send today' });

    const donorIds = appointments.map((a) => a.donor_id).filter(Boolean);

    const { data: donors } = await supabase
      .from('donor')
      .select('name, email')
      .in('id', donorIds);

    for (const donor of donors) {
      await resend.emails.send({
        from: 'Blood Bank <no-reply@yourdomain.com>',
        to: donor.email,
        subject: 'Reminder: Blood Donation Tomorrow',
        text: `Hi ${donor.name}, this is a friendly reminder for your blood donation scheduled on ${formattedDate}. Thank you!`,
      });
    }

    res.status(200).json({ message: `Sent ${donors.length} reminder emails` });
  } catch (err) {
    console.error('Error sending reminders:', err);
    res.status(500).json({ error: err.message });
  }
}
