/**
 * Intelligent Donor Matching Service
 * 
 * Matches patients with best available donors based on:
 * - Blood type compatibility
 * - Availability
 * - Location proximity (if available)
 * - Historical success rate
 * - Emergency prioritization
 */

import supabase from '../utils/supabaseClient.js';

// Blood type compatibility matrix
const BLOOD_COMPATIBILITY = {
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'O-': ['O-', 'A-', 'B-', 'AB-'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A-', 'AB-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B-', 'AB-'],
  'AB+': ['AB+', 'AB-'],
  'AB-': ['AB-'],
};

/**
 * Score a donor based on multiple factors
 */
function scoreDonor(donor, patient, appointmentDate) {
  let score = 100; // Base score

  // 1. Blood Type Compatibility (Critical - 30 points)
  const compatibleTypes = BLOOD_COMPATIBILITY[patient.blood_group] || [];
  if (!compatibleTypes.includes(donor.blood_group)) {
    return -1; // Incompatible - reject
  }
  if (donor.blood_group === patient.blood_group) {
    score += 30; // Exact match bonus
  } else {
    score += 15; // Compatible but not exact
  }

  // 2. Recent Availability (20 points)
  if (donor.last_donation_date) {
    const daysSinceDonation = Math.floor(
      (new Date(appointmentDate) - new Date(donor.last_donation_date)) / (1000 * 60 * 60 * 24)
    );
    // Donors need at least 56 days between donations (medical guideline)
    if (daysSinceDonation < 56) {
      return -1; // Not eligible
    }
    if (daysSinceDonation >= 90) {
      score += 20; // Recently eligible
    } else if (daysSinceDonation >= 56) {
      score += 10; // Minimally eligible
    }
  }

  // 3. Reliability Score (15 points)
  // % of appointments they actually completed
  if (donor.total_appointments && donor.completed_appointments) {
    const reliability = donor.completed_appointments / donor.total_appointments;
    score += Math.min(15, reliability * 20);
  }

  // 4. Distance/Location (15 points) - if location data available
  if (donor.city && patient.city && donor.city === patient.city) {
    score += 15; // Same city bonus
  } else if (donor.city && patient.city) {
    score += 5; // Different city
  }

  // 5. Communication Responsiveness (10 points)
  // If available in database - avg response time
  if (donor.avg_response_time_hours && donor.avg_response_time_hours < 24) {
    score += 10;
  }

  // 6. Preferred Donor Bonus (5 points)
  // If patient has specified a preferred donor
  // This would be set in patient profile
  if (donor.is_preferred) {
    score += 5;
  }

  return score;
}

/**
 * Find the best donor for a patient
 * Priority logic:
 * 1. Emergency cases get fastest available match
 * 2. Regular cases get optimal match (highest score)
 * 3. Returns top 3 options for admin to choose
 */
export async function findBestDonors(patientId, appointmentDate, isEmergency = false) {
  try {
    // Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, blood_group, city, urgency_level')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Fetch all available donors
    const { data: allDonors, error: donorError } = await supabase
      .from('donor')
      .select('id, name, blood_group, city, last_donation_date, total_appointments, completed_appointments, avg_response_time_hours, is_preferred')
      .eq('is_active', true);

    if (donorError) {
      throw new Error(`Error fetching donors: ${donorError.message}`);
    }

    // Filter out donors who don't have conflicting appointments
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('donor_id')
      .eq('date', appointmentDate)
      .eq('status', 'Confirmed');

    const busyDonorIds = new Set(existingAppointments?.map(a => a.donor_id) || []);
    const availableDonors = allDonors.filter(d => !busyDonorIds.has(d.id));

    if (availableDonors.length === 0) {
      return {
        success: false,
        message: 'No donors available for this date',
        candidates: []
      };
    }

    // Score all donors
    const scoredDonors = availableDonors
      .map(donor => ({
        ...donor,
        matchScore: scoreDonor(donor, patient, appointmentDate)
      }))
      .filter(d => d.matchScore > 0) // Remove incompatible
      .sort((a, b) => b.matchScore - a.matchScore); // Highest score first

    if (scoredDonors.length === 0) {
      return {
        success: false,
        message: 'No compatible donors available',
        candidates: []
      };
    }

    // For emergency cases, return top 1 immediately
    // For regular cases, return top 3 for admin review
    const topDonors = isEmergency ? scoredDonors.slice(0, 1) : scoredDonors.slice(0, 3);

    return {
      success: true,
      message: `Found ${topDonors.length} compatible donor(s)`,
      patient: {
        id: patient.id,
        name: patient.name,
        blood_group: patient.blood_group,
        urgency_level: patient.urgency_level
      },
      candidates: topDonors.map((d, idx) => ({
        rank: idx + 1,
        donor_id: d.id,
        donor_name: d.name,
        blood_group: d.blood_group,
        location: d.city,
        reliability_percentage: d.total_appointments ? 
          Math.round((d.completed_appointments / d.total_appointments) * 100) : 0,
        matchScore: d.matchScore,
        reason: generateMatchReason(d, patient)
      }))
    };

  } catch (error) {
    console.error('Error in findBestDonors:', error);
    return {
      success: false,
      message: error.message,
      candidates: []
    };
  }
}

/**
 * Generate human-readable reason for the match
 */
function generateMatchReason(donor, patient) {
  const reasons = [];

  if (donor.blood_group === patient.blood_group) {
    reasons.push('Exact blood type match');
  } else {
    reasons.push('Compatible blood type');
  }

  if (donor.city === patient.city) {
    reasons.push('Same location');
  }

  if (donor.completed_appointments / donor.total_appointments > 0.9) {
    reasons.push('Highly reliable');
  }

  return reasons.join(' • ');
}

/**
 * Get matching statistics for admin dashboard
 */
export async function getMatchingStats() {
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('donor_id, status');

    const { data: donors } = await supabase
      .from('donor')
      .select('id, total_appointments, completed_appointments');

    const stats = {
      total_appointments: appointments?.length || 0,
      completed: appointments?.filter(a => a.status === 'Completed').length || 0,
      success_rate: 0,
      avg_donor_reliability: 0
    };

    if (donors && donors.length > 0) {
      const avgReliability = donors.reduce((sum, d) => {
        const rate = d.total_appointments ? d.completed_appointments / d.total_appointments : 0;
        return sum + rate;
      }, 0) / donors.length;
      stats.avg_donor_reliability = Math.round(avgReliability * 100);
    }

    if (stats.total_appointments > 0) {
      stats.success_rate = Math.round((stats.completed / stats.total_appointments) * 100);
    }

    return stats;
  } catch (error) {
    console.error('Error getting matching stats:', error);
    return null;
  }
}
