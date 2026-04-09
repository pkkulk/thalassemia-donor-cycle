/**
 * Intelligent Appointment Booking Endpoint
 * 
 * Uses AI services to:
 * 1. Automatically suggest best donor matches
 * 2. Score patient urgency
 * 3. Generate personalized notifications
 * 4. Optimize scheduling
 */

import { findBestDonors } from '../ai-services/donorMatcher.js';
import { scorePatient, getPrioritizedPatientQueue } from '../ai-services/priorityScorer.js';
import { generateDonorAssignmentEmail, sendEmail } from '../ai-services/notificationGenerator.js';
import supabase from '../utils/supabaseClient.js';

/**
 * POST /api/appointments/intelligent
 * 
 * Intelligently create an appointment with AI-matched donor
 * 
 * Request body:
 * {
 *   patientId: string,
 *   date: string (YYYY-MM-DD),
 *   isEmergency: boolean (optional)
 * }
 * 
 * Response: Appointment created with best-matched donor
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patientId, date, isEmergency = false, autoAssign = true } = req.body;

    // Validate inputs
    if (!patientId || !date) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, date'
      });
    }

    // Step 1: Create appointment record (unassigned initially)
    console.log(`Creating appointment for patient ${patientId} on ${date}`);
    
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert([{
        patient_id: patientId,
        date: date,
        status: 'Pending',
        created_via: 'intelligent_booking'
      }])
      .select();

    if (apptError) throw apptError;

    const appointmentId = appointment[0].id;

    // Step 2: Score patient urgency
    console.log(`Scoring patient urgency...`);
    const urgencyResult = await scorePatient(patientId);

    // Step 3: Find best donor matches
    console.log(`Finding best donor matches...`);
    const matchingResult = await findBestDonors(patientId, date, isEmergency);

    if (!matchingResult.success || matchingResult.candidates.length === 0) {
      // No donor found - return appointment in pending state
      return res.status(202).json({
        status: 'partial',
        message: 'Appointment created but no compatible donors available at this time',
        appointment_id: appointmentId,
        appointment_status: 'Pending',
        next_steps: 'Admin will manually assign a donor or suggest alternative date',
        patient_urgency: urgencyResult,
        waiting_for: 'Manual donor assignment'
      });
    }

    // Step 4: Auto-assign best donor (if enabled)
    let assignedDonor = null;
    if (autoAssign) {
      const bestDonor = matchingResult.candidates[0];
      console.log(`Auto-assigning donor: ${bestDonor.donor_id}`);

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          donor_id: bestDonor.donor_id,
          status: 'Assigned',
          donor_match_score: bestDonor.matchScore
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      assignedDonor = bestDonor;

      // Step 5: Generate and send personalized notification
      console.log(`Generating notification for donor ${bestDonor.donor_id}`);
      const emailData = await generateDonorAssignmentEmail(appointmentId);
      
      if (emailData.success) {
        await sendEmail(emailData);
      }
    }

    // Return comprehensive response
    return res.status(201).json({
      status: 'success',
      message: autoAssign ? 'Appointment created and donor assigned' : 'Appointment created with donor suggestions',
      appointment: {
        id: appointmentId,
        patient_id: patientId,
        date: date,
        status: autoAssign ? 'Assigned' : 'Pending',
        donor_id: assignedDonor?.donor_id || null
      },
      patient_urgency: {
        score: urgencyResult.urgency_score,
        level: urgencyResult.urgency_level,
        label: urgencyResult.urgency_label
      },
      donor_assignment: assignedDonor ? {
        rank: assignedDonor.rank,
        donor_id: assignedDonor.donor_id,
        donor_name: assignedDonor.donor_name,
        match_score: assignedDonor.matchScore,
        reliability: assignedDonor.reliability_percentage,
        reason: assignedDonor.reason
      } : null,
      alternatives: !autoAssign ? matchingResult.candidates.slice(1, 3) : [],
      notification_sent: assignedDonor ? true : false
    });

  } catch (error) {
    console.error('Error in intelligent appointment booking:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
