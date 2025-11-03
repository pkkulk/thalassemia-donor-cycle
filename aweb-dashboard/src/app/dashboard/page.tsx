'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CalendarWithAppointments from '@/components/CalendarWithAppointments';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';

// --- Interfaces ---
interface Patient {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  status?: string;
}

interface Donor {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  status?: string;
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

  // --- Fetch all data for dashboard ---
  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: allAppointments } = await supabase.from('appointments').select('date');

      const { data: todayDonorAppointments } = await supabase
        .from('appointments')
        .select('donor_id, status')
        .eq('donor_arrival', today);

      const { data: todayPatientAppointments } = await supabase
        .from('appointments')
        .select('patient_id, status')
        .eq('date', today);

      setAppointmentDates(allAppointments?.map((a) => a.date) || []);

      // Patients
      const patientIds = todayPatientAppointments?.map((a) => a.patient_id) || [];
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, name, blood_group, phone')
        .in('id', patientIds);

      // Donors
      const donorIds = todayDonorAppointments?.map((a) => a.donor_id).filter(Boolean) || [];
      const { data: donorsData } = await supabase
        .from('donor')
        .select('id, name, blood_group, phone')
        .in('id', donorIds);

      const patientsWithStatus = (patientsData || []).map((p) => ({
        ...p,
      status: (todayPatientAppointments || []).find((a) => a?.patient_id === p.id)?.status || 'Pending',
      }));

      const donorsWithStatus = (donorsData || []).map((d) => ({
        ...d,
        status: (todayDonorAppointments || []).find((a) => a?.donor_id === d.id)?.status || 'Pending',
      }));

      setTodayPatients(patientsWithStatus);
      setTodayDonors(donorsWithStatus);
      setLoading(false);
    };

    fetchData();

    // Real-time updates
    const channel = supabase
      .channel('realtime-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Update donor status to Donated ---
  const handleDonation = async (donorId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Donated',})
      .eq('donor_id', donorId);

    if (error) console.error('Error marking donation:', error);
    else alert('✅ Donor marked as Donated');
  };

  // --- Update patient status to Completed ---
  const handleCompletion = async (patientId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Completed' })
      .eq('patient_id', patientId);

    if (error) console.error('Error marking completion:', error);
    else alert('✅ Patient marked as Completed');
  };

  // ✅ Keep your original fetchAppointmentsForDate logic
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

    if (!appointmentsForDate?.length) {
      setModalAppointments([]);
      setModalLoading(false);
      return;
    }

    const patientIds = appointmentsForDate.map((a) => a.patient_id).filter(Boolean);
    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, name, blood_group, phone')
      .in('id', patientIds);

    const donorIds = appointmentsForDate.map((a) => a.donor_id).filter(Boolean);
    const { data: donorsData } = await supabase
      .from('donor')
      .select('id, name')
      .in('id', donorIds);

    const modalAppts: AppointmentDetail[] = (patientsData || []).map((p) => {
      const appt = appointmentsForDate.find((a) => a.patient_id === p.id);
      const assignedDonor = donorsData?.find((d) => d.id === appt?.donor_id)?.name;
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
        {/* 🧍 Patients */}
        <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">{`Today's Patients`}</h2>

          {todayPatients.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No patients today.</p>
          ) : (
            todayPatients.map((p) => (
              <div
                key={p.id}
                className="border border-gray-300 bg-gray-50 rounded-xl p-4 mb-4 hover:shadow-md transition-all"
              >
                <p className="font-semibold text-gray-800 text-lg">{p.name}</p>
                <p className="text-gray-700">Blood Group: {p.blood_group}</p>
                <p className="text-gray-700">Phone: {p.phone}</p>
                <p className="text-gray-700">
                  Status: <b className="text-blue-700">{p.status}</b>
                </p>

                {p.status == 'Donated' && (
                  <button
                    onClick={() => handleCompletion(p.id)}
                    className="mt-3 bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700 transition-all"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            ))
          )}
        </div>0
        

        {/* 🩸 Donors */}
        <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">{`Today's Donors`}</h2>
          {todayDonors.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No donors today.</p>
          ) : (
            todayDonors.map((d) => (
              <div
                key={d.id}
                className="border border-gray-300 bg-gray-50 rounded-xl p-4 mb-4 hover:shadow-md transition-all"
              >
                <p className="font-semibold text-gray-800 text-lg">{d.name}</p>
                <p className="text-gray-700">Blood Group: {d.blood_group}</p>
                <p className="text-gray-700">Phone: {d.phone}</p>
                <p className="text-gray-700">
                  Status: <b className="text-blue-700">{d.status}</b>
                </p>

                {d.status === 'Accepted' ? (
                  <button
                    onClick={() => handleDonation(d.id)}
                    className="mt-3 bg-red-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-red-700 transition-all"
                  >
                    Mark as Donated
                  </button>
                ) : d.status === 'Donated' ? (
                  <button
                    disabled
                    className="mt-3 bg-gray-400 text-white px-5 py-2 rounded-lg font-medium cursor-not-allowed"
                  >
                    Already Donated
                  </button>
                ) : (
                  <button
                    disabled
                    className="mt-3 bg-gray-300 text-gray-600 px-5 py-2 rounded-lg font-medium cursor-not-allowed opacity-75"
                  >
                    Waiting for donor acceptance
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AppointmentDetailModal isOpen={isModalOpen} onClose={closeModal} date={selectedDate} />
    </div>
  );
}
