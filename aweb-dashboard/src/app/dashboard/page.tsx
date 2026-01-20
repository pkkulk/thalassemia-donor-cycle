'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import CalendarWithAppointments from '@/components/CalendarWithAppointments';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';
import { 
  FaClock, FaTint, FaUserInjured, FaHandsHelping, 
  FaPhoneAlt, FaCheckCircle, FaCalendarAlt, FaExclamationCircle 
} from 'react-icons/fa';

// --- Interfaces ---
interface Patient { id: string; name: string; blood_group: string; phone: string; status?: string; }
interface Donor { id: string; name: string; blood_group: string; phone: string; status?: string; }
interface UpcomingAppt { id: string; date: string; patient_name: string; blood_group: string; }
interface DateStatusMap { [date: string]: 'Completed' | 'Pending' }

export default function Dashboard() {
  const [appointmentDates, setAppointmentDates] = useState<string[]>([]);
  const [dateStatusMap, setDateStatusMap] = useState<DateStatusMap>({});
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [todayDonors, setTodayDonors] = useState<Donor[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<UpcomingAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const fetchData = useCallback(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Fetch all appointments
    const { data: allAppointments, error } = await supabase.from('appointments').select('*');
    if (error) console.error("Fetch Error:", error);

    const { data: todayDonorAppointments } = await supabase.from('appointments').select('donor_id, status').eq('donor_arrival', todayStr);
    const { data: todayPatientAppointments } = await supabase.from('appointments').select('patient_id, status').eq('date', todayStr);

    setAppointmentDates(allAppointments?.map((a) => a.date) || []);

    // FIXED LOGIC: Correctly determine if a date is Completed (Green) or Pending (Red)
    const statusMap: DateStatusMap = {};
    const groupedByDate: { [date: string]: string[] } = {};
    
    allAppointments?.forEach(appt => {
      if (!groupedByDate[appt.date]) groupedByDate[appt.date] = [];
      groupedByDate[appt.date].push(appt.status);
    });

    Object.keys(groupedByDate).forEach(date => {
      const statuses = groupedByDate[date];
      // A date is ONLY 'Completed' if EVERY appointment on that day is finished
      const allFinished = statuses.every(s => s === 'Completed' || s === 'Donated');
      statusMap[date] = allFinished ? 'Completed' : 'Pending';
    });
    setDateStatusMap(statusMap);

    // Fetch Today's Details
    const patientIds = todayPatientAppointments?.map((a) => a.patient_id) || [];
    const { data: patientsData } = await supabase.from('patients').select('*').in('id', patientIds);

    const donorIds = todayDonorAppointments?.map((a) => a.donor_id).filter(Boolean) || [];
    const { data: donorsData } = await supabase.from('donor').select('*').in('id', donorIds);

    setTodayPatients((patientsData || []).map((p) => ({
      ...p,
      status: (todayPatientAppointments || []).find((a) => a?.patient_id === p.id)?.status || 'Pending',
    })));

    setTodayDonors((donorsData || []).map((d) => ({
      ...d,
      status: (todayDonorAppointments || []).find((a) => a?.donor_id === d.id)?.status || 'Pending',
    })));

    // Fetch Upcoming Pipeline
    const future = allAppointments?.filter(a => a.date > todayStr).sort((a, b) => a.date.localeCompare(b.date)) || [];
    const futurePatientIds = future.map(a => a.patient_id);
    const { data: futurePatients } = await supabase.from('patients').select('id, name, blood_group').in('id', futurePatientIds);

    setUpcomingAppts(future.map(appt => ({
      id: appt.id,
      date: appt.date,
      patient_name: futurePatients?.find(p => p.id === appt.patient_id)?.name || 'Unknown Patient',
      blood_group: futurePatients?.find(p => p.id === appt.patient_id)?.blood_group || 'N/A',
    })));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-appointments').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleDonation = async (donorId: string) => {
    await supabase.from('appointments').update({ status: 'Donated' }).eq('donor_id', donorId);
    fetchData();
  };

  const handleCompletion = async (patientId: string) => {
    await supabase.from('appointments').update({ status: 'Completed' }).eq('patient_id', patientId);
    fetchData();
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Syncing Operational Hub...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        
        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Recipients Today" count={todayPatients.length} icon={<FaUserInjured className="text-blue-500" />} color="bg-blue-50" />
          <StatCard title="Active Donors" count={todayDonors.length} icon={<FaHandsHelping className="text-red-500" />} color="bg-red-50" />
          <StatCard title="Upcoming Pipeline" count={upcomingAppts.length} icon={<FaCalendarAlt className="text-emerald-500" />} color="bg-emerald-50" />
        </div>

        {/* Master Schedule Calendar */}
        <div className="mb-8 p-8 bg-white rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
              <FaCalendarAlt className="text-red-500" /> Operational Master Schedule
            </h3>
            
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Task Completed
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Action Needed
              </div>
            </div>
          </div>

          <div className="w-full">
            <CalendarWithAppointments
              appointmentDates={appointmentDates}
              dateStatusMap={dateStatusMap} 
              initialDate={new Date().toISOString()}
              onDateClick={(date) => { setSelectedDate(date); setIsModalOpen(true); }}
              tileClassName={({ date, view }: any) => {
                if (view === 'month') {
                  if (isPastDate(date)) return '!bg-emerald-50/40 !text-emerald-700 !rounded-xl';
                  if (isToday(date)) return '!bg-blue-600 !text-white !rounded-xl shadow-lg shadow-blue-200 !font-bold';
                  return '!rounded-xl hover:!bg-slate-50 transition-colors';
                }
                return null;
              }}
            />
          </div>
        </div>

        {/* Action Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center justify-between">Recipients Today</h2>
            <div className="space-y-4">
              {todayPatients.length === 0 ? <EmptyState text="No patients registered today." /> : 
                todayPatients.map(p => <PersonActionCard key={p.id} name={p.name} group={p.blood_group} phone={p.phone} status={p.status || ''} onAction={p.status === 'Donated' ? () => handleCompletion(p.id) : undefined} btnLabel="Mark Completed" colorTheme="blue" />)
              }
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center justify-between">Arriving Donors</h2>
            <div className="space-y-4">
              {todayDonors.length === 0 ? <EmptyState text="No donors arriving today." /> : 
                todayDonors.map(d => <PersonActionCard key={d.id} name={d.name} group={d.blood_group} phone={d.phone} status={d.status || ''} onAction={d.status === 'Accepted' ? () => handleDonation(d.id) : undefined} btnLabel="Mark Donated" colorTheme="red" />)
              }
            </div>
          </div>
        </div>

        {/* Upcoming Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-extrabold text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-tighter"><FaClock className="text-emerald-500" /> Upcoming Operations Pipeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingAppts.map(appt => (
              <div key={appt.id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between group hover:border-red-200 transition-all cursor-default">
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">{appt.patient_name}</p>
                  <span className="text-[10px] font-black bg-white border border-slate-200 px-2 py-1 rounded-lg text-red-600 shadow-sm">{appt.blood_group}</span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2"><FaClock className="text-slate-400" /> {new Date(appt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AppointmentDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} date={selectedDate} />
    </div>
  );
}

function StatCard({ title, count, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-900 leading-none">{count}</p>
      </div>
      <div className={`p-4 ${color} rounded-2xl`}>{icon}</div>
    </div>
  );
}

function PersonActionCard({ name, group, phone, status, btnLabel, colorTheme, onAction }: any) {
  const isDone = status === 'Completed' || status === 'Donated';
  const theme = colorTheme === 'red' ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100';
  return (
    <div className={`p-4 rounded-2xl border transition-all ${isDone ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white shadow-sm border-slate-100'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 leading-tight">{name}</h4>
          <div className="flex gap-2 mt-2">
            <span className={`text-[9px] font-black px-2 py-0.5 border rounded-md ${theme}`}>{group}</span>
            <a href={`tel:${phone}`} className="text-[10px] font-bold text-slate-400 flex items-center gap-1 hover:text-slate-700"><FaPhoneAlt size={8} /> {phone}</a>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{status}</div>
      </div>
      {onAction && !isDone && (
        <button onClick={onAction} className="w-full mt-4 py-2.5 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 uppercase tracking-tighter"><FaCheckCircle /> {btnLabel}</button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl italic text-slate-400 text-sm">
      <FaExclamationCircle className="mb-2 text-slate-100" size={32} /> {text}
    </div>
  );
}