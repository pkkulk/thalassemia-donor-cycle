'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CalendarWithAppointments from '@/components/CalendarWithAppointments';
import PatientList from '@/components/PatientList';
import DonorList from '@/components/DonorList';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';

// --- Interfaces ---
interface Patient {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
}

interface Donor {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
}

interface AppointmentDetail {
  patient_id: string;
  type: 'patient' | 'donor';
  name: string;
  blood_group: string;
  phone: string;
  assigned_donor?: string;
  donor_arrival?: string;
}

// ------------------

export default function Dashboard() {
  const [appointmentDates, setAppointmentDates] = useState<string[]>([]);
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [todayDonors, setTodayDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAppointments, setModalAppointments] = useState<AppointmentDetail[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null); // Auto "login"

  // --- Auto "login" first patient ---
  // --- Fetch initial data ---

    useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: allAppointments, error: allAppointmentsError } = await supabase
        .from('appointments')
        .select('date');

      const { data: todayAppointments, error: todayAppointmentsError } = await supabase
        .from('appointments')
        .select('patient_id, donor_id')
        .eq('date', today);

      if (allAppointmentsError || todayAppointmentsError) {
        console.error('Error fetching appointments:', allAppointmentsError || todayAppointmentsError);
        setLoading(false);
        return;
      }

      setAppointmentDates(allAppointments?.map(appt => appt.date) || []);

      // Extract patients and donors for today
      const patientIds = todayAppointments?.map(a => a.patient_id) || [];
      const donorIds = todayAppointments?.map(a => a.donor_id).filter(Boolean) || [];

      const { data: patientsData } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);

      const { data: donorsData } = await supabase
        .from('donor')
        .select('*')
        .in('id', donorIds);

      setTodayPatients(patientsData || []);
      setTodayDonors(donorsData || []);
      setLoading(false);
    };

    fetchData();

    // 🧠 Real-time subscription for appointments table
    const channel = supabase
      .channel('realtime-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('Realtime event:', payload.eventType, payload.new || payload.old);
          // Re-fetch the latest data whenever appointments change
          fetchData();
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Fetch appointments for a date ---
  const fetchAppointmentsForDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setIsModalOpen(true);
    setModalAppointments([]);
    setModalLoading(true);

    const { data: appointmentsForDate, error } = await supabase
      .from('appointments')
      .select('id, patient_id, donor_id')
      .eq('date', date);

    if (error) {
      console.error('Error fetching appointments:', error);
      setModalLoading(false);
      return;
    }

    if (!appointmentsForDate || appointmentsForDate.length === 0) {
      setModalAppointments([]);
      setModalLoading(false);
      return;
    }

    // Fetch patient details
    const patientIds = appointmentsForDate.map(a => a.patient_id).filter(Boolean);
    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, name, blood_group, phone')
      .in('id', patientIds);

    // Fetch donor details
    const donorIds = appointmentsForDate.map(a => a.donor_id).filter(Boolean);
    const { data: donorsData } = await supabase
      .from('donor')
      .select('id, name')
      .in('id', donorIds);

    const modalAppts: AppointmentDetail[] = (patientsData || []).map(p => {
      const appt = appointmentsForDate.find(a => a.patient_id === p.id);
      const assignedDonor = donorsData?.find(d => d.id === appt?.donor_id)?.name;
      return {
        patient_id: p.id,
        type: 'patient',
        name: p.name,
        blood_group: p.blood_group,
        phone: p.phone,
        assigned_donor: assignedDonor,
      };
    });

    setModalAppointments(modalAppts);
    setModalLoading(false);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalAppointments([]);
    setSelectedDate(null);
  };

  if (loading) return <div className="p-4 text-center">Loading dashboard...</div>;

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-8 bg-gray-100 font-sans">
      <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-8">
        Blood Bank Dashboard
      </h1>

      {/* Calendar */}
      <div className="mb-8 p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
        <CalendarWithAppointments
          appointmentDates={appointmentDates}
          initialDate={new Date().toISOString()}
          onDateClick={fetchAppointmentsForDate}
        />
      </div>

      {/* Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
            Today&apos;s Patients
          </h2>
          <PatientList patients={todayPatients} />
        </div>

        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
            Today&apos;s Donors
          </h2>
          <DonorList donors={todayDonors} />
        </div>
      </div>

      {/* Modal */}
      <AppointmentDetailModal
        isOpen={isModalOpen}
        onClose={closeModal}
        date={selectedDate}
      />
    </div>
  );
}
