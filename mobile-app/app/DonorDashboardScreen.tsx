import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  StatusBar,
  TouchableOpacity,
  Alert
} from 'react-native';
import { supabase } from '../lib/supabase'; 

// --- Interface Definitions ---
interface DonationAppointment {
  id: string;
  donor_arrival: string; 
  date: string; 
  status: string; // 'Scheduled', 'Accepted', 'Declined'
}

interface DonorProfile {
  id: string;
  name: string;
  blood_group: string;
  last_donated: string | null; 
}

const DONOR_TABLE_NAME = 'donor'; 

// --- Helper Function ---
const formatDate = (dateString: string | null, includeYear: boolean = true) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: includeYear ? 'numeric' : undefined, 
    month: 'short', 
    day: 'numeric' 
  });
};

export default function DonorDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [appointments, setAppointments] = useState<DonationAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- Handle donor Accept/Decline (Updates Supabase) ---
  const handleDonorResponse = async (appointmentId: string, newStatus: 'Accepted' | 'Declined') => {
    try {
      // Optimistic UI update
      setAppointments(prev =>
        prev.map(appt =>
          appt.id === appointmentId ? { ...appt, status: newStatus } : appt
        )
      );

      // Update only 'status' in Supabase
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating appointment:', error);
        // Revert if failed
        setAppointments(prev =>
          prev.map(appt =>
            appt.id === appointmentId ? { ...appt, status: 'Scheduled' } : appt 
          )
        );
        Alert.alert('Update failed', 'Could not update appointment. Please try again.');
        return;
      }

      Alert.alert('Success', `You have ${newStatus.toLowerCase()} this donation.`);
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // --- Fetch donor profile and appointments ---
  const fetchDonorData = async () => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Authentication Error: Please log in to view your schedule.");
      setLoading(false);
      return;
    }

    // 1️⃣ Fetch Donor Profile
    const { data: donorData, error: donorError } = await supabase
      .from(DONOR_TABLE_NAME)
      .select('id, name, blood_group, last_donated') 
      .eq('user_id', user.id)
      .single();

    if (donorError || !donorData) {
      setError("Database Error: Could not find linked donor profile.");
      setLoading(false);
      return;
    }

    setDonorProfile(donorData);
    
    // 2️⃣ Fetch Appointments for this donor
    // Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

const { data: appointmentsData, error: apptError } = await supabase
  .from('appointments')
  .select('id, patient_id, date, donor_arrival, status')
  .eq('donor_id', donorData.id)
  .gte('donor_arrival', today) // ✅ compare only date part, works for DATE or TIMESTAMP
  .order('donor_arrival', { ascending: true });

    if (apptError) {
      console.error('Error fetching appointments:', apptError);
      setError("Error fetching scheduled donations.");
    }

    setAppointments(appointmentsData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDonorData();
  }, []);

  // --- Loading/Error States ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76F51" />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </View>
    );
  }

  const lastDonationDateDisplay = formatDate(donorProfile?.last_donated || null);
  const donorName = donorProfile?.name || "Donor";

  // --- Main UI ---
  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#E76F51" />
      <ScrollView style={styles.container}>
        
        {/* --- Profile Header --- */}
        <View style={styles.profileCard}>
          <Text style={styles.welcomeText}>Welcome Back,</Text>
          <Text style={styles.nameText}>{donorName.split(' ')[0]}</Text>
          
          <View style={styles.profileDetailsRow}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Blood Group</Text>
              <Text style={styles.detailValue}>{donorProfile?.blood_group || 'N/A'}</Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Last Donation</Text>
              <Text style={styles.detailValue}>{lastDonationDateDisplay}</Text>
            </View>
          </View>
        </View>

        {/* --- Upcoming Donations --- */}
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionHeader}>Upcoming Donation Schedule</Text>

          {appointments.length === 0 ? (
            <View style={styles.noAppointments}>
              <Text style={styles.noAppointmentsText}>
                You have no assigned donation appointments. Thank you for your support!
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {appointments.map((appt) => (
                <View key={appt.id} style={styles.appointmentItem}>
                  
                  {/* --- Left Side: Date --- */}
                  <View style={styles.arrivalBox}>
                    <Text style={styles.arrivalLabel}>ASSIGNED DATE</Text>
                    <Text style={styles.arrivalTime}>
                      {new Date(appt.donor_arrival).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                      })}
                    </Text>
                    <Text style={styles.arrivalDay}>
                      {new Date(appt.donor_arrival).toLocaleDateString('en-US', { weekday: 'long' })}
                    </Text>
                  </View>
                  
                  {/* --- Right Side: Status + Actions --- */}
                  <View style={styles.statusView}>
                    <Text style={styles.statusLabel}>Patient Appointment:</Text>
                    <Text style={styles.patientDateText}>{formatDate(appt.date)}</Text>
                    <View style={[
                      styles.statusBadge, 
                      appt.status === 'Accepted' ? styles.statusScheduled : 
                      appt.status === 'Declined' ? styles.statusDeclined : styles.statusDefault
                    ]}>
                      <Text style={styles.statusText}>{appt.status.toUpperCase()}</Text>
                    </View>

                    {/* --- Buttons --- */}
                    <View style={styles.responseButtons}>
                      {appt.status === 'Scheduled' && (
                        <>
                          <Text style={styles.confirmText}>Will you be able to donate?</Text>
                          <View style={styles.buttonRow}>
                            <TouchableOpacity 
                              style={[styles.responseBtn, styles.acceptBtn]}
                              onPress={() => handleDonorResponse(appt.id, 'Accepted')}
                            >
                              <Text style={styles.buttonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.responseBtn, styles.rejectBtn]}
                              onPress={() => handleDonorResponse(appt.id, 'Declined')}
                            >
                              <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}

                      {appt.status === 'Accepted' && (
                        <Text style={styles.acceptedLabel}>✅ You have accepted this appointment</Text>
                      )}

                      {appt.status === 'Declined' && (
                        <Text style={styles.rejectedLabel}>❌ You cancelled this appointment</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1, backgroundColor: '#FFF5F5' },
  container: { flex: 1, padding: 20 },
  profileCard: {
    backgroundColor: '#E76F51', 
    padding: 25,
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  welcomeText: { fontSize: 16, color: '#FFDAB9', fontWeight: '500' },
  nameText: { fontSize: 32, color: '#FFFFFF', fontWeight: '800', marginBottom: 20 },
  profileDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailBox: { alignItems: 'center', width: '45%' },
  detailLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  scheduleSection: { padding: 5 },
  sectionHeader: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 15 },
  listContainer: { marginTop: 5 },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  arrivalBox: {
    backgroundColor: '#FFF5F5', 
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCEEEE',
    alignItems: 'center',
    marginRight: 15,
    width: 90,
  },
  arrivalLabel: { fontSize: 10, fontWeight: '600', color: '#E76F51', marginBottom: 2 },
  arrivalTime: { fontSize: 22, fontWeight: '900', color: '#333' },
  arrivalDay: { fontSize: 12, color: '#555' },
  statusView: { flex: 1, paddingLeft: 10 },
  statusLabel: { fontSize: 12, color: '#777' },
  patientDateText: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  statusScheduled: { backgroundColor: '#34D399' },
  statusDeclined: { backgroundColor: '#EF4444' },
  statusDefault: { backgroundColor: '#9CA3AF' },
  noAppointments: { padding: 20, backgroundColor: '#FEF3C7', borderRadius: 10 },
  noAppointmentsText: { fontSize: 16, color: '#92400E', textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#E76F51' },
  errorText: { marginTop: 10, fontSize: 16, color: '#EF4444', textAlign: 'center', paddingHorizontal: 20 },
  responseButtons: { marginTop: 10 },
  confirmText: { fontSize: 14, color: '#444', marginBottom: 8 },
  buttonRow: { flexDirection: 'row' },
  responseBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: 'bold', color: '#fff', fontSize: 14 },
  acceptBtn: { backgroundColor: '#34D399', marginRight: 10 },
  rejectBtn: { backgroundColor: '#EF4444' },
  acceptedLabel: { color: '#34D399', fontWeight: 'bold', marginTop: 8 },
  rejectedLabel: { color: '#EF4444', fontWeight: 'bold', marginTop: 8 },
});
