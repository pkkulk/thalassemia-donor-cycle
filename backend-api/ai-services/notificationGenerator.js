/**
 * Notification Generator Service
 * 
 * Generates personalized, contextual notifications using:
 * - Template-based system (default)
 * - OpenAI API integration (optional, for advanced personalization)
 * 
 * Handles:
 * - Donor assignment emails
 * - Reminder notifications
 * - Urgency alerts
 * - Status updates
 */

import { Resend } from 'resend';
import supabase from '../utils/supabaseClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== TEMPLATE-BASED APPROACH ====================
// This works without external APIs

/**
 * Generate contextual email for donor assignment
 */
export async function generateDonorAssignmentEmail(appointmentId) {
  try {
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('*, patients!inner(name, blood_group), donor!inner(name, email)')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      throw new Error('Appointment not found');
    }

    const { donor, patients: patient, date } = appointment;
    const urgencyLevel = appointment.urgency_level || 'routine';
    
    // Personalize based on urgency
    let subject, greeting, body, tone;

    if (urgencyLevel === 'CRITICAL') {
      subject = '🚨 URGENT: Life-Saving Blood Donation Needed';
      tone = 'urgent';
      greeting = `Hi ${donor.name},\n\nWe have a CRITICAL situation that needs your immediate help.`;
    } else if (urgencyLevel === 'HIGH') {
      subject = '⚠️ Important: Blood Donation Needed Soon';
      tone = 'important';
      greeting = `Hi ${donor.name},\n\nWe have an important request for your help.`;
    } else {
      subject = '🩸 Blood Donation Appointment Scheduled';
      tone = 'friendly';
      greeting = `Hi ${donor.name},\n\nThank you for being part of our donor community!`;
    }

    const emailContent = generateDonorEmailTemplate(
      donor.name,
      patient.name,
      patient.blood_group,
      date,
      tone
    );

    return {
      success: true,
      recipient_email: donor.email,
      recipient_name: donor.name,
      subject,
      body: emailContent,
      tone,
      appointment_id: appointmentId
    };

  } catch (error) {
    console.error('Error generating donor email:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Email template for donor assignments
 */
function generateDonorEmailTemplate(donorName, patientName, bloodGroup, date, tone = 'friendly') {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const templates = {
    critical: `
Hi ${donorName},

We have a CRITICAL situation that needs your immediate help. A thalassemia patient (${patientName}, Blood Type: ${bloodGroup}) requires an urgent blood transfusion.

🩸 APPOINTMENT DETAILS:
📅 Date: ${formattedDate}
⏰ Time: Please confirm ASAP
🏥 Location: Blood Bank Center
👤 Patient: ${patientName}

Your donation could be life-saving. Please respond IMMEDIATELY to confirm your availability.

Contact: +1-XXX-XXX-XXXX
Questions? Reply to this email or call our hotline.

Thank you for being a lifesaver!
The Blood Bank Team
    `,
    important: `
Hi ${donorName},

We're reaching out because we need your help. A thalassemia patient (${patientName}, Blood Type: ${bloodGroup}) needs a blood transfusion soon.

🩸 APPOINTMENT DETAILS:
📅 Date: ${formattedDate}
🏥 Location: Blood Bank Center
👤 Patient: ${patientName}

We really value your support and would be grateful if you could confirm your availability for this appointment.

📱 Please confirm in the mobile app or call us at +1-XXX-XXX-XXXX

Thank you for your compassion!
The Blood Bank Team
    `,
    friendly: `
Hi ${donorName},

Thank you for being part of our donor community! We have scheduled an appointment for a blood donation.

🩸 APPOINTMENT DETAILS:
📅 Date: ${formattedDate}
🏥 Location: Blood Bank Center
👤 Helping: ${patientName} (Blood Type: ${bloodGroup})

Your donation will directly help a thalassemia patient maintain their health and quality of life.

📱 Please confirm your availability in the app

If you have any questions, feel free to contact us.

Gratitude from our entire team!
The Blood Bank Team
    `
  };

  return templates[tone] || templates.friendly;
}

/**
 * Generate reminder notification based on time to appointment
 */
export async function generateReminderNotification(appointmentId) {
  try {
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('*, donor!inner(name, email), patients!inner(name)')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      throw new Error('Appointment not found');
    }

    const daysUntil = Math.ceil(
      (new Date(appointment.date) - new Date()) / (1000 * 60 * 60 * 24)
    );

    let subject, message;

    if (daysUntil === 4) {
      subject = '🗓️ Reminder: Your blood donation is in 4 days';
      message = `Hi ${appointment.donor.name}, just a friendly reminder that your scheduled blood donation for ${appointment.patients.name} is coming up in 4 days (${appointment.date}). Please make sure to prepare (stay hydrated, get good sleep, eat well). See you soon!`;
    } else if (daysUntil === 1) {
      subject = '🔔 Final Reminder: Donation Tomorrow!';
      message = `Hi ${appointment.donor.name}, your blood donation appointment is TOMORROW (${appointment.date}). Please confirm you're still available. If not, let us know ASAP so we can find an alternative.`;
    } else if (daysUntil === 0) {
      subject = '⏰ TODAY: Your Blood Donation Appointment';
      message = `Hi ${appointment.donor.name}, your blood donation is scheduled for TODAY! Please aim to arrive 15 minutes early. Thank you for saving a life!`;
    }

    return {
      success: true,
      appointment_id: appointmentId,
      recipient_name: appointment.donor.name,
      recipient_email: appointment.donor.email,
      subject,
      message,
      days_until: daysUntil
    };

  } catch (error) {
    console.error('Error generating reminder:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Generate alert for admin when critical patient is waiting
 */
export async function generateAdminAlert(patientId) {
  try {
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    const { data: lastAppt } = await supabase
      .from('appointments')
      .select('date')
      .eq('patient_id', patientId)
      .eq('status', 'Completed')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const daysSinceLast = lastAppt ?
      Math.floor((new Date() - new Date(lastAppt.date)) / (1000 * 60 * 60 * 24)) : 999;

    let alertLevel, subject, description;

    if (daysSinceLast >= 40) {
      alertLevel = 'CRITICAL';
      subject = '🚨 CRITICAL: Patient needs immediate transfusion';
      description = `Patient ${patient.name} (ID: ${patientId}) hasn't had a transfusion in ${daysSinceLast} days. IMMEDIATE ACTION REQUIRED.`;
    } else if (daysSinceLast >= 35) {
      alertLevel = 'HIGH';
      subject = '⚠️ HIGH PRIORITY: Patient overdue for transfusion';
      description = `Patient ${patient.name} is ${daysSinceLast} days overdue. Schedule transfusion within 48 hours.`;
    } else {
      alertLevel = 'MEDIUM';
      subject = '📢 REMINDER: Patient approaching transfusion cycle';
      description = `Patient ${patient.name} is due for transfusion in approximately ${35 - daysSinceLast} days.`;
    }

    return {
      success: true,
      patient_id: patientId,
      patient_name: patient.name,
      alert_level: alertLevel,
      subject,
      description,
      days_since_last_transfusion: daysSinceLast,
      action_required: alertLevel !== 'MEDIUM'
    };

  } catch (error) {
    console.error('Error generating admin alert:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// ==================== OPENAI INTEGRATION (OPTIONAL) ====================
// For more advanced, personalized content

/**
 * Generate AI-personalized notification using OpenAI (if API key available)
 * Falls back to template if API unavailable
 */
export async function generateAIPersonalizedEmail(appointmentId) {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    // Fall back to template-based approach
    console.log('OpenAI API key not configured, using template-based generation');
    return generateDonorAssignmentEmail(appointmentId);
  }

  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, patients!inner(name, blood_group, age), donor!inner(name, email, completed_appointments, total_appointments)')
      .eq('id', appointmentId)
      .single();

    // Prepare context for AI
    const donorReliability = appointment.donor.total_appointments ? 
      Math.round((appointment.donor.completed_appointments / appointment.donor.total_appointments) * 100) : 0;

    const prompt = `Generate a warm, personalized email to ask ${appointment.donor.name} for a blood donation:
- Patient: ${appointment.patients.name}, age ${appointment.patients.age}
- Blood Type: ${appointment.patients.blood_group}
- Date: ${appointment.date}
- Donor's reliability: ${donorReliability}% (completed ${appointment.donor.completed_appointments}/${appointment.donor.total_appointments} donations)

Make it personal, empowering, and emphasize the life-saving impact. Keep it to 200 words.`;

    // Note: This requires @openai/sdk to be installed
    // For now, returning template as fallback
    console.log('OpenAI integration - to implement, install: npm install openai');
    return generateDonorAssignmentEmail(appointmentId);

  } catch (error) {
    console.error('Error generating AI email:', error);
    // Fall back to template
    return generateDonorAssignmentEmail(appointmentId);
  }
}

/**
 * Send generated email via Resend
 */
export async function sendEmail(emailData) {
  try {
    if (!emailData.success) {
      return {
        success: false,
        message: 'Email generation failed'
      };
    }

    const result = await resend.emails.send({
      from: 'Blood Bank <onboarding@resend.dev>',
      to: emailData.recipient_email,
      subject: emailData.subject,
      text: emailData.body || emailData.message
    });

    return {
      success: true,
      message: `Email sent to ${emailData.recipient_email}`,
      email_id: result.id,
      recipient: emailData.recipient_email
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
