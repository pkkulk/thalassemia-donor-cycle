// api/notifications/sendDonorEmail.js
import nodemailer from 'nodemailer';
import supabase from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { donor_id, date } = req.body;

    // Fetch donor details
    const { data: donor, error } = await supabase
      .from('donor')
      .select('name, email')
      .eq('id', donor_id)
      .single();

    if (error || !donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Set up mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Blood Bank" <${process.env.EMAIL_USER}>`,
      to: donor.email,
      subject: 'New Blood Donation Appointment Scheduled',
      text: `Hi ${donor.name}, your blood donation is scheduled on ${date}. Please be on time!`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: `Email sent to ${donor.email}` });
  } catch (error) {
    console.error('Error sending donor email:', error);
    res.status(500).json({ error: error.message });
  }
}
// api/notifications/sendDonorEmail.js
import nodemailer from 'nodemailer';
import supabase from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { donor_id, date } = req.body;

    // Fetch donor details
    const { data: donor, error } = await supabase
      .from('donor')
      .select('name, email')
      .eq('id', donor_id)
      .single();

    if (error || !donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Set up mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Blood Bank" <${process.env.EMAIL_USER}>`,
      to: donor.email,
      subject: 'New Blood Donation Appointment Scheduled',
      text: `Hi ${donor.name}, your blood donation is scheduled on ${date}. Please be on time!`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: `Email sent to ${donor.email}` });
  } catch (error) {
    console.error('Error sending donor email:', error);
    res.status(500).json({ error: error.message });
  }
}
