"use client";
import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FaPhoneAlt, FaCheckCircle, FaHourglassHalf, FaUserPlus, FaSearch, FaTimes, FaCalendarCheck, FaHandHoldingMedical, FaUsers } from 'react-icons/fa';

// --- Enhanced Mock Data with Status & Phone ---
// Today's date is set to July 27, 2025 for this demo
const initialAppointments = [
  { id: 1, date: new Date(2025, 6, 27), patient: 'Riya Kulkarni', donor: 'Sahil Deshmukh', bloodType: 'O+', time: '10:00 AM', status: 'Pending', donorPhone: '9876543210' },
  { id: 2, date: new Date(2025, 6, 27), patient: 'Aarav Mehta', donor: 'Isha Singh', bloodType: 'B+', time: '12:30 PM', status: 'Pending', donorPhone: '9123456789' },
  { id: 3, date: new Date(2025, 6, 30), patient: 'Aman Sharma', donor: 'Neha Gupta', bloodType: 'A-', time: '02:30 PM', status: 'Pending', donorPhone: '9988776655' },
  { id: 4, date: new Date(2025, 7, 5), patient: 'Priya Mehta', donor: 'Rohan Joshi', bloodType: 'B+', time: '11:00 AM', status: 'Pending', donorPhone: '9658741230' },
];

const initialBloodInventory = {
  'A+': 35, 'A-': 15, 'B+': 28, 'B-': 8,
  'O+': 45, 'O-': 22, 'AB+': 12, 'AB-': 5,
};


// --- Main Dashboard Component ---
export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState(initialAppointments);
  const [bloodInventory, setBloodInventory] = useState(initialBloodInventory);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Date and Filtering Logic ---
  const today = new Date(2025, 6, 27); // Manually setting for demo. Use `new Date()` for real-world app.
  
  const todaysAppointments = appointments.filter(
    (a) => a.date.toDateString() === today.toDateString()
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter(
        (a) =>
            a.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.donor.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.date - b.date);
  }, [searchTerm, appointments]);

  // --- Statistics Calculations ---
  const currentMonth = today.getMonth();
  const monthlyDonors = appointments.filter(a => a.date.getMonth() === currentMonth).length;
  const unitsCollected = monthlyDonors;
  const upcomingAppointmentsCount = appointments.filter(a => a.date >= today).length;

  // --- Handlers ---
  const handleAddAppointment = (e) => {
    e.preventDefault();
    const { patient, donor, donorPhone, bloodType, date } = e.target.elements;
    const newAppointment = {
      id: appointments.length + 1,
      date: new Date(date.value + 'T00:00:00'),
      patient: patient.value,
      donor: donor.value,
      donorPhone: donorPhone.value,
      bloodType: bloodType.value,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Pending', // New appointments are always 'Pending'
    };
    setAppointments([...appointments, newAppointment]);
    setBloodInventory(prev => ({ ...prev, [bloodType.value]: (prev[bloodType.value] || 0) + 1 }));
    setShowModal(false);
  };

  const handleUpdateStatus = (id, newStatus) => {
      setAppointments(appointments.map(apt => 
        apt.id === id ? { ...apt, status: newStatus } : apt
      ));
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        {/* --- Header --- */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-700">🩸 RaktSetu Dashboard</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 transition-colors"
          >
            <FaUserPlus /> Add Appointment
          </button>
        </header>

        {/* --- Quick Statistics Cards --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<FaUsers />} title="Total Donors (This Month)" value={monthlyDonors} color="blue" />
            <StatCard icon={<FaHandHoldingMedical />} title="Units Collected (This Month)" value={unitsCollected} color="green" />
            <StatCard icon={<FaCalendarCheck />} title="Upcoming Appointments" value={upcomingAppointmentsCount} color="purple" />
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- Left Column --- */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            {/* --- Calendar --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">📅 Appointment Calendar</h2>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileContent={({ date }) => {
                  const hasAppointment = appointments.some(
                    (a) => a.date.toDateString() === date.toDateString()
                  );
                  return hasAppointment ? (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></div>
                  ) : null;
                }}
                className="w-full border-0"
              />
            </div>

            {/* --- 2. Today's Schedule with Status and Actions --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Today's Schedule ({today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })})
                </h2>
                {todaysAppointments.length > 0 ? (
                    <ul className="space-y-4">
                        {todaysAppointments.map(apt => (
                           <li key={apt.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-red-500">
                               <div className="flex justify-between items-start">
                                   <div>
                                       <p className="font-bold text-gray-800">{apt.donor}</p>
                                       <p className="text-sm text-gray-500">to {apt.patient} ({apt.bloodType})</p>
                                   </div>
                                   <StatusBadge status={apt.status} />
                               </div>
                               <div className="flex items-center justify-end gap-3 mt-3">
                                   <a href={`tel:${apt.donorPhone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold">
                                        <FaPhoneAlt /> Call Donor
                                   </a>
                                   {apt.status === 'Pending' && (
                                      <button onClick={() => handleUpdateStatus(apt.id, 'Completed')} className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 font-semibold">
                                          <FaCheckCircle /> Mark Completed
                                      </button>
                                   )}
                               </div>
                           </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No appointments scheduled for today.</p>
                )}
            </div>
          </div>

          {/* --- Right Column --- */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* --- Blood Inventory --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🩸 Blood Inventory</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(bloodInventory).map(([type, amount]) => (
                        <BloodStock key={type} type={type} amount={amount} />
                    ))}
                </div>
            </div>

            {/* --- Searchable Full Appointment List --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">All Appointments</h2>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                </div>
                <div className="h-64 overflow-y-auto">
                    <ul className="space-y-2 pr-2">
                        {filteredAppointments.map(a => (
                            <li key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold">{a.donor} <span className="font-normal text-gray-500">to</span> {a.patient}</p>
                                    <p className="text-sm text-gray-600">{a.date.toLocaleDateString()}</p>
                                </div>
                                <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded">{a.bloodType}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        </main>
      </div>

      {/* --- Add Appointment Modal --- */}
      {showModal && <AddAppointmentModal onClose={() => setShowModal(false)} onSubmit={handleAddAppointment} />}
    </div>
  );
}

// --- Helper Components ---

const StatusBadge = ({ status }) => {
    if (status === 'Completed') {
        return <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full"><FaCheckCircle /> {status}</span>;
    }
    return <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full"><FaHourglassHalf /> {status}</span>;
}

const StatCard = ({ icon, title, value, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
    }
    return (
        <div className={`bg-gradient-to-br ${colors[color]} text-white p-6 rounded-xl shadow-lg flex items-center justify-between`}>
            <div>
                <p className="text-sm font-medium uppercase opacity-80">{title}</p>
                <p className="text-4xl font-bold">{value}</p>
            </div>
            <div className="text-5xl opacity-30">{icon}</div>
        </div>
    );
};

const BloodStock = ({ type, amount }) => {
    const percentage = Math.min((amount / 50) * 100, 100); // Max 50 units
    let barColor = 'bg-green-500';
    if (percentage < 50) barColor = 'bg-yellow-500';
    if (percentage < 25) barColor = 'bg-red-500';

    return (
        <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="font-bold text-lg text-red-700">{type}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-1">
                <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
            <p className="text-sm text-gray-600">{amount} units</p>
        </div>
    )
}

const AddAppointmentModal = ({ onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Add New Appointment</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FaTimes size={24}/></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="donor" className="block text-sm font-medium text-gray-700">Donor Name</label>
                    <input type="text" name="donor" id="donor" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500" />
                </div>
                <div>
                    <label htmlFor="donorPhone" className="block text-sm font-medium text-gray-700">Donor Phone</label>
                    <input type="tel" name="donorPhone" id="donorPhone" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500" />
                </div>
            </div>
             <div>
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700">Patient Name</label>
                <input type="text" name="patient" id="patient" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500" />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700">Blood Type</label>
                    <select name="bloodType" id="bloodType" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500">
                        {Object.keys(initialBloodInventory).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" name="date" id="date" required defaultValue={new Date().toISOString().substring(0, 10)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500" />
                </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Add Appointment</button>
            </div>
        </form>
      </div>
    </div>
  );
};