# 🎯 Implementation Guide: Intelligent Donor Matching

## Overview
This feature automatically matches thalassemia patients with the best available donors based on:
- ✅ Blood type compatibility
- ✅ Donor availability & medical eligibility
- ✅ Donor reliability history
- ✅ Location proximity
- ✅ Emergency prioritization

---

## Step 1: Database Preparation (15 minutes)

### 1.1 Update Supabase Schema

Open your **Supabase SQL Editor** and run these migrations:

#### Add fields to `donor` table:
```sql
ALTER TABLE donor ADD COLUMN IF NOT EXISTS last_donation_date DATE;
ALTER TABLE donor ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
ALTER TABLE donor ADD COLUMN IF NOT EXISTS completed_appointments INTEGER DEFAULT 0;
ALTER TABLE donor ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE donor ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

#### Add fields to `patients` table:
```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
```

#### Add fields to `appointments` table:
```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS donor_match_score NUMERIC;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);
```

### 1.2 Verify Migration
Run this to check if columns were added:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='donor' 
ORDER BY column_name;
```

Should include: `city`, `completed_appointments`, `is_active`, `last_donation_date`, `total_appointments`

---

## Step 2: Create Donor Matcher Service (30 minutes)

### 2.1 Create the service file

Create: `backend-api/ai-services/donorMatcher.js`

```javascript
/**
 * Intelligent Donor Matching Service
 * Matches patients with best available donors using multi-factor scoring
 */

import supabase from '../utils/supabaseClient.js';

// Blood type compatibility matrix
// O- is universal donor, AB+ is universal recipient
const BLOOD_COMPATIBILITY = {
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'A+': ['A+', 'AB+'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'AB+'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'AB+': ['AB+'],
  'AB-': ['AB+', 'AB-'],
};

/**
 * Score a donor based on multiple factors
 * Returns -1 if incompatible/ineligible, otherwise 0-100
 */
function scoreDonor(donor, patient, appointmentDate) {
  let score = 100; // Base score

  // 1. Blood Type Compatibility (Critical - 30 points)
  const compatibleTypes = BLOOD_COMPATIBILITY[patient.blood_group] || [];
  if (!compatibleTypes.includes(donor.blood_group)) {
    return -1; // Incompatible - reject immediately
  }

  if (donor.blood_group === patient.blood_group) {
    score += 30; // Exact match bonus
  } else {
    score += 15; // Compatible but not exact
  }

  // 2. Donation Eligibility (20 points)
  // Medical guideline: 56 days minimum between donations
  if (donor.last_donation_date) {
    const daysSinceDonation = Math.floor(
      (new Date(appointmentDate) - new Date(donor.last_donation_date)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceDonation < 56) {
      return -1; // Not eligible yet
    }
    
    if (daysSinceDonation >= 90) {
      score += 20; // Ideal timing
    } else if (daysSinceDonation >= 56) {
      score += 10; // Just became eligible
    }
  } else {
    score += 15; // No history = eligible
  }

  // 3. Location Proximity (15 points)
  if (donor.city && patient.city && donor.city === patient.city) {
    score += 15; // Same city bonus
  } else if (donor.city && patient.city) {
    score += 3; // Different city
  }

  // 4. Reliability History (15 points)
  if (donor.total_appointments && donor.total_appointments > 0) {
    const reliability = donor.completed_appointments / donor.total_appointments;
    const reliabilityPoints = Math.min(15, reliability * 20);
    score += reliabilityPoints;
  }

  // 5. Active Status (5 points)
  if (donor.is_active) {
    score += 5;
  }

  // Clamp score to 0-100 range
  return Math.min(100, Math.max(0, score));
}

/**
 * Find best donors for a patient
 * Returns top 3 candidates for regular cases, top 1 for emergency
 */
export async function findBestDonors(patientId, appointmentDate, isEmergency = false) {
  try {
    // Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, blood_group, city, age')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Fetch all active donors
    const { data: allDonors, error: donorError } = await supabase
      .from('donor')
      .select('id, name, blood_group, city, last_donation_date, total_appointments, completed_appointments, is_active')
      .eq('is_active', true);

    if (donorError) {
      throw new Error(`Error fetching donors: ${donorError.message}`);
    }

    if (!allDonors || allDonors.length === 0) {
      return {
        success: false,
        message: 'No active donors found in system',
        candidates: []
      };
    }

    // Get donors already assigned for this date
    const { data: busyAppointments } = await supabase
      .from('appointments')
      .select('donor_id')
      .eq('date', appointmentDate)
      .eq('status', 'Assigned');

    const busyDonorIds = new Set(busyAppointments?.map(a => a.donor_id) || []);
    
    // Filter to available donors
    const availableDonors = allDonors.filter(d => !busyDonorIds.has(d.id));

    if (availableDonors.length === 0) {
      return {
        success: false,
        message: 'No donors available for this date',
        candidates: []
      };
    }

    // Score all available donors
    const scoredDonors = availableDonors
      .map(donor => ({
        ...donor,
        matchScore: scoreDonor(donor, patient, appointmentDate)
      }))
      .filter(d => d.matchScore > 0) // Remove ineligible
      .sort((a, b) => b.matchScore - a.matchScore); // Highest first

    if (scoredDonors.length === 0) {
      return {
        success: false,
        message: 'No compatible donors available',
        candidates: []
      };
    }

    // Return top 1 for emergency, top 3 for regular
    const topCount = isEmergency ? 1 : 3;
    const topDonors = scoredDonors.slice(0, topCount);

    return {
      success: true,
      message: `Found ${topDonors.length} compatible donor(s)`,
      patient: {
        id: patient.id,
        name: patient.name,
        blood_group: patient.blood_group,
        age: patient.age
      },
      candidates: topDonors.map((d, idx) => ({
        rank: idx + 1,
        donor_id: d.id,
        donor_name: d.name,
        blood_group: d.blood_group,
        city: d.city,
        reliability_percentage: d.total_appointments ? 
          Math.round((d.completed_appointments / d.total_appointments) * 100) : 0,
        matchScore: d.matchScore,
        location_match: patient.city === d.city ? 'Same city ✓' : 'Different city',
        days_since_donation: d.last_donation_date ? 
          Math.floor((new Date(appointmentDate) - new Date(d.last_donation_date)) / (1000 * 60 * 60 * 24)) : 'No history'
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
 * Assign a donor to an appointment
 */
export async function assignDonor(appointmentId, donorId) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        donor_id: donorId, 
        status: 'Assigned',
        created_via: 'intelligent_matching'
      })
      .eq('id', appointmentId)
      .select();

    if (error) throw error;

    return {
      success: true,
      message: 'Donor assigned successfully',
      appointment: data[0]
    };

  } catch (error) {
    console.error('Error assigning donor:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get matching statistics
 */
export async function getMatchingStats() {
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('status');

    const completed = appointments?.filter(a => a.status === 'Completed').length || 0;
    const total = appointments?.length || 0;

    return {
      total_appointments: total,
      completed_appointments: completed,
      success_rate: total > 0 ? Math.round((completed / total) * 100) : 0
    };

  } catch (error) {
    console.error('Error getting matching stats:', error);
    return null;
  }
}
```

---

## Step 3: Create the Intelligent Booking API Endpoint (25 minutes)

### 3.1 Update the appointments API

Edit or create: `backend-api/api/appointments/intelligent.js`

```javascript
/**
 * POST /api/appointments/intelligent
 * 
 * Intelligently create an appointment and auto-match with best donor
 * 
 * Request body:
 * {
 *   patientId: string (required),
 *   date: string (required, YYYY-MM-DD),
 *   isEmergency: boolean (optional, default: false),
 *   autoAssign: boolean (optional, default: true)
 * }
 */

import { findBestDonors, assignDonor } from '../ai-services/donorMatcher.js';
import supabase from '../utils/supabaseClient.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patientId, date, isEmergency = false, autoAssign = true } = req.body;

    // Validation
    if (!patientId || !date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['patientId', 'date']
      });
    }

    console.log(`[Intelligent Booking] Patient: ${patientId}, Date: ${date}, Emergency: ${isEmergency}`);

    // Step 1: Create appointment record in 'Pending' status
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert([{
        patient_id: patientId,
        date: date,
        status: 'Pending',
        created_via: 'intelligent_booking'
      }])
      .select();

    if (createError) {
      throw createError;
    }

    const appointmentId = appointment[0].id;
    console.log(`[Intelligent Booking] Appointment created: ${appointmentId}`);

    // Step 2: Find best donor matches
    const matchResult = await findBestDonors(patientId, date, isEmergency);

    if (!matchResult.success || matchResult.candidates.length === 0) {
      // No donor found - return with suggestions
      console.log(`[Intelligent Booking] No available donors for ${appointmentId}`);
      
      return res.status(202).json({
        status: 'partial',
        message: 'Appointment created but no compatible donors available',
        appointment: {
          id: appointmentId,
          status: 'Pending',
          patient_id: patientId,
          date: date
        },
        reason: matchResult.message,
        next_step: 'Admin will manually assign a donor'
      });
    }

    // Step 3: Auto-assign best donor (if enabled)
    if (autoAssign) {
      const bestDonor = matchResult.candidates[0];
      console.log(`[Intelligent Booking] Auto-assigning donor: ${bestDonor.donor_id}`);

      const assignResult = await assignDonor(appointmentId, bestDonor.donor_id);

      if (!assignResult.success) {
        throw new Error(assignResult.message);
      }

      // Step 4: Log the match for analytics
      await supabase
        .from('appointments')
        .update({ donor_match_score: bestDonor.matchScore })
        .eq('id', appointmentId);

      console.log(`[Intelligent Booking] Appointment complete: ${appointmentId} → ${bestDonor.donor_name}`);

      // Success response
      return res.status(201).json({
        status: 'success',
        message: 'Appointment created and donor auto-assigned',
        appointment: {
          id: appointmentId,
          status: 'Assigned',
          patient_id: patientId,
          donor_id: bestDonor.donor_id,
          date: date
        },
        assigned_donor: {
          id: bestDonor.donor_id,
          name: bestDonor.donor_name,
          blood_group: bestDonor.blood_group,
          location: bestDonor.city,
          reliability: bestDonor.reliability_percentage,
          match_score: bestDonor.matchScore,
          available_donors: matchResult.candidates.length
        },
        alternatives: matchResult.candidates.slice(1) // Show other options for admin review
      });
    } else {
      // Return suggestions without auto-assigning
      return res.status(201).json({
        status: 'success_with_options',
        message: 'Appointment created - admin can choose donor',
        appointment: {
          id: appointmentId,
          status: 'Pending',
          patient_id: patientId,
          date: date
        },
        suggested_donors: matchResult.candidates,
        patient: matchResult.patient
      });
    }

  } catch (error) {
    console.error('[Intelligent Booking] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
```

---

## Step 4: Integrate with Patient Mobile App (20 minutes)

### 4.1 Update Book Appointment Screen

Edit: `mobile-app/app/book-appointment.tsx`

```typescript
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BookAppointmentScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEmergency, setIsEmergency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get current patient ID (from auth/state management)
  const patientId = 'PATIENT_ID_FROM_AUTH'; // TODO: Replace with actual auth

  /**
   * Book appointment using intelligent matching
   */
  const handleBookAppointment = async () => {
    setLoading(true);
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await fetch(
        'https://your-backend-api.com/api/appointments/intelligent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            date: formattedDate,
            isEmergency,
            autoAssign: true // Enable AI auto-assignment
          })
        }
      );

      const data = await response.json();

      if (data.status === 'success') {
        // Donor was automatically matched and assigned!
        Alert.alert(
          '✅ Success!',
          `Appointment confirmed!\n\nDonor: ${data.assigned_donor.name}\nReliability: ${data.assigned_donor.reliability}%\nMatch Score: ${data.assigned_donor.match_score}/100`,
          [
            {
              text: 'View Details',
              onPress: () => router.push('/patient-home')
            }
          ]
        );
      } else if (data.status === 'partial') {
        // No donors available yet
        Alert.alert(
          '⏳ Appointment Created',
          'Your appointment has been created.\nAdmin will assign a donor shortly.',
          [{ text: 'OK', onPress: () => router.push('/patient-home') }]
        );
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to book appointment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        📅 Book Appointment
      </Text>

      {/* Date Selection */}
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={{
          backgroundColor: '#f0f0f0',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '500' }}>
          Selected Date: {selectedDate.toDateString()}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Emergency Flag */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10
          }}
          onPress={() => setIsEmergency(!isEmergency)}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: isEmergency ? '#E76F51' : '#e0e0e0',
              marginRight: 10,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {isEmergency && <Text style={{ color: '#fff' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 16 }}>🚨 This is an emergency case</Text>
        </TouchableOpacity>
      </View>

      {/* Book Button */}
      <TouchableOpacity
        disabled={loading}
        onPress={handleBookAppointment}
        style={{
          backgroundColor: loading ? '#ccc' : '#FF6B6B',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            🤖 AI-Match & Book
          </Text>
        )}
      </TouchableOpacity>

      {/* Info */}
      <Text style={{ marginTop: 20, fontSize: 12, color: '#666', textAlign: 'center' }}>
        🤖 Our AI will automatically find the best available donor for you!
      </Text>
    </View>
  );
}
```

---

## Step 5: Testing the Feature (30 minutes)

### 5.1 Prepare Test Data

In Supabase SQL Editor:

```sql
-- Add test patient
INSERT INTO patients (name, blood_group, city, age) 
VALUES ('Test Patient', 'O+', 'Mumbai', 12) 
RETURNING id;
-- Copy the returned ID

-- Add test donors
INSERT INTO donor (name, blood_group, city, is_active, last_donation_date, total_appointments, completed_appointments) 
VALUES 
  ('Donor One', 'O+', 'Mumbai', true, NOW() - INTERVAL '90 days', 10, 9),
  ('Donor Two', 'O+', 'Mumbai', true, NOW() - INTERVAL '75 days', 8, 7),
  ('Donor Three', 'A+', 'Mumbai', true, NOW() - INTERVAL '100 days', 5, 5);
```

### 5.2 Test via cURL

```bash
# Test the intelligent booking endpoint
curl -X POST http://localhost:3000/api/appointments/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "YOUR_PATIENT_ID_HERE",
    "date": "2026-03-15",
    "isEmergency": false,
    "autoAssign": true
  }'
```

### 5.3 Expected Response (Success)

```json
{
  "status": "success",
  "message": "Appointment created and donor auto-assigned",
  "appointment": {
    "id": "appt-uuid",
    "status": "Assigned",
    "patient_id": "patient-uuid",
    "donor_id": "donor-uuid",
    "date": "2026-03-15"
  },
  "assigned_donor": {
    "id": "donor-uuid",
    "name": "Donor One",
    "blood_group": "O+",
    "location": "Mumbai",
    "reliability": 90,
    "match_score": 95,
    "available_donors": 3
  },
  "alternatives": [
    {
      "rank": 2,
      "donor_id": "...",
      "donor_name": "Donor Two",
      "matchScore": 85
    }
  ]
}
```

### 5.4 Test Different Scenarios

**Scenario 1: Normal booking (Regular patient)**
```bash
curl -X POST http://localhost:3000/api/appointments/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "date": "2026-03-20",
    "isEmergency": false,
    "autoAssign": true
  }'
```

**Scenario 2: Emergency case (Get only 1 donor, fastest match)**
```bash
curl -X POST http://localhost:3000/api/appointments/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "date": "2026-03-16",
    "isEmergency": true,
    "autoAssign": true
  }'
```

**Scenario 3: Manual donor selection (Get suggestions, admin chooses)**
```bash
curl -X POST http://localhost:3000/api/appointments/intelligent \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "date": "2026-03-17",
    "isEmergency": false,
    "autoAssign": false
  }'
```

---

## Step 6: Verify Integration (10 minutes)

### 6.1 Check Supabase Records

Open Supabase Dashboard → appointments table, verify:
- ✅ New appointment created
- ✅ `donor_id` is populated
- ✅ `status` is 'Assigned'
- ✅ `donor_match_score` shows (e.g., 95)
- ✅ `created_via` shows 'intelligent_matching'

### 6.2 Check Logs

In backend terminal:
```
[Intelligent Booking] Patient: xxx, Date: 2026-03-15, Emergency: false
[Intelligent Booking] Appointment created: yyy
[Intelligent Booking] Auto-assigning donor: zzz
[Intelligent Booking] Appointment complete: yyy → Donor One
```

---

## Step 7: Add Admin Dashboard Display (Optional, 20 minutes)

### 7.1 Create a simple admin view to see matched appointments

Edit: `aweb-dashboard/src/components/IntelligentBookingStats.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MatchedAppt {
  id: string;
  patient_name: string;
  donor_name: string;
  date: string;
  match_score: number;
  status: string;
}

export default function IntelligentBookingStats() {
  const [appointments, setAppointments] = useState<MatchedAppt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntelligentMatches();
  }, []);

  const fetchIntelligentMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          donor_match_score,
          status,
          created_via,
          patients!inner(name),
          donor!inner(name)
        `)
        .eq('created_via', 'intelligent_matching')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = data?.map((appt: any) => ({
        id: appt.id,
        patient_name: appt.patients?.name || 'Unknown',
        donor_name: appt.donor?.name || 'Unassigned',
        date: appt.date,
        match_score: appt.donor_match_score || 0,
        status: appt.status
      })) || [];

      setAppointments(formatted);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">🤖 AI-Matched Appointments</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Patient</th>
              <th className="text-left py-2">Donor</th>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Match Score</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(appt => (
              <tr key={appt.id} className="border-b hover:bg-gray-50">
                <td className="py-3">{appt.patient_name}</td>
                <td className="py-3">{appt.donor_name}</td>
                <td className="py-3">{new Date(appt.date).toLocaleDateString()}</td>
                <td className="py-3">
                  <span className={`px-3 py-1 rounded font-bold ${
                    appt.match_score >= 85 ? 'bg-green-100 text-green-800' :
                    appt.match_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {appt.match_score}%
                  </span>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-white text-xs ${
                    appt.status === 'Assigned' ? 'bg-blue-500' :
                    appt.status === 'Completed' ? 'bg-green-500' :
                    'bg-gray-500'
                  }`}>
                    {appt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {appointments.length === 0 && (
        <p className="text-center text-gray-500 py-8">No AI-matched appointments yet</p>
      )}
    </div>
  );
}
```

### 7.2 Add to Dashboard

Edit: `aweb-dashboard/src/app/dashboard/page.tsx`

```tsx
import IntelligentBookingStats from '@/components/IntelligentBookingStats';

export default function Dashboard() {
  return (
    <div>
      <Header/>
      <IntelligentBookingStats />  {/* Add this line */}
      {/* ... other components ... */}
    </div>
  );
}
```

---

## 📊 Scoring Algorithm Breakdown

For each patient booking, the system evaluates donors on:

| Factor | Points | Criteria |
|--------|--------|----------|
| **Blood Type Match** | 30 | Exact match: +30, Compatible: +15, Incompatible: REJECT |
| **Donation Eligibility** | 20 | 90+ days since last: +20, 56-90 days: +10, <56 days: REJECT |
| **Location** | 15 | Same city: +15, Different: +3 |
| **Reliability** | 15 | (completed / total appointments) × 15 |
| **Active Status** | 5 | Is active: +5, Inactive: 0 |
| **TOTAL** | **100** | Capped at 100 |

**Examples:**
- Donor with O+ blood, same city, 95% completed, 90 days since donation: **100/100** ⭐
- Donor with A+ blood (compatible), different city, 80% completed, 70 days: **80/100** ✅
- Donor with incompatible blood type: **REJECTED** ❌

---

## 🔍 Debugging Checklist

- [ ] Database schema migrations completed
- [ ] Test data inserted (patients & donors)
- [ ] Backend server running without errors
- [ ] API endpoint accessible at `/api/appointments/intelligent`
- [ ] Response format matches expected JSON
- [ ] Supabase table shows new appointments with `donor_id` populated
- [ ] Match scores are realistic (70-100 range)
- [ ] Mobile app receives and displays results correctly
- [ ] Dashboard component renders appointment statistics

---

## 🎉 Success Indicators

✅ You've successfully implemented the feature when:
1. Patient can book appointment from mobile app
2. API automatically finds compatible donors
3. Best donor is auto-assigned within 1-2 seconds
4. Supabase shows appointment with donor_id & match_score
5. Admin dashboard displays matched appointments with scores
6. Emergency cases get faster matches (fewer candidates to evaluate)

---

## 📞 Troubleshooting

**Problem**: No donors found in response
**Solution**: 
- Check that donors exist in database with `is_active = true`
- Verify blood type is set correctly
- Ensure donation date is valid (not all too recent)

**Problem**: API returns 500 error
**Solution**:
- Check backend logs for specific error
- Verify Supabase credentials in `.env`
- Run database migrations again

**Problem**: Match scores are low (e.g., 30/100)
**Solution**:
- Increase `transfusion_frequency_days` in patient records
- Ensure donors have completion history (total_appointments > 0)
- Add city data to patient and donor records

---

Now you're ready to implement! Start with **Step 1** and work through sequentially. Each step builds on the previous.

