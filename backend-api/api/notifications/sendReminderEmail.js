// api/notifications/sendReminderEmail.js
import nodemailer from 'nodemailer';
import supabase from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 1); // remind donors 1 day before donation

    const formattedDate = reminderDate.toISOString().split('T')[0];

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('donor_id, date')
      .eq('date', formattedDate);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return res.status(200).json({ message: 'No reminders to send today' });
    }

    const donorIds = appointments.map((a) => a.donor_id).filter(Boolean);

    const { data: donors } = await supabase
      .from('donor')
      .select('name, email')
      .in('id', donorIds);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    for (const donor of donors) {
      await transporter.sendMail({
        from: `"Blood Bank" <${process.env.EMAIL_USER}>`,
        to: donor.email,
        subject: 'Reminder: Blood Donation Tomorrow',
        text: `Hi ${donor.name}, this is a friendly reminder for your blood donation scheduled on ${formattedDate}. Thank you!`,
      });
    }

    res.status(200).json({ message: `Sent ${donors.length} reminder emails` });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ error: error.message });
  }
}
