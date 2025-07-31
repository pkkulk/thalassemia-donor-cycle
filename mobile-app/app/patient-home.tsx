import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase'; // adjust path if needed

export default function PatientHomeScreen() {
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchPatientData = async () => {
    const { data: userData } = await supabase.auth.getUser();

    const userId = userData?.user?.id;
    console.log("Logged in user ID:", userId);

    if (!userId) {
      console.log("No user ID found");
      setLoading(false);
      return;
    }

    const { data: patientData, error: fetchError } = await supabase
      .from('patients')
      .select('name')
      .eq('user_id', userId);

    if (fetchError) {
      console.log("Patient fetch error:", fetchError.message);
    } else {
      console.log("Full patient object:", patientData);
      console.log("Patient found:", patientData?.[0]?.name);
      setPatientName(patientData?.[0]?.name || '');
    }

    setLoading(false); // ✅ fix here
  };

  fetchPatientData();
}, []);




  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D86C6C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View>
            <Text style={styles.hello}>Hello, {patientName || 'User'}!</Text>
            <Text style={styles.date}>Feb 01, 2025</Text>
            <Text style={styles.time}>Shift: 9:00 am to 5:00 pm</Text>
          </View>
          <View style={styles.profileStatus}>
            <Text style={styles.statusText}>Active</Text>
            <Image
              source={require('../assets/logo.png')}
              style={styles.profileImage}
            />
          </View>
        </View>

        {/* Assigned Doctors */}
        <Text style={styles.sectionTitle}>Your Doctors</Text>
        <View style={styles.cardList}>
          {[1, 2].map((_, index) => (
            <View key={index} style={styles.assignCard}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName}>Dr. Shalini Kapoor</Text>
                <Text style={styles.doctorTask}>Hematology Specialist</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </View>
          ))}
        </View>

        {/* Book Appointment Button */}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => router.push('book-appointment')}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>

        {/* History Section */}
        <Text style={styles.sectionTitle}>Appointment History</Text>
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Jan 24, 2025</Text>
          <Text style={styles.historyText}>• Thalassemia Checkup – Dr. Mehra</Text>
          <Text style={styles.historyText}>• Next due: Feb 24, 2025</Text>
        </View>

        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Dec 10, 2024</Text>
          <Text style={styles.historyText}>• Blood Report Review – Dr. Neha</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Ionicons name="home" size={24} color="#D86C6C" />
        <Ionicons name="calendar" size={24} color="#888" />
        <Ionicons name="person" size={24} color="#888" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAD4D4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  hello: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  profileStatus: {
    alignItems: 'center',
  },
  statusText: {
    backgroundColor: '#FF9494',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryCard: {
    backgroundColor: '#FFE0E0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#E86A6A',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  cardList: {
    gap: 12,
    marginBottom: 20,
  },
  assignCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  doctorTask: {
    fontSize: 12,
    color: '#777',
  },
  scheduleTable: {
    backgroundColor: '#FFE0E0',
    borderRadius: 12,
    padding: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#FFD2D2',
  },
  scheduleTime: {
    color: '#333',
    fontWeight: '600',
  },
  scheduleTask: {
    color: '#555',
  },
  scheduleDoctor: {
    color: '#999',
    fontSize: 12,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    height: 60,
    width: '100%',
    backgroundColor: '#FFF',
    borderTopColor: '#eee',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
    bookButton: {
    backgroundColor: '#D86C6C',
    padding: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#FFEAEA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  historyTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#D86C6C',
  },
  historyText: {
    fontSize: 14,
    color: '#444',
  },

});
