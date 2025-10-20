import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  StatusBar 
} from 'react-native';
import { supabase } from '../lib/supabase'; 

// ... (Interfaces and setup remain the same) ...
interface DonationAppointment {
  id: string;
  donor_arrival: string; 
  date: string; 
  status: string; 
}

interface DonorProfile {
  id: string;
  name: string;
  blood_group: string;
  last_donated: string | null; 
}

const DONOR_TABLE_NAME = 'donor'; 

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

  const fetchDonorData = async () => {
    // ... (omitting fetch logic - it remains the same) ...
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in to view your schedule.");
      setLoading(false);
      return;
    }

    // 1. Fetch Donor Profile
    const { data: donorData, error: donorError } = await supabase
      .from(DONOR_TABLE_NAME)
      .select('id, name, blood_group, last_donated') 
      .eq('user_id', user.id)
      .single();

    if (donorError || !donorData) {
      setError("Could not find linked donor profile.");
      setLoading(false);
      return;
    }

    setDonorProfile(donorData);
    
    // 2. Fetch Assigned Appointments (using donor_id and filtering for upcoming dates)
    const { data: appointmentsData, error: apptError } = await supabase
      .from('appointments')
      .select('id, patient_id, date, donor_arrival, status') // donor_arrival is fetched here
      .eq('donor_id', donorData.id)
      .gte('donor_arrival', new Date().toISOString())
      .order('donor_arrival', { ascending: true });

    if (apptError) {
      setError("Error fetching scheduled donations.");
    }

    setAppointments(appointmentsData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDonorData();
  }, []);

  // --- Rendering Logic ---

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76F51" />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
      </View>
    );
  }

  const lastDonationDateDisplay = formatDate(donorProfile?.last_donated || null);
  const donorName = donorProfile?.name || "Donor";


  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#E76F51" />
      <ScrollView style={styles.container}>
        
        {/* --- Profile Header Card --- */}
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

        {/* --- Scheduled Donations Section --- */}
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionHeader}>Upcoming Donation Schedule</Text>

          {appointments.length === 0 ? (
            <View style={styles.noAppointments}>
              <Text style={styles.noAppointmentsText}>
                You do not have any assigned donation appointments. Thank you for your continued support!
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {appointments.map((appt) => (
                <View 
                  key={appt.id} 
                  style={styles.appointmentItem}
                >
                  <View style={styles.arrivalBox}>
                    {/* 🛑 FIX: Changed label to be more explicit */}
                    <Text style={styles.arrivalLabel}>ASSIGNED DATE</Text> 
                    <Text style={styles.arrivalTime}>
                      {/* ✅ This displays the donor_arrival date */}
                      {new Date(appt.donor_arrival).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                      })}
                    </Text>
                    <Text style={styles.arrivalDay}>
                        {new Date(appt.donor_arrival).toLocaleDateString('en-US', { weekday: 'long' })}
                    </Text>
                  </View>
                  
                  <View style={styles.statusView}>
                      <Text style={styles.statusLabel}>Patient Appointment:</Text>
                      <Text style={styles.patientDateText}>
                          {formatDate(appt.date)}
                      </Text>
                      <View style={[styles.statusBadge, appt.status === 'Scheduled' ? styles.statusScheduled : styles.statusDefault]}>
                        <Text style={styles.statusText}>{appt.status.toUpperCase()}</Text>
                      </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        {/* --- End Scheduled Donations Section --- */}
      </ScrollView>
    </View>
  );
}

// ... (Stylesheets remain the same, ensuring arrivalLabel style is used) ...

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#FFF5F5',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    
    // --- Profile Card Styles ---
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
    welcomeText: {
        fontSize: 16,
        color: '#FFDAB9', 
        fontWeight: '500',
    },
    nameText: {
        fontSize: 32,
        color: '#FFFFFF',
        fontWeight: '800',
        marginBottom: 20,
    },
    profileDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
    },
    detailBox: {
        alignItems: 'center',
        width: '45%',
    },
    detailLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },

    // --- Schedule Section Styles ---
    scheduleSection: {
        padding: 5,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
    },
    listContainer: {
        marginTop: 5,
    },
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
    arrivalLabel: { // Style used for the ASSIGNED DATE label
        fontSize: 10,
        fontWeight: '600',
        color: '#E76F51',
        marginBottom: 2,
    },
    arrivalTime: {
        fontSize: 22,
        fontWeight: '900',
        color: '#333',
    },
    arrivalDay: {
        fontSize: 12,
        color: '#555',
    },
    statusView: {
        flex: 1,
        paddingLeft: 10,
    },
    statusLabel: {
        fontSize: 12,
        color: '#777',
    },
    patientDateText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusScheduled: {
        backgroundColor: '#34D399', 
    },
    statusDefault: {
        backgroundColor: '#9CA3AF', 
    },
    noAppointments: {
        padding: 20,
        backgroundColor: '#FEF3C7', 
        borderRadius: 10,
    },
    noAppointmentsText: {
        fontSize: 16,
        color: '#92400E',
        textAlign: 'center',
    },

    // --- Loading/Error Styles ---
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#E76F51',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FEE2E2', 
        borderRadius: 0,
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#B91C1C',
    },
    errorDetail: {
        marginTop: 5,
        fontSize: 14,
        color: '#B91C1C',
    },
});