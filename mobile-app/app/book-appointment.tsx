import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Platform, Modal, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import {supabase} from '../lib/supabase';
interface PatientProfile {
  id: string;
  name: string;
  email: string;
  blood_group: string;
  phone: string;
  user_id: string;
}
interface ModalState {
  isVisible: boolean;
  message: string;
  isError: boolean;
}

export default function App() {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalState>({ isVisible: false, message: '', isError: false });

  // 1. Fetch patient details on component mount using auth.uid()
  useEffect(() => {
    async function fetchPatient() {
      try {
        setLoading(true);
        // Get the current user session from Supabase Auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session) {
          // Fetch the patient's profile using the user's ID
          const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          if (error) throw error;
          setPatient(data);
        } else {
          // Handle case where user is not logged in
          setModal({
            isVisible: true,
            message: "You must be logged in to book an appointment.",
            isError: true,
          });
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setModal({
          isVisible: true,
          message: "Failed to load patient data. Please try again later.",
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, []);

  // Handle date changes from the date picker
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  // 5. On submit, insert into 'appointments' table
  const handleBookAppointment = async () => {
    if (!patient) {
      setModal({ isVisible: true, message: "Patient data not loaded.", isError: true });
      return;
    }
    
    // Simple validation: check if the selected date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
    if (selectedDate < today) {
      setModal({ isVisible: true, message: "Appointment date cannot be in the past.", isError: true });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: patient.id,
          date: selectedDate.toISOString().split('T')[0], // format date as 'YYYY-MM-DD'
          status: 'pending',
          donor_id: null,
        })
        .select();

      if (error) throw error;

      // 6. On success, show a message and reset state
      setModal({
        isVisible: true,
        message: `Appointment booked successfully for ${selectedDate.toDateString()}!`,
        isError: false,
      });
      // In a real app, you would navigate back to the appointments list here.
      // E.g., navigation.goBack();
      setSelectedDate(new Date());
    } catch (error) {
      console.error("Error booking appointment:", error);
      setModal({
        isVisible: true,
        message: "Failed to book appointment. Please try again.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a148c" />
        <Text style={styles.loadingText}>Fetching patient data...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Could not load patient profile. Please make sure you are logged in.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.title}>Book Appointment</Text>
          <Text style={styles.subtitle}>Welcome, {patient.name}. Schedule your next visit.</Text>
        </View>

        {/* 2. Display read-only patient details */}
        <View style={styles.readOnlyGroup}>
          <Text style={styles.readOnlyLabel}>Patient Name</Text>
          <Text style={styles.readOnlyValue}>{patient.name}</Text>
        </View>
        <View style={styles.readOnlyGroup}>
          <Text style={styles.readOnlyLabel}>Blood Group</Text>
          <Text style={styles.readOnlyValue}>{patient.blood_group}</Text>
        </View>
        <View style={styles.readOnlyGroup}>
          <Text style={styles.readOnlyLabel}>Phone</Text>
          <Text style={styles.readOnlyValue}>{patient.phone}</Text>
        </View>
        
        {/* 3. Date Picker for appointment date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Appointment Date</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateDisplay}>
            <Text style={styles.dateDisplayText}>
              {selectedDate.toDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()} // Prevent selecting past dates
            />
          )}
        </View>
        
        {/* Book Appointment Button */}
        <TouchableOpacity 
          style={[styles.button, isSubmitting && styles.buttonDisabled]} 
          onPress={handleBookAppointment} 
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Booking...' : 'Book Appointment'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modal.isVisible}
        onRequestClose={() => setModal({ ...modal, isVisible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, modal.isError && styles.modalErrorContent]}>
            <Text style={styles.modalText}>{modal.message}</Text>
            <TouchableOpacity 
              style={[styles.modalButton, modal.isError && styles.modalErrorButton]} 
              onPress={() => setModal({ ...modal, isVisible: false })}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    padding: 20,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#606060',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a237e',
  },
  subtitle: {
    fontSize: 16,
    color: '#606060',
    marginTop: 5,
  },
  readOnlyGroup: {
    marginBottom: 15,
  },
  readOnlyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  readOnlyValue: {
    backgroundColor: '#e8eaf6',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1a237e',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateDisplay: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top', // For Android
  },
  button: {
    backgroundColor: '#4a148c',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#9c27b0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalErrorContent: {
    backgroundColor: '#ffebee',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#4a148c',
    borderRadius: 10,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  modalErrorButton: {
    backgroundColor: '#d32f2f',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
