interface Patient {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
}

interface PatientListProps {
  patients: Patient[];
}

export default function PatientList({ patients }: PatientListProps) {
  return (
    <div className="space-y-4">
      {patients.length > 0 ? (
        patients.map(patient => (
          <div key={patient.id} className="p-4 bg-gray-50 rounded-xl shadow-sm border border-gray-100 transition hover:shadow-md">
            <h3 className="font-semibold text-lg text-gray-800">{patient.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Blood Group:</span> {patient.blood_group}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phone:</span> {patient.phone}
            </p>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 py-8">No patients scheduled for today.</p>
      )}
    </div>
  );
}
