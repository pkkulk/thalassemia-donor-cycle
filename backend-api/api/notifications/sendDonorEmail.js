// api/notifications/sendDonorEmail.js
import { Resend } from 'resend';
import supabase from '../../utils/supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    const { appointment_id } = req.body; // appointment_id passed when donor assigned

    if (!appointment_id) {
      return res.status(400).json({ error: 'Missing appointment_id in request' });
    }

    // Fetch appointment details
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, date, donor_id, patient_id')
      .eq('id', appointment_id)
      .single();

    if (apptError || !appointment) throw apptError || new Error('Appointment not found');

    // Get donor info
    const { data: donor, error: donorError } = await supabase
      .from('donor')
      .select('name, email')
      .eq('id', appointment.donor_id)
      .single();

    if (donorError || !donor) throw donorError || new Error('Donor not found');

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('name, blood_group')
      .eq('id', appointment.patient_id)
      .single();

    if (patientError || !patient) throw patientError || new Error('Patient not found');

    // Send email
    await resend.emails.send({
      from: 'Blood Bank <noreply@yourdomain.com>',
      to: donor.email,
      subject: 'New Blood Donation Assignment',
      text: `Hi ${donor.name},

You have been assigned to donate blood for patient ${patient.name} (Blood Group: ${patient.blood_group}).

Donation Date: ${appointment.date}

Please arrive at the blood bank 4 days before the patient’s appointment.

Thank you for your contribution! ❤️

– Blood Bank Team`,
    });

    res.status(200).json({ message: `Email sent to donor ${donor.name}` });
  } catch (error) {
    console.error('Error sending donor email:', error);
    res.status(500).json({ error: error.message });
  }
}
