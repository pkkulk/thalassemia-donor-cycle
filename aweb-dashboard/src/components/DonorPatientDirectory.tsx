"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaTint,
  FaPhoneAlt,
  FaCalendarAlt,
  FaHeart,
  FaSearch,
  FaTimes,
} from "react-icons/fa";

interface DonorRecord {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  available: boolean;
  next_available_date: string | null;
  last_donated: string | null;
}

interface PatientRecord {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
}

export default function DonorPatientDirectory() {
  const [tab, setTab] = useState<"donors" | "patients">("donors");
  const [donors, setDonors] = useState<DonorRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all donors
    const { data: donorsData } = await supabase
      .from("donor")
      .select("*")
      .order("name", { ascending: true });

    // Fetch all patients
    const { data: patientsData } = await supabase
      .from("patients")
      .select("*")
      .order("name", { ascending: true });

    setDonors(donorsData || []);
    setPatients(patientsData || []);
    setLoading(false);
  };

  const filteredDonors = donors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.blood_group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery),
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.blood_group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery),
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
            <FaHeart className="text-red-500" /> Directory
          </h1>
          <p className="text-slate-500 font-medium">
            Manage all donors and patients
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 bg-white rounded-full p-1 shadow-sm border border-slate-200 w-fit">
          <button
            onClick={() => setTab("donors")}
            className={`px-8 py-3 rounded-full font-bold text-sm uppercase tracking-tight transition-all ${
              tab === "donors"
                ? "bg-red-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🩸 Donors ({donors.length})
          </button>
          <button
            onClick={() => setTab("patients")}
            className={`px-8 py-3 rounded-full font-bold text-sm uppercase tracking-tight transition-all ${
              tab === "patients"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👥 Patients ({patients.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, blood group, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 font-medium text-slate-700 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest">
              Loading directory...
            </div>
          </div>
        ) : (
          <>
            {tab === "donors" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDonors.length === 0 ? (
                  <div className="col-span-full py-16 text-center">
                    <FaHeart
                      className="mx-auto mb-4 text-slate-200"
                      size={48}
                    />
                    <p className="text-slate-400 font-medium">
                      No donors found
                    </p>
                  </div>
                ) : (
                  filteredDonors.map((donor) => (
                    <div
                      key={donor.id}
                      className={`p-6 rounded-3xl border-2 transition-all group hover:shadow-xl ${
                        donor.available
                          ? "bg-gradient-to-br from-red-50 to-red-25 border-red-200 hover:border-red-400"
                          : "bg-gradient-to-br from-slate-50 to-slate-25 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {/* Header with Status */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-red-700 transition-colors">
                            {donor.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-tight ${
                                donor.available
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {donor.available
                                ? "✓ Available"
                                : "⏳ Unavailable"}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${
                            donor.blood_group === "O+"
                              ? "bg-red-100"
                              : donor.blood_group === "A+"
                                ? "bg-orange-100"
                                : donor.blood_group === "B+"
                                  ? "bg-yellow-100"
                                  : donor.blood_group === "AB+"
                                    ? "bg-pink-100"
                                    : "bg-slate-100"
                          }`}
                        >
                          {donor.blood_group}
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-3 mb-4 p-3 bg-white/50 rounded-xl">
                        <FaPhoneAlt className="text-slate-300" size={14} />
                        <a
                          href={`tel:${donor.phone}`}
                          className="text-slate-700 font-bold hover:text-red-600 transition-colors"
                        >
                          {donor.phone}
                        </a>
                      </div>

                      {/* Stats */}
                      <div className="space-y-3">
                        {donor.last_donated && (
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                            <FaCalendarAlt
                              className="text-slate-400"
                              size={14}
                            />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                Last Donation
                              </p>
                              <p className="text-sm font-black text-slate-800">
                                {formatDate(donor.last_donated)}
                              </p>
                            </div>
                          </div>
                        )}
                        {donor.next_available_date && !donor.available && (
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                            <FaCalendarAlt
                              className="text-slate-400"
                              size={14}
                            />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                Next Available
                              </p>
                              <p className="text-sm font-black text-slate-800">
                                {formatDate(donor.next_available_date)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "patients" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPatients.length === 0 ? (
                  <div className="col-span-full py-16 text-center">
                    <FaTint className="mx-auto mb-4 text-slate-200" size={48} />
                    <p className="text-slate-400 font-medium">
                      No patients found
                    </p>
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-6 rounded-3xl border-2 bg-gradient-to-br from-blue-50 to-blue-25 border-blue-200 hover:border-blue-400 transition-all group hover:shadow-xl"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                            {patient.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-tight bg-blue-100 text-blue-700">
                              Active
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${
                            patient.blood_group === "O+"
                              ? "bg-red-100"
                              : patient.blood_group === "A+"
                                ? "bg-orange-100"
                                : patient.blood_group === "B+"
                                  ? "bg-yellow-100"
                                  : patient.blood_group === "AB+"
                                    ? "bg-pink-100"
                                    : "bg-slate-100"
                          }`}
                        >
                          {patient.blood_group}
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                        <FaPhoneAlt className="text-slate-300" size={14} />
                        <a
                          href={`tel:${patient.phone}`}
                          className="text-slate-700 font-bold hover:text-blue-600 transition-colors"
                        >
                          {patient.phone}
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
