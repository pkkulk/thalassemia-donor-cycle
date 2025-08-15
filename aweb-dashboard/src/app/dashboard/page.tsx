import {supabase} from '@/lib/supabase'; // ✅ already configured instance
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

export default async function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(); 
  // Fetch all appointments for the calendar
  const { data: allAppointments, error: allAppointmentsError } = await supabase
    .from('appointments')
    .select('date');
    
  // Fetch appointments for today
  const { data: todayAppointments, error: todayAppointmentsError } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', today);

  if (allAppointmentsError || todayAppointmentsError) {
    console.error('Error fetching data:', allAppointmentsError || todayAppointmentsError);
    return <div>Error loading dashboard. Please try again.</div>;
  }else{
    console.log(allAppointments);
  }

  const appointmentDates = allAppointments?.map(appt => appt.date) || [];
  const todayPatientIds = todayAppointments?.filter(appt => appt.patient_id).map(appt => appt.patient_id) || [];
  const todayDonorIds = todayAppointments?.filter(appt => appt.donor_id).map(appt => appt.donor_id) || [];

  const [
    { data: todayPatientsData, error: todayPatientsError },
    { data: todayDonorsData, error: todayDonorsError }
  ] = await Promise.all([
    supabase.from('patients').select('id, name, blood_group, phone').in('id', todayPatientIds),
    supabase.from('donor').select('id, name, blood_group, phone').in('id', todayDonorIds)
  ]);

  if (todayPatientsError || todayDonorsError) {
    console.error('Error fetching details:', todayPatientsError || todayDonorsError);
    return <div>Error loading details.</div>;
  }

  const todayPatients = todayPatientsData as Patient[];
  const todayDonors = todayDonorsData as Donor[];

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-8 bg-gray-100 font-sans">
      <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-8">Blood Bank Dashboard</h1>
      
      {/* Calendar */}
      <div className="mb-8 p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
        <CalendarWithAppointments appointmentDates={appointmentDates} 
        initialDate={todayDate.toISOString()}
        />
      </div>

      {/* Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">{"Today's Patients"}</h2>
          <PatientList patients={todayPatients} />
        </div>

        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">{"Today's Donors"}</h2>
          <DonorList donors={todayDonors} />
        </div>
      </div>
    </div>
  );
}