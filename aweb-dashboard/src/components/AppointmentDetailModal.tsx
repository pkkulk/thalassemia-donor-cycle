'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AppointmentDetail {
  id: string; // appointment id
  type: 'patient';
  name: string;
  blood_group: string;
  phone: string;
  patient_id: string;
  donor_id?: string;
  donor_arrival?: string;
}

interface Donor {
  id: string;
  name: string;
  available: boolean;
}

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
}

export default function AppointmentDetailModal({ isOpen, onClose, date }: AppointmentDetailModalProps) {
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<{ [key: string]: string }>({});

  // Fetch appointments and donor info
  const fetchAppointments = async () => {
    if (!date) return;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        date,
        donor_id,
        donor_arrival,
        patients!fk_appointments_patient(name,blood_group,phone)
      `)
      .eq('date', date);

    if (error) return console.log('Error fetching appointments:', error);

    // If donor_id exists, fetch donor name
    const donorIds = data.filter((a: any) => a.donor_id).map((a: any) => a.donor_id);
    let donorData: any[] = [];
    if (donorIds.length > 0) {
      const { data: dData, error: dError } = await supabase
        .from('donor')
        .select('id,name')
        .in('id', donorIds);
      if (dError) console.error('Error fetching donors:', dError);
      else donorData = dData || [];
    }

    const mapped = data.map((a: any) => {
      const donor = donorData.find(d => d.id === a.donor_id);
      return {
        id: a.id,
        type: 'patient' as const,
        name: a.patients?.name,
        blood_group: a.patients?.blood_group,
        phone: a.patients?.phone,
        patient_id: a.patient_id,
        donor_id: a.donor_id,
        donor_name: donor?.name,
        donor_arrival: a.donor_arrival,
      };
    });

    setAppointments(mapped);
  };

  // Fetch available donors
  const fetchDonors = async () => {
    const { data, error } = await supabase
      .from('donor')
      .select('id,name,available')
      .eq('available', true);

    if (error) console.log('Error fetching donors:', error);
    else setDonors(data || []);
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchAppointments();
    fetchDonors();
  }, [isOpen, date]);

  // Assign donor
  const assignDonor = async (appt: AppointmentDetail) => {
    const donorId = selectedDonor[appt.id];
    if (!donorId) return;

    const donor = donors.find(d => d.id === donorId);
    if (!donor) return;

    const donorArrival = new Date(date!);
    donorArrival.setDate(donorArrival.getDate() - 4);

    // Update appointment with donor_id and donor_arrival
    const { error: apptError } = await supabase
      .from('appointments')
      .update({
        donor_id: donorId,
        donor_arrival: donorArrival.toISOString(),
      })
      .eq('id', appt.id);

    if (apptError) return console.error('Error updating appointment:', apptError);

    // Update donor availability
    const nextAvailable = new Date(donorArrival);
    nextAvailable.setMonth(nextAvailable.getMonth() + 1);

    const { error: donorError } = await supabase
      .from('donor')
      .update({ available: false, next_available_date: nextAvailable.toISOString() })
      .eq('id', donorId);

    if (donorError) return console.error('Error updating donor:', donorError);

    // Refresh UI
    await fetchAppointments();
    await fetchDonors();
    setSelectedDonor(prev => ({ ...prev, [appt.id]: '' }));
  };

  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800">
            Appointments for {new Date(date).toLocaleDateString()}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-3xl font-light leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className="mt-4 text-gray-500 italic">No appointments found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {appointments.map(appt => (
              <div key={appt.id} className="p-4 rounded-lg border-l-4 bg-red-50 border-red-500">
                <p className="font-extrabold text-lg text-red-700 mb-1">Patient</p>
                <div className="text-sm text-gray-700">
                  <p><strong>Name:</strong> {appt.name}</p>
                  <p><strong>Blood Group:</strong> <span className="font-mono">{appt.blood_group}</span></p>
                  <p><strong>Phone:</strong> {appt.phone}</p>

                  {appt.donor_id ? (
                    <>
                      <p><strong>Assigned Donor:</strong> {appt.donor_name}</p>
                      <p><strong>Donor Arrival:</strong> {new Date(appt.donor_arrival!).toLocaleDateString()}</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <select
                        className="border p-1 rounded"
                        value={selectedDonor[appt.id] || ''}
                        onChange={e => setSelectedDonor(prev => ({ ...prev, [appt.id]: e.target.value }))}
                      >
                        <option value="" disabled>Select Donor</option>
                        {donors.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                        onClick={() => assignDonor(appt)}
                        disabled={!selectedDonor[appt.id]}
                      >
                        Assign Donor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
