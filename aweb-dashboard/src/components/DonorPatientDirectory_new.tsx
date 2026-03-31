"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppTopNav from "@/components/AppTopNav";
import {
  FaTint,
  FaPhoneAlt,
  FaCalendarAlt,
  FaHeart,
  FaLink,
  FaSearch,
  FaTimes,
  FaChevronRight,
} from "react-icons/fa";

interface DonorRecord {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  available: boolean;
  next_available_date: string | null;
  last_donated: string | null;
  created_at?: string;
  gender?: string | null;
}

interface PatientRecord {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  created_at?: string;
}

interface AppointmentRecord {
  id: string;
  date: string;
  donor_arrival: string;
  status: string;
  patient_id: string;
  donor_id: string;
  patients?: { name: string; blood_group: string };
  donor?: { name: string; blood_group: string };
}

interface AppointmentRecordRaw extends Omit<
  AppointmentRecord,
  "patients" | "donor"
> {
  patients?:
    | { name: string; blood_group: string }
    | { name: string; blood_group: string }[];
  donor?:
    | { name: string; blood_group: string }
    | { name: string; blood_group: string }[];
}

interface PatientDonorLinkRecord {
  id: string;
  patient_id: string;
  donor_id: string;
  status: "approved" | "inactive" | "pending";
  created_at?: string;
  patients?: { name: string; blood_group: string };
  donor?: { name: string; blood_group: string };
}

interface PatientDonorLinkRecordRaw extends Omit<
  PatientDonorLinkRecord,
  "patients" | "donor"
> {
  patients?:
    | { name: string; blood_group: string }
    | { name: string; blood_group: string }[];
  donor?:
    | { name: string; blood_group: string }
    | { name: string; blood_group: string }[];
}

type AboType = "A" | "B" | "AB" | "O";
type RhType = "+" | "-";
const PAGE_SIZE = 12;

export default function DonorPatientDirectory() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<
    "donors" | "patients" | "appointments" | "mappings"
  >("donors");
  const [donors, setDonors] = useState<DonorRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [links, setLinks] = useState<PatientDonorLinkRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPatientForLink, setSelectedPatientForLink] = useState("");
  const [selectedDonorForLink, setSelectedDonorForLink] = useState("");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [donorSearchTerm, setDonorSearchTerm] = useState("");
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkMessageTone, setLinkMessageTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [selectedDonor, setSelectedDonor] = useState<DonorRecord | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [sortPreset, setSortPreset] = useState<
    "criticality" | "lastDonation" | "compatibility" | "newest"
  >("criticality");
  const [activeSavedFilters, setActiveSavedFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [donorTotalCount, setDonorTotalCount] = useState(0);
  const [patientTotalCount, setPatientTotalCount] = useState(0);

  const searchTerm = searchQuery.trim();

  useEffect(() => {
    const qpTab = searchParams.get("tab");
    const qpQ = searchParams.get("q");
    const qpView = searchParams.get("view");
    const qpSort = searchParams.get("sort");
    const qpFilters = searchParams.get("filters");
    const qpPage = searchParams.get("page");

    if (
      qpTab === "donors" ||
      qpTab === "patients" ||
      qpTab === "appointments" ||
      qpTab === "mappings"
    ) {
      setTab(qpTab);
    }
    if (qpQ !== null) {
      setSearchQuery(qpQ);
    }
    if (qpView === "cards" || qpView === "list") {
      setViewMode(qpView);
    }
    if (
      qpSort === "criticality" ||
      qpSort === "lastDonation" ||
      qpSort === "compatibility" ||
      qpSort === "newest"
    ) {
      setSortPreset(qpSort);
    }
    if (qpFilters !== null) {
      setActiveSavedFilters(
        qpFilters
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      );
    }
    if (qpPage) {
      const parsed = Number.parseInt(qpPage, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setCurrentPage(parsed);
      }
    }
    // Intentionally run once for initial hydration from URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (searchQuery) next.set("q", searchQuery);
    if (viewMode !== "cards") next.set("view", viewMode);
    if (sortPreset !== "criticality") next.set("sort", sortPreset);
    if (activeSavedFilters.length > 0) {
      next.set("filters", activeSavedFilters.join(","));
    }
    if (currentPage > 1) next.set("page", String(currentPage));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [
    activeSavedFilters,
    currentPage,
    pathname,
    router,
    searchQuery,
    sortPreset,
    tab,
    viewMode,
  ]);

  useEffect(() => {
    if (tab === "donors" || tab === "patients") {
      setCurrentPage(1);
    }
  }, [activeSavedFilters, searchQuery, sortPreset, tab]);

  useEffect(() => {
    fetchData();
  }, [tab, currentPage, searchTerm]);

  useEffect(() => {
    if (!linkMessage) return;
    if (linkMessageTone === "success") {
      const timer = setTimeout(() => setLinkMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [linkMessage, linkMessageTone]);

  const fetchData = async () => {
    setLoading(true);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let donorsQuery = supabase
      .from("donor")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    let patientsQuery = supabase
      .from("patients")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    if (searchTerm) {
      donorsQuery = donorsQuery.or(
        `name.ilike.%${searchTerm}%,blood_group.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
      );
      patientsQuery = patientsQuery.or(
        `name.ilike.%${searchTerm}%,blood_group.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
      );
    }

    if (tab === "donors") {
      donorsQuery = donorsQuery.range(from, to);
    }

    if (tab === "patients") {
      patientsQuery = patientsQuery.range(from, to);
    }

    const [donorsResult, patientsResult] = await Promise.all([
      donorsQuery,
      patientsQuery,
    ]);

    // Fetch all appointments with relations
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select(
        "id, date, donor_arrival, status, patient_id, donor_id, patients(name, blood_group), donor(name, blood_group)",
      )
      .order("date", { ascending: false });

    const { data: linksData, error: linksError } = await supabase
      .from("patient_donor_links")
      .select(
        "id, patient_id, donor_id, status, created_at, patients(name, blood_group), donor(name, blood_group)",
      )
      .order("created_at", { ascending: false });

    if (linksError) {
      console.error("Error fetching donor-patient links:", linksError);
    }

    setDonors(donorsResult.data || []);
    setPatients(patientsResult.data || []);
    setDonorTotalCount(donorsResult.count || 0);
    setPatientTotalCount(patientsResult.count || 0);
    const normalizedAppointments = (
      (appointmentsData || []) as AppointmentRecordRaw[]
    ).map((appt) => ({
      ...appt,
      patients: Array.isArray(appt.patients) ? appt.patients[0] : appt.patients,
      donor: Array.isArray(appt.donor) ? appt.donor[0] : appt.donor,
    }));
    const normalizedLinks = (
      (linksData || []) as PatientDonorLinkRecordRaw[]
    ).map((link) => ({
      ...link,
      patients: Array.isArray(link.patients) ? link.patients[0] : link.patients,
      donor: Array.isArray(link.donor) ? link.donor[0] : link.donor,
    }));
    setAppointments(normalizedAppointments);
    setLinks(normalizedLinks);
    setLoading(false);
  };

  const toggleSavedFilter = (filterId: string) => {
    setActiveSavedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };

  const goToMappingWithDonor = (donor: DonorRecord) => {
    setTab("mappings");
    setSelectedDonorForLink(donor.id);
    setDonorSearchTerm(`${donor.name} (${donor.blood_group})`);
  };

  const goToMappingWithPatient = (patient: PatientRecord) => {
    setTab("mappings");
    setSelectedPatientForLink(patient.id);
    setPatientSearchTerm(`${patient.name} (${patient.blood_group})`);
  };

  const latestDonorStatusById = useMemo(() => {
    const map: Record<string, string | null> = {};
    donors.forEach((donor) => {
      const latest = appointments
        .filter((a) => a.donor_id === donor.id)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
      map[donor.id] = latest?.status || null;
    });
    return map;
  }, [appointments, donors]);

  const latestPatientStatusById = useMemo(() => {
    const map: Record<string, string | null> = {};
    patients.forEach((patient) => {
      const latest = appointments
        .filter((a) => a.patient_id === patient.id)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
      map[patient.id] = latest?.status || null;
    });
    return map;
  }, [appointments, patients]);

  const canDonorDonateToPatient = (
    donorBloodGroup?: string | null,
    patientBloodGroup?: string | null,
  ) => {
    if (!donorBloodGroup || !patientBloodGroup) return false;
    const donor = donorBloodGroup
      .toUpperCase()
      .trim()
      .match(/^(AB|A|B|O)([+-])$/);
    const patient = patientBloodGroup
      .toUpperCase()
      .trim()
      .match(/^(AB|A|B|O)([+-])$/);
    if (!donor || !patient) return false;
    const donorAbo = donor[1] as "A" | "B" | "AB" | "O";
    const donorRh = donor[2] as "+" | "-";
    const patientAbo = patient[1] as "A" | "B" | "AB" | "O";
    const patientRh = patient[2] as "+" | "-";
    const compatibilityMap: Record<
      "A" | "B" | "AB" | "O",
      Array<"A" | "B" | "AB" | "O">
    > = {
      O: ["O", "A", "B", "AB"],
      A: ["A", "AB"],
      B: ["B", "AB"],
      AB: ["AB"],
    };
    const aboOk = compatibilityMap[donorAbo].includes(patientAbo);
    const rhOk = donorRh === "-" ? true : patientRh === "+";
    return aboOk && rhOk;
  };

  const donorCompatibilityCount: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    donors.forEach((donor) => {
      map[donor.id] = patients.filter((patient) =>
        canDonorDonateToPatient(donor.blood_group, patient.blood_group),
      ).length;
    });
    return map;
  }, [donors, patients]);

  const patientCompatibilityCount: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    patients.forEach((patient) => {
      map[patient.id] = donors.filter((donor) =>
        canDonorDonateToPatient(donor.blood_group, patient.blood_group),
      ).length;
    });
    return map;
  }, [donors, patients]);

  const hasApprovedLinkForDonor = (donorId: string) =>
    links.some((l) => l.donor_id === donorId && l.status === "approved");

  const hasApprovedLinkForPatient = (patientId: string) =>
    links.some((l) => l.patient_id === patientId && l.status === "approved");

  const isAvailableThisWeek = (dateValue?: string | null) => {
    if (!dateValue) return false;
    const now = new Date();
    const target = new Date(dateValue);
    const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  const filteredDonors = donors
    .filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm),
    )
    .filter((d) => {
      if (
        activeSavedFilters.includes("o-positive") &&
        d.blood_group.toUpperCase() !== "O+"
      ) {
        return false;
      }
      if (
        activeSavedFilters.includes("female-donors") &&
        (d.gender || "").toLowerCase() !== "female"
      ) {
        return false;
      }
      if (
        activeSavedFilters.includes("available-this-week") &&
        !d.available &&
        !isAvailableThisWeek(d.next_available_date)
      ) {
        return false;
      }
      if (
        activeSavedFilters.includes("no-active-mapping") &&
        hasApprovedLinkForDonor(d.id)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortPreset === "lastDonation") {
        const aTime = a.last_donated ? new Date(a.last_donated).getTime() : 0;
        const bTime = b.last_donated ? new Date(b.last_donated).getTime() : 0;
        return bTime - aTime;
      }
      if (sortPreset === "compatibility") {
        return donorCompatibilityCount[b.id] - donorCompatibilityCount[a.id];
      }
      if (sortPreset === "newest") {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }
      const aCritical =
        (a.available ? 2 : 0) + (hasApprovedLinkForDonor(a.id) ? 0 : 1);
      const bCritical =
        (b.available ? 2 : 0) + (hasApprovedLinkForDonor(b.id) ? 0 : 1);
      return bCritical - aCritical;
    });

  const filteredPatients = patients
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm),
    )
    .filter((p) => {
      if (
        activeSavedFilters.includes("o-positive") &&
        p.blood_group.toUpperCase() !== "O+"
      ) {
        return false;
      }
      if (
        activeSavedFilters.includes("no-active-mapping") &&
        hasApprovedLinkForPatient(p.id)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortPreset === "compatibility") {
        return (
          patientCompatibilityCount[b.id] - patientCompatibilityCount[a.id]
        );
      }
      if (sortPreset === "newest") {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }
      if (sortPreset === "lastDonation") {
        return 0;
      }
      const aCritical = hasApprovedLinkForPatient(a.id) ? 0 : 1;
      const bCritical = hasApprovedLinkForPatient(b.id) ? 0 : 1;
      return bCritical - aCritical;
    });

  const filteredAppointments = appointments.filter(
    (a) =>
      a.patients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false ||
      a.donor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false ||
      a.date.includes(searchQuery) ||
      a.status.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredLinks = links.filter(
    (link) =>
      link.patients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false ||
      link.donor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false ||
      link.status.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const mappingPatientOptions = patients
    .filter(
      (p) =>
        p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        p.blood_group.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        p.phone.includes(patientSearchTerm),
    )
    .slice(0, 8);

  const mappingDonorCandidates = donors.filter(
    (d) =>
      d.name.toLowerCase().includes(donorSearchTerm.toLowerCase()) ||
      d.blood_group.toLowerCase().includes(donorSearchTerm.toLowerCase()) ||
      d.phone.includes(donorSearchTerm),
  );

  const groupedLinksByPatient = filteredLinks.reduce<
    Record<
      string,
      {
        patientName: string;
        patientBloodGroup: string;
        items: PatientDonorLinkRecord[];
      }
    >
  >((acc, link) => {
    const key = link.patient_id;
    if (!acc[key]) {
      acc[key] = {
        patientName: link.patients?.name || t("directory.modal.unknownPatient"),
        patientBloodGroup: link.patients?.blood_group || "-",
        items: [],
      };
    }
    acc[key].items.push(link);
    return acc;
  }, {});

  const parseBloodGroup = (bloodGroup?: string | null) => {
    if (!bloodGroup) return null;
    const value = bloodGroup.toUpperCase().trim();
    const match = value.match(/^(AB|A|B|O)([+-])$/);
    if (!match) return null;
    return {
      abo: match[1] as AboType,
      rh: match[2] as RhType,
      normalized: `${match[1]}${match[2]}`,
    };
  };

  const isAboCompatible = (donorAbo: AboType, patientAbo: AboType) => {
    const compatibilityMap: Record<AboType, AboType[]> = {
      O: ["O", "A", "B", "AB"],
      A: ["A", "AB"],
      B: ["B", "AB"],
      AB: ["AB"],
    };
    return compatibilityMap[donorAbo].includes(patientAbo);
  };

  const isRhCompatible = (donorRh: RhType, patientRh: RhType) => {
    if (donorRh === "-") return true;
    return patientRh === "+";
  };

  const getAboRhCompatibility = (
    donorBloodGroup?: string | null,
    patientBloodGroup?: string | null,
  ) => {
    const donor = parseBloodGroup(donorBloodGroup);
    const patient = parseBloodGroup(patientBloodGroup);

    if (!donor || !patient) {
      return {
        canEvaluate: false,
        compatible: false,
        label: t("directory.mappings.compatibilityUnknownTitle"),
        detail: t("directory.mappings.compatibilityUnknownDetail"),
      };
    }

    const aboOk = isAboCompatible(donor.abo, patient.abo);
    const rhOk = isRhCompatible(donor.rh, patient.rh);
    const compatible = aboOk && rhOk;

    return {
      canEvaluate: true,
      compatible,
      label: compatible
        ? t("directory.mappings.compatibilityOkTitle")
        : t("directory.mappings.compatibilityBadTitle"),
      detail: compatible
        ? `${t("directory.mappings.compatibilityOkDetailStart")} ${donor.normalized} ${t("directory.mappings.compatibilityOkDetailMiddle")} ${patient.normalized}.`
        : `${t("directory.mappings.compatibilityBadDetailStart")} ${donor.normalized} ${t("directory.mappings.compatibilityBadDetailMiddle")} ${patient.normalized}.`,
    };
  };

  const selectedPatientRecord = patients.find(
    (p) => p.id === selectedPatientForLink,
  );
  const selectedDonorRecord = donors.find((d) => d.id === selectedDonorForLink);
  const existingSelectedLink = links.find(
    (link) =>
      link.patient_id === selectedPatientForLink &&
      link.donor_id === selectedDonorForLink,
  );
  const compatibilityResult = getAboRhCompatibility(
    selectedDonorRecord?.blood_group,
    selectedPatientRecord?.blood_group,
  );

  const mappingDonorOptions = mappingDonorCandidates
    .filter((donor) => {
      if (!selectedPatientRecord) return true;
      const donorCompatibility = getAboRhCompatibility(
        donor.blood_group,
        selectedPatientRecord.blood_group,
      );
      return donorCompatibility.canEvaluate && donorCompatibility.compatible;
    })
    .slice(0, 8);

  const selectedDonorOtherApprovedLinks = selectedDonorForLink
    ? links.filter(
        (link) =>
          link.donor_id === selectedDonorForLink &&
          link.status === "approved" &&
          link.patient_id !== selectedPatientForLink,
      )
    : [];

  const donorAlreadyMappedElsewhere =
    selectedDonorOtherApprovedLinks.length > 0;

  const donorAlreadyMappedPatientNames = selectedDonorOtherApprovedLinks
    .map((link) => link.patients?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");

  const selectedDonorApprovedLinks = selectedDonor
    ? links.filter(
        (link) =>
          link.donor_id === selectedDonor.id && link.status === "approved",
      )
    : [];

  const selectedPatientApprovedLinks = selectedPatient
    ? links.filter(
        (link) =>
          link.patient_id === selectedPatient.id && link.status === "approved",
      )
    : [];

  const getLinkErrorMessage = (
    error: { code?: string; message?: string } | null,
  ) => {
    if (!error) return t("directory.mappings.errorUnknown");
    if (error.code === "42P01") {
      return t("directory.mappings.errorTableMissing");
    }
    if (error.code === "42501") {
      return t("directory.mappings.errorPermissionDenied");
    }
    return error.message || t("directory.mappings.errorOperationFailed");
  };

  const logOperationalEvent = async (
    eventType: string,
    payload?: Record<string, unknown>,
  ) => {
    const { error } = await supabase.from("operational_events").insert({
      event_type: eventType,
      payload: payload || null,
    });

    if (error && error.code !== "42P01" && error.code !== "42501") {
      console.error("Failed to log operational event:", error);
    }
  };

  const createOrApproveLink = async () => {
    if (!selectedPatientForLink || !selectedDonorForLink) return;

    const patientRecord = patients.find((p) => p.id === selectedPatientForLink);
    const donorRecord = donors.find((d) => d.id === selectedDonorForLink);
    const compatibilityCheck = getAboRhCompatibility(
      donorRecord?.blood_group,
      patientRecord?.blood_group,
    );

    if (!compatibilityCheck.canEvaluate || !compatibilityCheck.compatible) {
      await logOperationalEvent("incompatible_link_attempt", {
        patient_id: selectedPatientForLink,
        donor_id: selectedDonorForLink,
        patient_blood_group: patientRecord?.blood_group || null,
        donor_blood_group: donorRecord?.blood_group || null,
      });
      setLinkMessageTone("warning");
      setLinkMessage(
        `${t("directory.mappings.cannotSavePrefix")} ${compatibilityCheck.detail} ${t("directory.mappings.cannotSaveSuffix")}`,
      );
      return;
    }

    setLinkMessage(null);

    const existing = links.find(
      (link) =>
        link.patient_id === selectedPatientForLink &&
        link.donor_id === selectedDonorForLink,
    );

    if (existing) {
      if (existing.status === "approved") {
        setLinkMessageTone("warning");
        setLinkMessage(t("directory.mappings.duplicateApprovedLink"));
        return;
      }

      const { error } = await supabase
        .from("patient_donor_links")
        .update({ status: "approved" })
        .eq("id", existing.id);

      if (error) {
        setLinkMessageTone("error");
        setLinkMessage(
          `${t("directory.mappings.errorUpdateStatusPrefix")} ${getLinkErrorMessage(error)}`,
        );
        return;
      }
    } else {
      const { error } = await supabase.from("patient_donor_links").insert({
        patient_id: selectedPatientForLink,
        donor_id: selectedDonorForLink,
        status: "approved",
      });

      if (error) {
        setLinkMessageTone("error");
        setLinkMessage(
          `${t("directory.mappings.errorCreateLinkPrefix")} ${getLinkErrorMessage(error)}`,
        );
        return;
      }
    }

    setLinkMessageTone("success");
    setLinkMessage(t("directory.mappings.linkSavedSuccess"));
    setSelectedDonorForLink("");
    setDonorSearchTerm("");
    await fetchData();
  };

  const deactivateLink = async (linkId: string) => {
    const { error } = await supabase
      .from("patient_donor_links")
      .update({ status: "inactive" })
      .eq("id", linkId);

    if (error) {
      setLinkMessageTone("error");
      setLinkMessage(
        `${t("directory.mappings.errorDeactivatePrefix")} ${getLinkErrorMessage(error)}`,
      );
      return;
    }

    setLinkMessageTone("success");
    setLinkMessage(t("directory.mappings.linkSetInactiveSuccess"));
    await fetchData();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "status-pill--scheduled";
      case "Accepted":
        return "status-pill--accepted";
      case "Declined":
        return "status-pill--declined";
      case "Donated":
        return "status-pill--donated";
      case "Completed":
        return "status-pill--completed";
      default:
        return "status-pill--neutral";
    }
  };

  const getLinkStatusPill = (status: PatientDonorLinkRecord["status"]) => {
    switch (status) {
      case "approved":
        return "status-pill--approved";
      case "inactive":
        return "status-pill--inactive";
      case "pending":
        return "status-pill--pending";
      default:
        return "status-pill--neutral";
    }
  };

  const getLocalizedAppointmentStatus = (status: string) => {
    switch (status) {
      case "Scheduled":
        return t("directory.appt.status.scheduled");
      case "Accepted":
        return t("directory.appt.status.accepted");
      case "Declined":
        return t("directory.appt.status.declined");
      case "Donated":
        return t("directory.appt.status.donated");
      case "Completed":
        return t("directory.appt.status.completed");
      default:
        return status;
    }
  };

  const getLocalizedLinkStatus = (status: PatientDonorLinkRecord["status"]) => {
    switch (status) {
      case "approved":
        return t("directory.mappings.statusApproved");
      case "inactive":
        return t("directory.mappings.statusInactive");
      case "pending":
        return t("directory.mappings.statusPending");
      default:
        return status;
    }
  };

  const bloodGroupColor = (bg: string | undefined) => {
    if (!bg) return "bg-slate-700";
    const bgUpper = bg.toUpperCase().trim();

    // Positive blood types
    if (bgUpper === "O+") return "bg-red-600";
    if (bgUpper === "A+") return "bg-orange-600";
    if (bgUpper === "B+") return "bg-amber-600";
    if (bgUpper === "AB+") return "bg-rose-600";

    // Negative blood types
    if (bgUpper === "O-") return "bg-red-700";
    if (bgUpper === "A-") return "bg-orange-700";
    if (bgUpper === "B-") return "bg-amber-700";
    if (bgUpper === "AB-") return "bg-rose-700";

    // Fallback for unknown blood groups
    return "bg-slate-700";
  };

  // Helper component to render individual appointment card
  const AppointmentCard = ({ appt }: { appt: AppointmentRecord }) => (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                {t("directory.appt.card.patientLabel")}
              </p>
              <p className="text-lg font-black text-slate-900">
                {appt.patients?.name}
              </p>
            </div>
            <div className="text-2xl font-black text-slate-300">→</div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                {t("directory.appt.card.donorLabel")}
              </p>
              <p className="text-lg font-black text-slate-900">
                {appt.donor?.name || t("directory.appt.card.unassignedDonor")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black text-white ${bloodGroupColor(appt.patients?.blood_group)}`}
            >
              {appt.patients?.blood_group}
            </div>
            <span
              className={`status-pill text-sm px-4 py-2 rounded-lg tracking-tight flex items-center gap-2 ${getStatusColor(
                appt.status,
              )}`}
            >
              {getLocalizedAppointmentStatus(appt.status)}
            </span>
            <span className="text-sm font-bold px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 border border-blue-700">
              <FaCalendarAlt size={14} /> {formatDate(appt.date)}
            </span>
            {appt.donor_arrival && (
              <span className="text-sm font-bold px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 border border-orange-700">
                🩸 {t("directory.appt.card.arrivalLabel")}{" "}
                {formatDate(appt.donor_arrival)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <AppTopNav active="directory" />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
            <FaHeart className="text-red-500" /> {t("directory.title")}
          </h1>
          <p className="text-slate-500 font-medium">
            {t("directory.subtitle")}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl p-2 shadow-sm border border-slate-200 w-fit">
          <button
            onClick={() => setTab("donors")}
            className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-tight transition-all ${
              tab === "donors"
                ? "bg-red-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            🩸 {t("directory.tab.donors")} ({donorTotalCount})
          </button>
          <button
            onClick={() => setTab("patients")}
            className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-tight transition-all ${
              tab === "patients"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            👥 {t("directory.tab.patients")} ({patientTotalCount})
          </button>
          <button
            onClick={() => setTab("appointments")}
            className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-tight transition-all ${
              tab === "appointments"
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            📅 {t("directory.tab.appointments")} ({appointments.length})
          </button>
          <button
            onClick={() => setTab("mappings")}
            className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-tight transition-all ${
              tab === "mappings"
                ? "bg-violet-600 text-white shadow-lg"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            🔗 {t("directory.tab.mappings")} (
            {links.filter((l) => l.status === "approved").length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("directory.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 font-medium text-slate-700 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {(tab === "donors" || tab === "patients") && (
          <div className="sticky top-2 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    viewMode === "cards"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("directory.controls.cardsView")}
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    viewMode === "list"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  {t("directory.controls.listView")}
                </button>

                <select
                  value={sortPreset}
                  onChange={(e) =>
                    setSortPreset(
                      e.target.value as
                        | "criticality"
                        | "lastDonation"
                        | "compatibility"
                        | "newest",
                    )
                  }
                  className="ml-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="criticality">
                    {t("directory.sort.criticality")}
                  </option>
                  <option value="lastDonation">
                    {t("directory.sort.lastDonation")}
                  </option>
                  <option value="compatibility">
                    {t("directory.sort.compatibility")}
                  </option>
                  <option value="newest">{t("directory.sort.newest")}</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "o-positive", label: t("directory.filters.oPositive") },
                  ...(tab === "donors"
                    ? [
                        {
                          id: "female-donors",
                          label: t("directory.filters.femaleDonors"),
                        },
                        {
                          id: "available-this-week",
                          label: t("directory.filters.availableThisWeek"),
                        },
                      ]
                    : []),
                  {
                    id: "no-active-mapping",
                    label: t("directory.filters.noActiveMapping"),
                  },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => toggleSavedFilter(chip.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                      activeSavedFilters.includes(chip.id)
                        ? "bg-violet-100 text-violet-700 border-violet-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest">
              {t("directory.loading")}
            </div>
          </div>
        ) : (
          <>
            {(tab === "donors" || tab === "patients") && (
              <div className="mb-4 text-xs font-semibold text-slate-500">
                {tab === "donors"
                  ? `Showing ${filteredDonors.length} of ${donorTotalCount} donors`
                  : `Showing ${filteredPatients.length} of ${patientTotalCount} patients`}
              </div>
            )}
            {/* DONORS TAB */}
            {tab === "donors" && (
              <>
                {filteredDonors.length === 0 ? (
                  <div className="py-16 text-center">
                    <FaHeart
                      className="mx-auto mb-4 text-slate-200"
                      size={48}
                    />
                    <p className="text-slate-400 font-medium">
                      {t("directory.emptyDonors")}
                    </p>
                  </div>
                ) : viewMode === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDonors.map((donor) => {
                      const latestStatus = latestDonorStatusById[donor.id];
                      return (
                        <div
                          key={donor.id}
                          className={`p-5 rounded-3xl border-2 transition-all hover:shadow-xl group ${
                            donor.available
                              ? "bg-gradient-to-br from-red-50 to-red-25 border-red-200 hover:border-red-400"
                              : "bg-gradient-to-br from-slate-50 to-slate-25 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-4 p-2 rounded-xl bg-white/70 border border-white">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight ${
                                  donor.available
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {donor.available
                                  ? t("directory.urgency.readyNow")
                                  : t("directory.urgency.coolingPeriod")}
                              </span>
                              {!hasApprovedLinkForDonor(donor.id) && (
                                <span className="text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight bg-violet-100 text-violet-700">
                                  {t("directory.urgency.noActiveMapping")}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => goToMappingWithDonor(donor)}
                              className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              {t("directory.actions.mapNow")}
                            </button>
                          </div>

                          <div className="flex justify-between items-start mb-4 gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-2xl font-black text-slate-900 leading-tight truncate">
                                {donor.name}
                              </h3>
                              <p className="text-sm text-slate-600 font-semibold mt-1">
                                {donor.phone}
                              </p>
                            </div>
                            <div
                              className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-black text-white ${bloodGroupColor(
                                donor.blood_group,
                              )}`}
                            >
                              {donor.blood_group}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-4 rounded-xl border border-slate-200 bg-white/80 p-2">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {t("directory.modal.lastDonation")}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {donor.last_donated
                                  ? formatDate(donor.last_donated)
                                  : t("directory.cards.notAvailable")}
                              </p>
                            </div>
                            <div className="text-center border-l border-r border-slate-200">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {t("directory.modal.nextAvailable")}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {donor.next_available_date
                                  ? formatDate(donor.next_available_date)
                                  : t("directory.cards.notAvailable")}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {t("directory.cards.lastStatus")}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {latestStatus
                                  ? getLocalizedAppointmentStatus(latestStatus)
                                  : t("directory.cards.notAvailable")}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 p-2 bg-white/70 rounded-xl border border-white">
                            <a
                              href={`tel:${donor.phone}`}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                              <FaPhoneAlt size={13} />{" "}
                              {t("directory.cards.callAction")}
                            </a>
                            <button
                              onClick={() => goToMappingWithDonor(donor)}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white border border-violet-700 font-bold text-sm hover:bg-violet-700 transition-colors"
                            >
                              {t("directory.cards.mapAction")}
                            </button>
                            <button
                              onClick={() => setSelectedDonor(donor)}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white border border-red-700 font-bold text-sm hover:bg-red-700 transition-colors"
                            >
                              {t("directory.cards.viewHistoryAction")}{" "}
                              <FaChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDonors.map((donor) => {
                      const latestStatus = latestDonorStatusById[donor.id];
                      return (
                        <div
                          key={donor.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-black text-slate-900 truncate">
                              {donor.name}
                            </p>
                            <p className="text-sm font-semibold text-slate-600">
                              {donor.phone}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-black px-3 py-1 rounded-lg text-white ${bloodGroupColor(
                              donor.blood_group,
                            )}`}
                          >
                            {donor.blood_group}
                          </span>
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                            {donor.available
                              ? t("directory.urgency.readyNow")
                              : t("directory.urgency.coolingPeriod")}
                          </span>
                          <p className="text-xs font-semibold text-slate-600">
                            {t("directory.cards.lastStatus")}:{" "}
                            {latestStatus
                              ? getLocalizedAppointmentStatus(latestStatus)
                              : t("directory.cards.notAvailable")}
                          </p>
                          <div className="flex flex-wrap gap-2 lg:ml-auto">
                            <a
                              href={`tel:${donor.phone}`}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                              {t("directory.cards.callAction")}
                            </a>
                            <button
                              onClick={() => goToMappingWithDonor(donor)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                            >
                              {t("directory.cards.mapAction")}
                            </button>
                            <button
                              onClick={() => setSelectedDonor(donor)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                              {t("directory.cards.viewHistoryAction")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* PATIENTS TAB */}
            {tab === "patients" && (
              <>
                {filteredPatients.length === 0 ? (
                  <div className="py-16 text-center">
                    <FaTint className="mx-auto mb-4 text-slate-200" size={48} />
                    <p className="text-slate-400 font-medium">
                      {t("directory.emptyPatients")}
                    </p>
                  </div>
                ) : viewMode === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPatients.map((patient) => {
                      const latestStatus = latestPatientStatusById[patient.id];
                      const needsDonor = !hasApprovedLinkForPatient(patient.id);
                      return (
                        <div
                          key={patient.id}
                          className="p-5 rounded-3xl border-2 bg-gradient-to-br from-blue-50 to-blue-25 border-blue-200 hover:border-blue-400 transition-all hover:shadow-xl group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-4 p-2 rounded-xl bg-white/70 border border-white">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight ${needsDonor ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                              >
                                {needsDonor
                                  ? t("directory.urgency.needsDonor")
                                  : t("directory.urgency.covered")}
                              </span>
                            </div>
                            <button
                              onClick={() => goToMappingWithPatient(patient)}
                              className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              {t("directory.actions.assignDonor")}
                            </button>
                          </div>

                          <div className="flex justify-between items-start mb-4 gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-2xl font-black text-slate-900 leading-tight truncate">
                                {patient.name}
                              </h3>
                              <p className="text-sm text-slate-600 font-semibold mt-1">
                                {patient.phone}
                              </p>
                            </div>
                            <div
                              className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-black text-white ${bloodGroupColor(
                                patient.blood_group,
                              )}`}
                            >
                              {patient.blood_group}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-4 rounded-xl border border-slate-200 bg-white/80 p-2">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {t("directory.modal.bloodGroup")}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {patient.blood_group}
                              </p>
                            </div>
                            <div className="text-center border-l border-r border-slate-200">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {t("directory.cards.compatibilityPotential")}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {patientCompatibilityCount[patient.id] || 0}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                {t("directory.cards.lastStatus")}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {latestStatus
                                  ? getLocalizedAppointmentStatus(latestStatus)
                                  : t("directory.cards.notAvailable")}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 p-2 bg-white/70 rounded-xl border border-white">
                            <a
                              href={`tel:${patient.phone}`}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                              <FaPhoneAlt size={13} />{" "}
                              {t("directory.cards.callAction")}
                            </a>
                            <button
                              onClick={() => goToMappingWithPatient(patient)}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white border border-violet-700 font-bold text-sm hover:bg-violet-700 transition-colors"
                            >
                              {t("directory.cards.mapAction")}
                            </button>
                            <button
                              onClick={() => setSelectedPatient(patient)}
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white border border-blue-700 font-bold text-sm hover:bg-blue-700 transition-colors"
                            >
                              {t("directory.cards.viewHistoryAction")}{" "}
                              <FaChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPatients.map((patient) => {
                      const latestStatus = latestPatientStatusById[patient.id];
                      const needsDonor = !hasApprovedLinkForPatient(patient.id);
                      return (
                        <div
                          key={patient.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-black text-slate-900 truncate">
                              {patient.name}
                            </p>
                            <p className="text-sm font-semibold text-slate-600">
                              {patient.phone}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-black px-3 py-1 rounded-lg text-white ${bloodGroupColor(
                              patient.blood_group,
                            )}`}
                          >
                            {patient.blood_group}
                          </span>
                          <span
                            className={`text-xs font-black px-3 py-1 rounded-full ${needsDonor ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {needsDonor
                              ? t("directory.urgency.needsDonor")
                              : t("directory.urgency.covered")}
                          </span>
                          <p className="text-xs font-semibold text-slate-600">
                            {t("directory.cards.lastStatus")}:{" "}
                            {latestStatus
                              ? getLocalizedAppointmentStatus(latestStatus)
                              : t("directory.cards.notAvailable")}
                          </p>
                          <div className="flex flex-wrap gap-2 lg:ml-auto">
                            <a
                              href={`tel:${patient.phone}`}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                              {t("directory.cards.callAction")}
                            </a>
                            <button
                              onClick={() => goToMappingWithPatient(patient)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                            >
                              {t("directory.cards.mapAction")}
                            </button>
                            <button
                              onClick={() => setSelectedPatient(patient)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            >
                              {t("directory.cards.viewHistoryAction")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {(tab === "donors" || tab === "patients") && (
              <div className="mt-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  Page {currentPage}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={
                      tab === "donors"
                        ? currentPage * PAGE_SIZE >= donorTotalCount
                        : currentPage * PAGE_SIZE >= patientTotalCount
                    }
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {tab === "appointments" && (
              <div className="space-y-8">
                {filteredAppointments.length === 0 ? (
                  <div className="py-16 text-center">
                    <FaCalendarAlt
                      className="mx-auto mb-4 text-slate-200"
                      size={48}
                    />
                    <p className="text-slate-400 font-medium">
                      {t("directory.appt.noAppointmentsFound")}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* COMPLETED APPOINTMENTS */}
                    {filteredAppointments.filter(
                      (a) => a.status === "Completed",
                    ).length > 0 && (
                      <div>
                        <div className="mb-4 pb-3 border-b-2 border-emerald-500">
                          <h3 className="text-2xl font-black text-emerald-700 flex items-center gap-2">
                            ✅ {t("directory.appt.completedTitle")}
                            <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">
                              {
                                filteredAppointments.filter(
                                  (a) => a.status === "Completed",
                                ).length
                              }
                            </span>
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {t("directory.appt.completedHint")}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {filteredAppointments
                            .filter((a) => a.status === "Completed")
                            .map((appt) => (
                              <AppointmentCard key={appt.id} appt={appt} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* DONATED APPOINTMENTS */}
                    {filteredAppointments.filter((a) => a.status === "Donated")
                      .length > 0 && (
                      <div>
                        <div className="mb-4 pb-3 border-b-2 border-orange-500">
                          <h3 className="text-2xl font-black text-orange-700 flex items-center gap-2">
                            🩸 {t("directory.appt.donatedTitle")}
                            <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold">
                              {
                                filteredAppointments.filter(
                                  (a) => a.status === "Donated",
                                ).length
                              }
                            </span>
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {t("directory.appt.donatedHint")}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {filteredAppointments
                            .filter((a) => a.status === "Donated")
                            .map((appt) => (
                              <AppointmentCard key={appt.id} appt={appt} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* ASSIGNED APPOINTMENTS */}
                    {filteredAppointments
                      .filter(
                        (a) =>
                          a.status === "Scheduled" ||
                          a.status === "Accepted" ||
                          a.status === "Declined",
                      )
                      .some((a) => a.donor_id) && (
                      <div>
                        <div className="mb-4 pb-3 border-b-2 border-blue-500">
                          <h3 className="text-2xl font-black text-blue-700 flex items-center gap-2">
                            👤 {t("directory.appt.assignedTitle")}
                            <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                              {
                                filteredAppointments.filter(
                                  (a) =>
                                    (a.status === "Scheduled" ||
                                      a.status === "Accepted" ||
                                      a.status === "Declined") &&
                                    a.donor_id,
                                ).length
                              }
                            </span>
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {t("directory.appt.assignedHint")}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {filteredAppointments
                            .filter(
                              (a) =>
                                (a.status === "Scheduled" ||
                                  a.status === "Accepted" ||
                                  a.status === "Declined") &&
                                a.donor_id,
                            )
                            .map((appt) => (
                              <AppointmentCard key={appt.id} appt={appt} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* UNASSIGNED APPOINTMENTS */}
                    {filteredAppointments.filter(
                      (a) =>
                        !a.donor_id &&
                        a.status !== "Completed" &&
                        a.status !== "Donated",
                    ).length > 0 && (
                      <div>
                        <div className="mb-4 pb-3 border-b-2 border-red-500">
                          <h3 className="text-2xl font-black text-red-700 flex items-center gap-2">
                            ⚠️ {t("directory.appt.unassignedTitle")}
                            <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                              {
                                filteredAppointments.filter(
                                  (a) =>
                                    !a.donor_id &&
                                    a.status !== "Completed" &&
                                    a.status !== "Donated",
                                ).length
                              }
                            </span>
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {t("directory.appt.unassignedHint")}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {filteredAppointments
                            .filter(
                              (a) =>
                                !a.donor_id &&
                                a.status !== "Completed" &&
                                a.status !== "Donated",
                            )
                            .map((appt) => (
                              <AppointmentCard key={appt.id} appt={appt} />
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* MAPPINGS TAB */}
            {tab === "mappings" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-1">
                    <FaLink className="text-violet-600" />
                    {t("directory.mappings.title")}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {t("directory.mappings.subtitle")}
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-tight text-slate-500">
                        {t("directory.mappings.selectPatient")}
                      </p>
                      <input
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        placeholder={t(
                          "directory.mappings.searchPatientPlaceholder",
                        )}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-700"
                      />
                      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50">
                        {mappingPatientOptions.length === 0 ? (
                          <p className="p-3 text-xs text-slate-500">
                            {t("directory.mappings.noPatientMatches")}
                          </p>
                        ) : (
                          mappingPatientOptions.map((patient) => (
                            <button
                              key={patient.id}
                              onClick={() => {
                                setSelectedPatientForLink(patient.id);
                                setPatientSearchTerm(
                                  `${patient.name} (${patient.blood_group})`,
                                );
                              }}
                              className={`w-full text-left px-3 py-2 text-sm font-semibold transition-colors ${
                                selectedPatientForLink === patient.id
                                  ? "bg-violet-100 text-violet-700"
                                  : "hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              {patient.name}{" "}
                              <span className="text-slate-500">
                                ({patient.blood_group})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-tight text-slate-500">
                        {t("directory.mappings.selectDonor")}
                      </p>
                      <input
                        value={donorSearchTerm}
                        onChange={(e) => setDonorSearchTerm(e.target.value)}
                        placeholder={t(
                          "directory.mappings.searchDonorPlaceholder",
                        )}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 font-semibold text-slate-700"
                      />
                      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50">
                        {mappingDonorOptions.length === 0 ? (
                          <p className="p-3 text-xs text-slate-500">
                            {t("directory.mappings.noDonorMatches")}
                          </p>
                        ) : (
                          mappingDonorOptions.map((donor) => (
                            <button
                              key={donor.id}
                              onClick={() => {
                                setSelectedDonorForLink(donor.id);
                                setDonorSearchTerm(
                                  `${donor.name} (${donor.blood_group})`,
                                );
                              }}
                              className={`w-full text-left px-3 py-2 text-sm font-semibold transition-colors ${
                                selectedDonorForLink === donor.id
                                  ? "bg-violet-100 text-violet-700"
                                  : "hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              {donor.name}{" "}
                              <span className="text-slate-500">
                                ({donor.blood_group})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex lg:items-end">
                      <button
                        onClick={createOrApproveLink}
                        disabled={
                          !selectedPatientForLink ||
                          !selectedDonorForLink ||
                          !compatibilityResult.canEvaluate ||
                          !compatibilityResult.compatible ||
                          existingSelectedLink?.status === "approved"
                        }
                        className="w-full bg-violet-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-violet-700 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("directory.mappings.saveApprovedLink")}
                      </button>
                    </div>
                  </div>

                  {selectedPatientForLink && selectedDonorForLink && (
                    <div
                      className={`mt-4 rounded-xl border p-3 ${
                        donorAlreadyMappedElsewhere ||
                        existingSelectedLink?.status === "approved"
                          ? "bg-amber-50 border-amber-200"
                          : compatibilityResult.compatible
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-red-50 border-red-200"
                      }`}
                    >
                      <p
                        className={`text-sm font-black ${
                          donorAlreadyMappedElsewhere ||
                          existingSelectedLink?.status === "approved"
                            ? "text-amber-700"
                            : compatibilityResult.compatible
                              ? "text-emerald-700"
                              : "text-red-700"
                        }`}
                      >
                        {donorAlreadyMappedElsewhere
                          ? "Donor already mapped"
                          : existingSelectedLink?.status === "approved"
                            ? t("directory.mappings.linkAlreadyApproved")
                            : compatibilityResult.label}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {donorAlreadyMappedElsewhere
                          ? donorAlreadyMappedPatientNames
                            ? `This donor already has approved link(s) with: ${donorAlreadyMappedPatientNames}. You can still save this link, but please review allocation conflicts.`
                            : "This donor already has an approved link with another patient. You can still save this link, but please review allocation conflicts."
                          : existingSelectedLink?.status === "approved"
                            ? t("directory.mappings.linkAlreadyApprovedDesc")
                            : compatibilityResult.detail}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {t("directory.mappings.noteManualVerification")}
                      </p>
                    </div>
                  )}

                  {linkMessage && (
                    <p
                      className={`mt-3 text-sm font-semibold ${
                        linkMessageTone === "success"
                          ? "text-emerald-700"
                          : linkMessageTone === "warning"
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      {linkMessage}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredLinks.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                      <FaLink
                        className="mx-auto mb-3 text-slate-200"
                        size={36}
                      />
                      <p className="text-slate-400 font-medium">
                        {t("directory.mappings.noLinksFound")}
                      </p>
                    </div>
                  ) : (
                    Object.entries(groupedLinksByPatient).map(
                      ([patientId, group]) => (
                        <div
                          key={patientId}
                          className="bg-white border border-slate-200 rounded-2xl p-5 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-base font-black text-slate-900">
                                {group.patientName}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {t("directory.mappings.patientBloodGroup")}:{" "}
                                {group.patientBloodGroup}
                              </p>
                            </div>
                            <span className="text-xs font-black px-3 py-1 rounded-full bg-violet-100 text-violet-700 uppercase">
                              {group.items.length}{" "}
                              {t("directory.mappings.links")}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {group.items.map((link) => (
                              <div
                                key={link.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-100 rounded-xl px-3 py-2"
                              >
                                <p className="text-sm font-bold text-slate-800">
                                  {link.donor?.name ||
                                    t("directory.mappings.unknownDonor")}
                                  <span className="text-slate-500 font-semibold">
                                    {" "}
                                    ({link.donor?.blood_group || "-"})
                                  </span>
                                </p>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`status-pill ${getLinkStatusPill(link.status)}`}
                                  >
                                    {getLocalizedLinkStatus(link.status)}
                                  </span>
                                  {link.status === "approved" && (
                                    <button
                                      onClick={() => deactivateLink(link.id)}
                                      className="text-xs font-bold px-3 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                                    >
                                      {t("directory.mappings.setInactive")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* DONOR DETAIL MODAL */}
      {selectedDonor && (
        <div
          className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDonor(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">
                  {t("directory.modal.donorProfile")}
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedDonor.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDonor(null)}
                aria-label="Close donor details"
                className="text-slate-400 hover:text-slate-600 transition-colors p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-slate-50 to-white flex items-center gap-4">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white ${bloodGroupColor(selectedDonor.blood_group)}`}
                >
                  {selectedDonor.blood_group}
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                    {t("directory.modal.status")}
                  </p>
                  <span
                    className={`inline-block text-sm font-black px-3 py-1.5 rounded-full mt-2 ${
                      selectedDonor.available
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedDonor.available
                      ? t("directory.modal.available")
                      : t("directory.modal.unavailable")}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-2">
                  {t("directory.modal.contact")}
                </p>
                <a
                  href={`tel:${selectedDonor.phone}`}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <FaPhoneAlt className="text-red-500" />
                  <span className="font-bold text-slate-900">
                    {selectedDonor.phone}
                  </span>
                </a>
              </div>

              {selectedDonor.last_donated && (
                <div className="border-t border-slate-200 pt-6">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-3">
                    {t("directory.modal.lastDonation")}
                  </p>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-2xl font-black text-red-700">
                      {formatDate(selectedDonor.last_donated)}
                    </p>
                  </div>
                </div>
              )}

              {selectedDonor.next_available_date &&
                !selectedDonor.available && (
                  <div className="border-t border-slate-200 pt-6">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-3">
                      {t("directory.modal.nextAvailable")}
                    </p>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-2xl font-black text-amber-700">
                        {formatDate(selectedDonor.next_available_date)}
                      </p>
                    </div>
                  </div>
                )}

              <div className="border-t border-slate-200 pt-6">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-3">
                  {t("directory.modal.linkedPatients")}
                </p>
                <div className="space-y-2">
                  {selectedDonorApprovedLinks.length === 0 ? (
                    <p className="text-slate-500 italic text-sm">
                      {t("directory.modal.noPatientsAssigned")}
                    </p>
                  ) : (
                    selectedDonorApprovedLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <p className="font-bold text-slate-900">
                          {link.patients?.name ||
                            t("directory.modal.unknownPatient")}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {t("directory.modal.bloodGroup")}:{" "}
                          {link.patients?.blood_group || "-"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT DETAIL MODAL */}
      {selectedPatient && (
        <div
          className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">
                  {t("directory.modal.patientProfile")}
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedPatient.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                aria-label="Close patient details"
                className="text-slate-400 hover:text-slate-600 transition-colors p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-slate-50 to-white flex items-center gap-4">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white ${bloodGroupColor(selectedPatient.blood_group)}`}
                >
                  {selectedPatient.blood_group}
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                    {t("directory.modal.status")}
                  </p>
                  <span className="inline-block text-sm font-black px-3 py-1.5 rounded-full mt-2 bg-blue-100 text-blue-700">
                    {t("directory.modal.active")}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-2">
                  {t("directory.modal.contact")}
                </p>
                <a
                  href={`tel:${selectedPatient.phone}`}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <FaPhoneAlt className="text-blue-500" />
                  <span className="font-bold text-slate-900">
                    {selectedPatient.phone}
                  </span>
                </a>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-3">
                  {t("directory.modal.linkedDonors")}
                </p>
                <div className="space-y-2">
                  {selectedPatientApprovedLinks.length === 0 ? (
                    <p className="text-slate-500 italic text-sm">
                      {t("directory.modal.noDonorsAssigned")}
                    </p>
                  ) : (
                    selectedPatientApprovedLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-3 bg-violet-50 rounded-lg border border-violet-200"
                      >
                        <p className="font-bold text-slate-900">
                          {link.donor?.name ||
                            t("directory.modal.unknownDonor")}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {t("directory.modal.bloodGroup")}:{" "}
                          {link.donor?.blood_group || "-"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-3">
                  {t("directory.modal.appointments")}
                </p>
                <div className="space-y-2">
                  {appointments
                    .filter((a) => a.patient_id === selectedPatient.id)
                    .map((appt) => (
                      <div
                        key={appt.id}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-900">
                            {formatDate(appt.date)}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-1 rounded ${getStatusColor(appt.status)}`}
                          >
                            {appt.status}
                          </span>
                        </div>
                        {appt.donor?.name && (
                          <p className="text-sm text-slate-600">
                            {t("directory.modal.donor")}:{" "}
                            <span className="font-bold">{appt.donor.name}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  {appointments.filter(
                    (a) => a.patient_id === selectedPatient.id,
                  ).length === 0 && (
                    <p className="text-slate-500 italic text-sm">
                      {t("directory.modal.noAppointments")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
