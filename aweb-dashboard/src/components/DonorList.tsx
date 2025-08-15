interface Donor {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
}

interface DonorListProps {
  donors: Donor[];
}

export default function DonorList({ donors }: DonorListProps) {
  return (
    <div className="space-y-4">
      {donors.length > 0 ? (
        donors.map(donor => (
          <div key={donor.id} className="p-4 bg-gray-50 rounded-xl shadow-sm border border-gray-100 transition hover:shadow-md">
            <h3 className="font-semibold text-lg text-gray-800">{donor.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Blood Group:</span> {donor.blood_group}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phone:</span> {donor.phone}
            </p>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 py-8">No donors scheduled for today.</p>
      )}
    </div>
  );
}
