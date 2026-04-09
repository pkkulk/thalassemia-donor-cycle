/**
 * Priority Scoring Service
 * 
 * ML-based urgency scoring for patients
 * Considers:
 * - Days since last transfusion
 * - Hemoglobin levels (if available)
 * - Medical flags/alerts
 * - Historical patterns
 * 
 * Score Range: 0-100
 * Higher score = Higher urgency
 */

import supabase from '../utils/supabaseClient.js';

/**
 * Calculate urgency score for a patient
 * This is a deterministic algorithm, can be enhanced with actual ML models
 */
function calculateUrgencyScore(patient, lastTransfusionDate, hasMedicalAlert = false) {
  let score = 0;

  // 1. Days Since Last Transfusion (Critical - 50 points max)
  if (lastTransfusionDate) {
    const daysSinceLast = Math.floor(
      (new Date() - new Date(lastTransfusionDate)) / (1000 * 60 * 60 * 24)
    );

    // Typical transfusion cycle for thalassemia: 28-35 days
    if (daysSinceLast >= 35) {
      score += 50; // Overdue
    } else if (daysSinceLast >= 28) {
      score += 40; // Due soon
    } else if (daysSinceLast >= 21) {
      score += 25; // Upcoming
    } else if (daysSinceLast >= 14) {
      score += 10; // Scheduled
    }
  } else {
    score += 35; // New patient or first transfusion
  }

  // 2. Age Factor (Age affects transfusion frequency)
  // Younger patients may need more frequent transfusions
  if (patient.age && patient.age < 18) {
    score += 15; // Pediatric cases are more urgent
  }

  // 3. Medical Flags/Alerts (20 points)
  if (hasMedicalAlert || patient.emergency_flag) {
    score += 20; // Emergency flagged by doctor
  }

  if (patient.comorbidities && patient.comorbidities.length > 0) {
    score += 10; // Multiple health conditions increase urgency
  }

  // 4. Transfusion History (depends on frequency pattern)
  if (patient.transfusion_frequency_days) {
    // If patient usually needs transfusions every X days
    // and they're approaching that date, increase urgency
    const daysSinceLast = lastTransfusionDate ?
      Math.floor((new Date() - new Date(lastTransfusionDate)) / (1000 * 60 * 60 * 24)) : 999;
    
    const percentThroughCycle = (daysSinceLast / patient.transfusion_frequency_days) * 100;
    if (percentThroughCycle > 90) {
      score += 5; // Very close to next scheduled transfusion
    }
  }

  // 5. Recent Complications (10 points)
  if (patient.recent_complications && patient.recent_complications.length > 0) {
    score += 10;
  }

  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, score));
}

/**
 * Classify urgency level based on score
 */
function classifyUrgency(score) {
  if (score >= 75) return { level: 'CRITICAL', label: '🔴 Critical', color: '#ff0000' };
  if (score >= 60) return { level: 'HIGH', label: '🟠 High', color: '#ff9800' };
  if (score >= 40) return { level: 'MEDIUM', label: '🟡 Medium', color: '#ffeb3b' };
  if (score >= 20) return { level: 'LOW', label: '🟢 Low', color: '#4caf50' };
  return { level: 'ROUTINE', label: '⚪ Routine', color: '#9e9e9e' };
}

/**
 * Get priority-sorted list of patients waiting for appointments
 */
export async function getPrioritizedPatientQueue() {
  try {
    // Fetch all pending appointments (not yet assigned doctors)
    const { data: pendingAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('id, patient_id, date, created_at, status')
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });

    if (apptError) throw apptError;

    // Fetch patient details for pending appointments
    const patientIds = pendingAppointments?.map(a => a.patient_id) || [];
    
    if (patientIds.length === 0) {
      return {
        success: true,
        message: 'No pending appointments',
        queue: []
      };
    }

    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('id, name, age, blood_group, emergency_flag, comorbidities, recent_complications, transfusion_frequency_days')
      .in('id', patientIds);

    if (patientError) throw patientError;

    // Fetch last transfusion date for each patient
    const { data: transfusionHistory } = await supabase
      .from('appointments')
      .select('patient_id, date')
      .in('patient_id', patientIds)
      .eq('status', 'Completed')
      .order('date', { ascending: false });

    // Create map of patient's last transfusion
    const lastTransfusionMap = {};
    transfusionHistory?.forEach(appt => {
      if (!lastTransfusionMap[appt.patient_id]) {
        lastTransfusionMap[appt.patient_id] = appt.date;
      }
    });

    // Score each patient
    const scoredQueue = patients.map(patient => {
      const appointmentRecord = pendingAppointments.find(a => a.patient_id === patient.id);
      const lastTransfusion = lastTransfusionMap[patient.id];
      const urgencyScore = calculateUrgencyScore(patient, lastTransfusion, patient.emergency_flag);
      const urgencyClassification = classifyUrgency(urgencyScore);

      return {
        appointment_id: appointmentRecord.id,
        patient_id: patient.id,
        patient_name: patient.name,
        blood_group: patient.blood_group,
        age: patient.age,
        requested_date: appointmentRecord.date,
        days_waiting: Math.floor(
          (new Date() - new Date(appointmentRecord.created_at)) / (1000 * 60 * 60 * 24)
        ),
        last_transfusion: lastTransfusion,
        urgency_score: urgencyScore,
        urgency_level: urgencyClassification.level,
        urgency_label: urgencyClassification.label,
        urgency_color: urgencyClassification.color,
        reason: generateUrgencyReason(patient, lastTransfusion, urgencyScore)
      };
    })
    .sort((a, b) => b.urgency_score - a.urgency_score); // Highest urgency first

    return {
      success: true,
      message: `Prioritized queue of ${scoredQueue.length} patients`,
      queue: scoredQueue
    };

  } catch (error) {
    console.error('Error in getPrioritizedPatientQueue:', error);
    return {
      success: false,
      message: error.message,
      queue: []
    };
  }
}

/**
 * Generate human-readable urgency reason
 */
function generateUrgencyReason(patient, lastTransfusionDate, score) {
  const reasons = [];

  if (lastTransfusionDate) {
    const daysSinceLast = Math.floor(
      (new Date() - new Date(lastTransfusionDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLast >= 35) {
      reasons.push(`${daysSinceLast} days since last transfusion (overdue)`);
    } else if (daysSinceLast >= 28) {
      reasons.push(`Approaching standard transfusion cycle (${daysSinceLast}d)`);
    }
  }

  if (patient.emergency_flag) {
    reasons.push('Medical emergency flag');
  }

  if (patient.age && patient.age < 18) {
    reasons.push('Pediatric patient');
  }

  if (patient.comorbidities && patient.comorbidities.length > 0) {
    reasons.push('Multiple health conditions');
  }

  return reasons.join(' | ');
}

/**
 * Score a specific patient for scheduling priority
 */
export async function scorePatient(patientId) {
  try {
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      throw new Error('Patient not found');
    }

    // Get last transfusion
    const { data: lastAppt } = await supabase
      .from('appointments')
      .select('date')
      .eq('patient_id', patientId)
      .eq('status', 'Completed')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const score = calculateUrgencyScore(patient, lastAppt?.date);
    const classification = classifyUrgency(score);

    return {
      success: true,
      patient_id: patientId,
      patient_name: patient.name,
      urgency_score: score,
      ...classification,
      last_transfusion: lastAppt?.date || 'No transfusion history'
    };

  } catch (error) {
    console.error('Error scoring patient:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const { queue } = await getPrioritizedPatientQueue();

    if (!queue || queue.length === 0) {
      return {
        total_waiting: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        avg_wait_days: 0
      };
    }

    const stats = {
      total_waiting: queue.length,
      critical: queue.filter(p => p.urgency_level === 'CRITICAL').length,
      high: queue.filter(p => p.urgency_level === 'HIGH').length,
      medium: queue.filter(p => p.urgency_level === 'MEDIUM').length,
      low: queue.filter(p => p.urgency_level === 'LOW').length,
      avg_wait_days: Math.round(queue.reduce((sum, p) => sum + p.days_waiting, 0) / queue.length)
    };

    return stats;
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
}
