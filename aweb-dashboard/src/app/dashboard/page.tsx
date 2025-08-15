'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CalendarWithAppointments from '@/components/CalendarWithAppointments';
import PatientList from '@/components/PatientList';
import DonorList from '@/components/DonorList';

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

export default function Dashboard() {
  const [appointmentDates, setAppointmentDates] = useState<string[]>([]);
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [todayDonors, setTodayDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all appointments for calendar
      const { data: allAppointments, error: allAppointmentsError } = await supabase
        .from('appointments')
        .select('date');

      // Fetch today's appointments
      const { data: todayAppointments, error: todayAppointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('date', today);

      if (allAppointmentsError || todayAppointmentsError) {
        console.error('Error fetching appointments:', allAppointmentsError || todayAppointmentsError);
        setLoading(false);
        return;
      }

      const dates = allAppointments?.map(appt => appt.date) || [];
      setAppointmentDates(dates);

      const todayPatientIds = todayAppointments?.filter(appt => appt.patient_id).map(appt => appt.patient_id) || [];
      const todayDonorIds = todayAppointments?.filter(appt => appt.donor_id).map(appt => appt.donor_id) || [];

      // Fetch patients and donors in parallel
      const [{ data: patientsData }, { data: donorsData }] = await Promise.all([
        supabase.from('patients').select('id, name, blood_group, phone').in('id', todayPatientIds),
        supabase.from('donor').select('id, name, blood_group, phone').in('id', todayDonorIds)
      ]);

      setTodayPatients(patientsData || []);
      setTodayDonors(donorsData || []);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading dashboard...</div>;
  }

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
        />
      </div>

      {/* Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
            Today's Patients
          </h2>
          <PatientList patients={todayPatients} />
        </div>

        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
            Today's Donors
          </h2>
          <DonorList donors={todayDonors} />
        </div>
      </div>
    </div>
  );
}
