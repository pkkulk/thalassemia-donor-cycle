"use client";

import { useEffect, useMemo, useState } from "react";

export type LanguageCode = "en" | "hi" | "mr" | "ta" | "gu";

const STORAGE_KEY = "dashboard-language";
const LANGUAGE_EVENT = "dashboard-language-changed";

// i18n is enabled by default. Set NEXT_PUBLIC_ENABLE_I18N=false to force
// English-only behavior.
export const I18N_ENABLED = process.env.NEXT_PUBLIC_ENABLE_I18N !== "false";

export const SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; label: string }> =
  [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "mr", label: "मराठी" },
    { code: "ta", label: "தமிழ்" },
    { code: "gu", label: "ગુજરાતી" },
  ];

type Dictionary = Record<string, string>;

const ENGLISH_DICTIONARY: Dictionary = {
  "language.label": "Language",
  "language.english": "English",
  "language.hindi": "Hindi",

  "dashboard.loading": "Syncing Operational Hub...",
  "dashboard.nav.dashboard": "Dashboard",
  "dashboard.nav.directory": "Directory",
  "dashboard.nav.analytics": "Analytics",
  "dashboard.nav.health": "Health",
  "dashboard.stats.recipientsToday": "Recipients Today",
  "dashboard.stats.activeDonors": "Active Donors",
  "dashboard.stats.upcomingPipeline": "Upcoming Pipeline",
  "dashboard.queue.title": "Action Queue",
  "dashboard.queue.viewHealth": "View Full Health Panel",
  "dashboard.queue.needAssignment": "Appointments need donor assignment",
  "dashboard.queue.needPatientPool": "Patients need donor pool",
  "dashboard.queue.needDonorPool": "Donors need patient pool",
  "dashboard.queue.openCalendar": "Open Calendar",
  "dashboard.queue.assignMappings": "Assign in Mappings",
  "dashboard.queue.mapDonorPatient": "Map Donor-Patient",

  "directory.title": "Directory",
  "directory.subtitle": "View all donors, patients, and appointments",
  "directory.tab.donors": "Donors",
  "directory.tab.patients": "Patients",
  "directory.tab.appointments": "Appointments",
  "directory.tab.mappings": "Mappings",
  "directory.searchPlaceholder":
    "Search by name, blood group, phone, date, or status...",
  "directory.loading": "Loading directory...",
  "directory.emptyDonors": "No donors found",
  "directory.emptyPatients": "No patients found",
  "directory.nav.home": "Home",
  "directory.appt.noAppointmentsFound": "No appointments found",
  "directory.appt.completedTitle": "Completed Appointments",
  "directory.appt.completedHint":
    "Both donor and patient completed the process",
  "directory.appt.donatedTitle": "Donated (Awaiting Patient)",
  "directory.appt.donatedHint":
    "Blood acquired but patient appointment pending",
  "directory.appt.assignedTitle": "Assigned (Donor Confirmed)",
  "directory.appt.assignedHint":
    "Donor assigned and awaiting acceptance or has accepted",
  "directory.appt.unassignedTitle": "Unassigned (No Donor)",
  "directory.appt.unassignedHint": "Awaiting donor assignment",
  "directory.appt.card.patientLabel": "Patient",
  "directory.appt.card.donorLabel": "Donor",
  "directory.appt.card.unassignedDonor": "(Unassigned)",
  "directory.appt.card.arrivalLabel": "Arrival:",
  "directory.appt.status.scheduled": "Scheduled",
  "directory.appt.status.accepted": "Accepted",
  "directory.appt.status.declined": "Declined",
  "directory.appt.status.donated": "Donated",
  "directory.appt.status.completed": "Completed",
  "directory.cards.availableTag": "Available",
  "directory.cards.unavailableTag": "Unavailable",
  "directory.cards.activeTag": "Active",
  "directory.cards.callAction": "Call",
  "directory.cards.viewDetailsAction": "View Details",
  "directory.cards.notAvailable": "N/A",
  "directory.cards.mapAction": "Map",
  "directory.cards.viewHistoryAction": "View History",
  "directory.cards.lastStatus": "Last Status",
  "directory.cards.compatibilityPotential": "Compatibility",
  "directory.controls.cardsView": "Cards",
  "directory.controls.listView": "List",
  "directory.sort.criticality": "Sort: Criticality",
  "directory.sort.lastDonation": "Sort: Last Donation",
  "directory.sort.compatibility": "Sort: Compatibility",
  "directory.sort.newest": "Sort: Newly Added",
  "directory.filters.oPositive": "O+",
  "directory.filters.femaleDonors": "Female Donors",
  "directory.filters.availableThisWeek": "Available This Week",
  "directory.filters.noActiveMapping": "No Active Mapping",
  "directory.urgency.readyNow": "Ready now",
  "directory.urgency.coolingPeriod": "Cooling period",
  "directory.urgency.needsDonor": "Needs donor",
  "directory.urgency.covered": "Donor linked",
  "directory.urgency.noActiveMapping": "No active mapping",
  "directory.actions.mapNow": "Map now",
  "directory.actions.assignDonor": "Assign donor",
  "directory.mappings.title": "Link Donors to Patients",
  "directory.mappings.subtitle":
    "Only approved links are eligible for appointment assignment.",
  "directory.mappings.selectPatient": "Select Patient",
  "directory.mappings.searchPatientPlaceholder":
    "Search patient by name, group, phone",
  "directory.mappings.noPatientMatches": "No patient matches",
  "directory.mappings.selectDonor": "Select Donor",
  "directory.mappings.searchDonorPlaceholder":
    "Search donor by name, group, phone",
  "directory.mappings.noDonorMatches": "No donor matches",
  "directory.mappings.saveApprovedLink": "Save Approved Link",
  "directory.mappings.linkAlreadyApproved": "Link already approved",
  "directory.mappings.linkAlreadyApprovedDesc":
    "This donor is already linked and approved for this patient.",
  "directory.mappings.noteManualVerification":
    "Note: ABO/Rh is baseline only. Final mapping must still be based on manual blood test verification.",
  "directory.mappings.noLinksFound": "No donor-patient links found",
  "directory.mappings.patientBloodGroup": "Patient Blood Group",
  "directory.mappings.links": "links",
  "directory.mappings.unknownDonor": "Unknown Donor",
  "directory.mappings.setInactive": "Set Inactive",
  "directory.mappings.compatibilityUnknownTitle":
    "Cannot evaluate compatibility",
  "directory.mappings.compatibilityUnknownDetail":
    "Invalid or missing blood group format.",
  "directory.mappings.compatibilityOkTitle": "ABO/Rh Compatible",
  "directory.mappings.compatibilityBadTitle": "ABO/Rh Incompatible",
  "directory.mappings.compatibilityOkDetailStart": "Donor",
  "directory.mappings.compatibilityOkDetailMiddle": "can donate to patient",
  "directory.mappings.compatibilityBadDetailStart": "Donor",
  "directory.mappings.compatibilityBadDetailMiddle":
    "should not be linked to patient",
  "directory.mappings.errorUnknown": "Unknown link error.",
  "directory.mappings.errorTableMissing":
    "patient_donor_links table is missing. Run SQL migration first.",
  "directory.mappings.errorPermissionDenied":
    "Permission denied by RLS/policies for patient_donor_links.",
  "directory.mappings.errorOperationFailed": "Operation failed.",
  "directory.mappings.cannotSavePrefix": "Cannot save link:",
  "directory.mappings.cannotSaveSuffix":
    "Please choose an ABO/Rh compatible pair.",
  "directory.mappings.duplicateApprovedLink":
    "This donor-patient link is already approved. Duplicate link was not saved.",
  "directory.mappings.errorUpdateStatusPrefix": "Failed to update link status:",
  "directory.mappings.errorCreateLinkPrefix": "Failed to create link:",
  "directory.mappings.linkSavedSuccess": "Link saved successfully.",
  "directory.mappings.errorDeactivatePrefix": "Failed to deactivate link:",
  "directory.mappings.linkSetInactiveSuccess": "Link set to inactive.",
  "directory.mappings.statusApproved": "Approved",
  "directory.mappings.statusInactive": "Inactive",
  "directory.mappings.statusPending": "Pending",
  "directory.modal.donorProfile": "Donor Profile",
  "directory.modal.patientProfile": "Patient Profile",
  "directory.modal.status": "Status",
  "directory.modal.available": "Available",
  "directory.modal.unavailable": "Unavailable",
  "directory.modal.active": "Active",
  "directory.modal.contact": "Contact",
  "directory.modal.lastDonation": "Last Donation",
  "directory.modal.nextAvailable": "Next Available",
  "directory.modal.linkedPatients": "Linked Patients",
  "directory.modal.noPatientsAssigned": "No patients assigned",
  "directory.modal.unknownPatient": "Unknown Patient",
  "directory.modal.bloodGroup": "Blood Group",
  "directory.modal.linkedDonors": "Linked Donors",
  "directory.modal.noDonorsAssigned": "No donors assigned",
  "directory.modal.unknownDonor": "Unknown Donor",
  "directory.modal.appointments": "Appointments",
  "directory.modal.donor": "Donor",
  "directory.modal.noAppointments": "No appointments",

  "stats.title": "Analytics & Statistics",
  "stats.subtitle": "System overview and performance metrics",
  "stats.loading": "Loading statistics...",
  "stats.backToDashboard": "Back to Dashboard",
  "stats.metric.totalDonors": "Total Donors",
  "stats.metric.totalPatients": "Total Patients",
  "stats.metric.completedAppointments": "Completed Appointments",
  "stats.metric.completionRate": "Completion Rate",
  "stats.metric.activeDonorsInSystem": "Active donors in system",
  "stats.metric.registeredPatients": "Registered patients",
  "stats.metric.successfullyCompleted": "Successfully completed",
  "stats.metric.ofTotalAppointments": "Of total appointments",
  "stats.section.appointmentOverview": "Appointment Status Overview",
  "stats.section.scheduledAccepted": "Scheduled / Accepted",
  "stats.section.donatedPending": "Donated / Pending",
  "stats.section.completed": "Completed",
  "stats.section.bloodGroupDistribution": "Blood Group Distribution",
  "stats.section.thirtyDayTrend": "30-Day Trend",
  "stats.section.completionPipeline": "Completion Pipeline",
  "stats.section.donorCohorts": "Donor Cohorts",
  "stats.section.patientCohorts": "Patient Cohorts",
  "stats.section.bloodGroupSupplyDemand": "Blood Group Supply & Demand",
  "stats.trend.totalAppointments": "Total Appointments",
  "stats.pipeline.dropOff": "Drop-off",
  "stats.kpi.atRiskDonors": "At-Risk Donors",
  "stats.table.active": "Active",
  "stats.supplyStatus.shortage": "Supply shortage",
  "stats.supplyStatus.tight": "Tight supply",
  "stats.supplyStatus.healthy": "Healthy supply",
  "stats.table.bloodGroup": "Blood Group",
  "stats.table.availableDonors": "Available Donors",
  "stats.table.registeredPatients": "Registered Patients",
  "stats.table.ratio": "Ratio",
  "stats.section.advancedAnalytics": "Advanced Analytics",
  "stats.footer.note":
    "📊 More advanced analytics and ML insights coming soon. This dashboard will help optimize blood donation cycles.",

  "health.loading": "Loading operations health...",
  "health.title": "Operations Health Panel",
  "health.subtitle":
    "Quick visibility of mapping, assignment, and risk signals.",
  "health.metric.approvedMappings": "Approved Mappings",
  "health.metric.pendingMappings": "Pending Mappings",
  "health.metric.unassignedAppointments": "Unassigned Appointments",
  "health.metric.incompatibleAttempts": "Incompatible Link Attempts",
  "health.metric.incompatibleAttemptsNA":
    "Run operational_events.sql to enable tracking",
  "health.metric.incompatibleAttemptsLogged": "Logged from mapping workflow",
  "health.queue.patientsNeedPool": "Patients need donor pool",
  "health.queue.donorsNeedPool": "Donors need patient pool",
  "health.queue.appointmentsNeedDonor": "Appointments need donor",
  "health.queue.assignMappings": "Assign in Mappings",
  "health.queue.mapDonorPatient": "Map donor-patient",
  "health.queue.openMasterSchedule": "Open master schedule",
  "health.queue.title": "Action Queue",
};

const HINDI_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "language.label": "भाषा",
  "language.english": "अंग्रेज़ी",
  "language.hindi": "हिन्दी",

  "dashboard.loading": "ऑपरेशनल हब सिंक हो रहा है...",
  "dashboard.nav.dashboard": "डैशबोर्ड",
  "dashboard.nav.directory": "डायरेक्टरी",
  "dashboard.nav.analytics": "एनालिटिक्स",
  "dashboard.nav.health": "हेल्थ",
  "dashboard.stats.recipientsToday": "आज के प्राप्तकर्ता",
  "dashboard.stats.activeDonors": "सक्रिय डोनर",
  "dashboard.stats.upcomingPipeline": "आने वाली पाइपलाइन",
  "dashboard.queue.title": "एक्शन क्यू",
  "dashboard.queue.viewHealth": "पूरा हेल्थ पैनल देखें",
  "dashboard.queue.needAssignment": "अपॉइंटमेंट को डोनर असाइन करना बाकी है",
  "dashboard.queue.needPatientPool": "मरीजों को डोनर समूह चाहिए",
  "dashboard.queue.needDonorPool": "डोनर्स को मरीज समूह चाहिए",
  "dashboard.queue.openCalendar": "कैलेंडर खोलें",
  "dashboard.queue.assignMappings": "मैपिंग में असाइन करें",
  "dashboard.queue.mapDonorPatient": "डोनर-मरीज मैप करें",

  "directory.title": "डायरेक्टरी",
  "directory.subtitle": "सभी डोनर, मरीज और अपॉइंटमेंट देखें",
  "directory.tab.donors": "डोनर",
  "directory.tab.patients": "मरीज",
  "directory.tab.appointments": "अपॉइंटमेंट",
  "directory.tab.mappings": "मैपिंग",
  "directory.searchPlaceholder":
    "नाम, ब्लड ग्रुप, फोन, तारीख या स्टेटस से खोजें...",
  "directory.loading": "डायरेक्टरी लोड हो रही है...",
  "directory.emptyDonors": "कोई डोनर नहीं मिला",
  "directory.emptyPatients": "कोई मरीज नहीं मिला",
  "directory.nav.home": "होम",
  "directory.appt.card.patientLabel": "मरीज",
  "directory.appt.card.donorLabel": "डोनर",
  "directory.appt.card.unassignedDonor": "(असाइन नहीं)",
  "directory.appt.card.arrivalLabel": "आगमन:",
  "directory.appt.status.scheduled": "निर्धारित",
  "directory.appt.status.accepted": "स्वीकार",
  "directory.appt.status.declined": "अस्वीकार",
  "directory.appt.status.donated": "दान किया गया",
  "directory.appt.status.completed": "पूर्ण",
  "directory.cards.availableTag": "उपलब्ध",
  "directory.cards.unavailableTag": "अनुपलब्ध",
  "directory.cards.activeTag": "सक्रिय",
  "directory.cards.callAction": "कॉल",
  "directory.cards.viewDetailsAction": "विवरण देखें",
  "directory.cards.notAvailable": "उपलब्ध नहीं",
  "directory.mappings.title": "डोनर को मरीज से लिंक करें",
  "directory.mappings.subtitle":
    "केवल मंजूर लिंक ही अपॉइंटमेंट असाइनमेंट के लिए योग्य हैं।",
  "directory.mappings.selectPatient": "मरीज चुनें",
  "directory.mappings.searchPatientPlaceholder":
    "नाम, ग्रुप, फोन से मरीज खोजें",
  "directory.mappings.noPatientMatches": "कोई मरीज मेल नहीं मिला",
  "directory.mappings.selectDonor": "डोनर चुनें",
  "directory.mappings.searchDonorPlaceholder": "नाम, ग्रुप, फोन से डोनर खोजें",
  "directory.mappings.noDonorMatches": "कोई डोनर मेल नहीं मिला",
  "directory.mappings.saveApprovedLink": "स्वीकृत लिंक सेव करें",
  "directory.mappings.linkAlreadyApproved": "लिंक पहले से स्वीकृत है",
  "directory.mappings.linkAlreadyApprovedDesc":
    "यह डोनर इस मरीज के लिए पहले से लिंक और स्वीकृत है।",
  "directory.mappings.noteManualVerification":
    "नोट: ABO/Rh केवल बेसलाइन है। अंतिम मैपिंग मैनुअल ब्लड टेस्ट सत्यापन पर आधारित होनी चाहिए।",
  "directory.mappings.noLinksFound": "कोई डोनर-मरीज लिंक नहीं मिला",
  "directory.mappings.patientBloodGroup": "मरीज ब्लड ग्रुप",
  "directory.mappings.links": "लिंक",
  "directory.mappings.unknownDonor": "अज्ञात डोनर",
  "directory.mappings.setInactive": "इनएक्टिव करें",
  "directory.mappings.compatibilityUnknownTitle":
    "संगतता का मूल्यांकन नहीं हो सका",
  "directory.mappings.compatibilityUnknownDetail":
    "ब्लड ग्रुप फॉर्मेट गलत है या उपलब्ध नहीं है।",
  "directory.mappings.compatibilityOkTitle": "ABO/Rh संगत",
  "directory.mappings.compatibilityBadTitle": "ABO/Rh असंगत",
  "directory.mappings.compatibilityOkDetailStart": "डोनर",
  "directory.mappings.compatibilityOkDetailMiddle": "मरीज को दान कर सकता है",
  "directory.mappings.compatibilityBadDetailStart": "डोनर",
  "directory.mappings.compatibilityBadDetailMiddle":
    "को मरीज से लिंक नहीं करना चाहिए",
  "directory.mappings.errorUnknown": "अज्ञात लिंक त्रुटि।",
  "directory.mappings.errorTableMissing":
    "patient_donor_links टेबल नहीं मिली। पहले SQL माइग्रेशन चलाएं।",
  "directory.mappings.errorPermissionDenied":
    "patient_donor_links के लिए RLS/policies द्वारा अनुमति नहीं है।",
  "directory.mappings.errorOperationFailed": "ऑपरेशन विफल रहा।",
  "directory.mappings.cannotSavePrefix": "लिंक सेव नहीं हो सकता:",
  "directory.mappings.cannotSaveSuffix": "कृपया ABO/Rh संगत जोड़ी चुनें।",
  "directory.mappings.duplicateApprovedLink":
    "यह डोनर-मरीज लिंक पहले से स्वीकृत है। डुप्लिकेट लिंक सेव नहीं किया गया।",
  "directory.mappings.errorUpdateStatusPrefix":
    "लिंक स्थिति अपडेट नहीं हो सकी:",
  "directory.mappings.errorCreateLinkPrefix": "लिंक बनाया नहीं जा सका:",
  "directory.mappings.linkSavedSuccess": "लिंक सफलतापूर्वक सेव हुआ।",
  "directory.mappings.errorDeactivatePrefix": "लिंक निष्क्रिय नहीं हो सका:",
  "directory.mappings.linkSetInactiveSuccess": "लिंक को इनएक्टिव कर दिया गया।",
  "directory.mappings.statusApproved": "स्वीकृत",
  "directory.mappings.statusInactive": "निष्क्रिय",
  "directory.mappings.statusPending": "लंबित",

  "stats.title": "एनालिटिक्स और स्टैटिस्टिक्स",
  "stats.subtitle": "सिस्टम ओवरव्यू और परफॉर्मेंस मेट्रिक्स",
  "stats.loading": "स्टैटिस्टिक्स लोड हो रहे हैं...",
  "stats.backToDashboard": "डैशबोर्ड पर वापस जाएं",
  "stats.metric.totalDonors": "कुल डोनर",
  "stats.metric.totalPatients": "कुल मरीज",
  "stats.metric.completedAppointments": "पूर्ण अपॉइंटमेंट",
  "stats.metric.completionRate": "कम्प्लीशन रेट",
  "stats.metric.activeDonorsInSystem": "सिस्टम में सक्रिय डोनर",
  "stats.metric.registeredPatients": "रजिस्टर्ड मरीज",
  "stats.metric.successfullyCompleted": "सफलतापूर्वक पूर्ण",
  "stats.metric.ofTotalAppointments": "कुल अपॉइंटमेंट में से",
  "stats.section.appointmentOverview": "अपॉइंटमेंट स्थिति अवलोकन",
  "stats.section.scheduledAccepted": "निर्धारित / स्वीकार",
  "stats.section.donatedPending": "दान किया गया / लंबित",
  "stats.section.completed": "पूर्ण",
  "stats.section.bloodGroupDistribution": "रक्त समूह वितरण",
  "stats.section.thirtyDayTrend": "पिछले 30 दिनों का रुझान",
  "stats.section.completionPipeline": "कम्प्लीशन पाइपलाइन",
  "stats.section.donorCohorts": "डोनर समूह",
  "stats.section.patientCohorts": "मरीज समूह",
  "stats.section.bloodGroupSupplyDemand": "रक्त समूह सप्लाई और डिमांड",
  "stats.trend.totalAppointments": "कुल अपॉइंटमेंट",
  "stats.pipeline.dropOff": "ड्रॉप-ऑफ",
  "stats.kpi.atRiskDonors": "जोखिम वाले डोनर",
  "stats.table.active": "सक्रिय",
  "stats.supplyStatus.shortage": "सप्लाई की कमी",
  "stats.supplyStatus.tight": "सीमित सप्लाई",
  "stats.supplyStatus.healthy": "स्वस्थ सप्लाई",
  "stats.table.bloodGroup": "रक्त समूह",
  "stats.table.availableDonors": "उपलब्ध डोनर",
  "stats.table.registeredPatients": "पंजीकृत मरीज",
  "stats.table.ratio": "अनुपात",
  "stats.section.advancedAnalytics": "उन्नत विश्लेषण",
  "stats.footer.note":
    "📊 अधिक उन्नत एनालिटिक्स और ML इनसाइट्स जल्द आ रहे हैं। यह डैशबोर्ड रक्तदान चक्रों को अनुकूलित करने में मदद करेगा।",

  "health.loading": "ऑपरेशन हेल्थ लोड हो रहा है...",
  "health.title": "ऑपरेशंस हेल्थ पैनल",
  "health.subtitle": "मैपिंग, असाइनमेंट और रिस्क संकेतों की त्वरित जानकारी।",
  "health.metric.approvedMappings": "स्वीकृत मैपिंग",
  "health.metric.pendingMappings": "लंबित मैपिंग",
  "health.metric.unassignedAppointments": "अनअसाइन्ड अपॉइंटमेंट",
  "health.metric.incompatibleAttempts": "असंगत लिंक प्रयास",
  "health.metric.incompatibleAttemptsNA":
    "ट्रैकिंग चालू करने के लिए operational_events.sql चलाएं",
  "health.metric.incompatibleAttemptsLogged":
    "मैपिंग वर्कफ़्लो से लॉग किया गया",
  "health.queue.patientsNeedPool": "मरीजों को डोनर समूह चाहिए",
  "health.queue.donorsNeedPool": "डोनर्स को मरीज समूह चाहिए",
  "health.queue.appointmentsNeedDonor": "अपॉइंटमेंट को डोनर चाहिए",
  "health.queue.assignMappings": "मैपिंग में असाइन करें",
  "health.queue.mapDonorPatient": "डोनर-मरीज मैप करें",
  "health.queue.openMasterSchedule": "मास्टर शेड्यूल खोलें",
  "health.queue.title": "एक्शन क्यू",
};

const MARATHI_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "language.label": "भाषा",
  "language.english": "इंग्रजी",
  "language.hindi": "हिंदी",

  "dashboard.loading": "ऑपरेशनल हब सिंक होत आहे...",
  "dashboard.nav.dashboard": "डॅशबोर्ड",
  "dashboard.nav.directory": "डिरेक्टरी",
  "dashboard.nav.analytics": "अॅनालिटिक्स",
  "dashboard.nav.health": "हेल्थ",
  "dashboard.stats.recipientsToday": "आजचे प्राप्तकर्ते",
  "dashboard.stats.activeDonors": "सक्रिय दाते",
  "dashboard.stats.upcomingPipeline": "आगामी पाइपलाइन",
  "dashboard.queue.title": "अॅक्शन क्यू",
  "dashboard.queue.viewHealth": "पूर्ण हेल्थ पॅनल पहा",
  "dashboard.queue.needAssignment": "अपॉइंटमेंटसाठी दाता नेमणे बाकी आहे",
  "dashboard.queue.needPatientPool": "रुग्णांना दाता गट आवश्यक",
  "dashboard.queue.needDonorPool": "दात्यांना रुग्ण गट आवश्यक",
  "dashboard.queue.openCalendar": "कॅलेंडर उघडा",
  "dashboard.queue.assignMappings": "मॅपिंगमध्ये नेमणूक करा",
  "dashboard.queue.mapDonorPatient": "दाता-रुग्ण मॅप करा",

  "directory.title": "डिरेक्टरी",
  "directory.subtitle": "सर्व दाते, रुग्ण आणि अपॉइंटमेंट पहा",
  "directory.tab.donors": "दाते",
  "directory.tab.patients": "रुग्ण",
  "directory.tab.appointments": "अपॉइंटमेंट",
  "directory.tab.mappings": "मॅपिंग",
  "directory.searchPlaceholder":
    "नाव, रक्तगट, फोन, तारीख किंवा स्थितीने शोधा...",
  "directory.loading": "डिरेक्टरी लोड होत आहे...",
  "directory.emptyDonors": "कोणतेही दाते सापडले नाहीत",
  "directory.emptyPatients": "कोणतेही रुग्ण सापडले नाहीत",
  "directory.nav.home": "होम",
  "directory.appt.card.patientLabel": "रुग्ण",
  "directory.appt.card.donorLabel": "दाता",
  "directory.appt.card.unassignedDonor": "(नेमलेला नाही)",
  "directory.appt.card.arrivalLabel": "आगमन:",
  "directory.appt.status.scheduled": "नियोजित",
  "directory.appt.status.accepted": "स्वीकारले",
  "directory.appt.status.declined": "नाकारले",
  "directory.appt.status.donated": "दान झाले",
  "directory.appt.status.completed": "पूर्ण",
  "directory.cards.availableTag": "उपलब्ध",
  "directory.cards.unavailableTag": "अनुपलब्ध",
  "directory.cards.activeTag": "सक्रिय",
  "directory.cards.callAction": "कॉल",
  "directory.cards.viewDetailsAction": "तपशील पहा",
  "directory.cards.notAvailable": "उपलब्ध नाही",
  "directory.mappings.title": "दाता आणि रुग्ण लिंक करा",
  "directory.mappings.subtitle":
    "फक्त मंजूर लिंक अपॉइंटमेंट नेमणुकीसाठी पात्र असतात.",
  "directory.mappings.selectPatient": "रुग्ण निवडा",
  "directory.mappings.searchPatientPlaceholder": "नाव, गट, फोनने रुग्ण शोधा",
  "directory.mappings.noPatientMatches": "जुळणारे रुग्ण नाहीत",
  "directory.mappings.selectDonor": "दाता निवडा",
  "directory.mappings.searchDonorPlaceholder": "नाव, गट, फोनने दाता शोधा",
  "directory.mappings.noDonorMatches": "जुळणारे दाते नाहीत",
  "directory.mappings.saveApprovedLink": "मंजूर लिंक जतन करा",
  "directory.mappings.linkAlreadyApproved": "लिंक आधीच मंजूर आहे",
  "directory.mappings.linkAlreadyApprovedDesc":
    "हा दाता या रुग्णासाठी आधीच लिंक आणि मंजूर आहे.",
  "directory.mappings.noteManualVerification":
    "टीप: ABO/Rh हा फक्त प्राथमिक आधार आहे. अंतिम मॅपिंग मॅन्युअल रक्तचाचणी पडताळणीवर आधारित असावी.",
  "directory.mappings.noLinksFound": "दाता-रुग्ण लिंक आढळल्या नाहीत",
  "directory.mappings.patientBloodGroup": "रुग्ण रक्तगट",
  "directory.mappings.links": "लिंक",
  "directory.mappings.unknownDonor": "अज्ञात दाता",
  "directory.mappings.setInactive": "निष्क्रिय करा",
  "directory.mappings.compatibilityUnknownTitle": "सुसंगतता तपासता आली नाही",
  "directory.mappings.compatibilityUnknownDetail":
    "रक्तगट फॉर्मॅट चुकीचा आहे किंवा उपलब्ध नाही.",
  "directory.mappings.compatibilityOkTitle": "ABO/Rh सुसंगत",
  "directory.mappings.compatibilityBadTitle": "ABO/Rh असुसंगत",
  "directory.mappings.compatibilityOkDetailStart": "दाता",
  "directory.mappings.compatibilityOkDetailMiddle": "रुग्णाला रक्तदान करू शकतो",
  "directory.mappings.compatibilityBadDetailStart": "दाता",
  "directory.mappings.compatibilityBadDetailMiddle": "ला रुग्णाशी लिंक करू नये",
  "directory.mappings.errorUnknown": "अज्ञात लिंक त्रुटी.",
  "directory.mappings.errorTableMissing":
    "patient_donor_links तक्ता उपलब्ध नाही. आधी SQL माइग्रेशन चालवा.",
  "directory.mappings.errorPermissionDenied":
    "patient_donor_links साठी RLS/policies परवानगी नाकारते.",
  "directory.mappings.errorOperationFailed": "ऑपरेशन अयशस्वी झाले.",
  "directory.mappings.cannotSavePrefix": "लिंक जतन होऊ शकत नाही:",
  "directory.mappings.cannotSaveSuffix": "कृपया ABO/Rh सुसंगत जोडी निवडा.",
  "directory.mappings.duplicateApprovedLink":
    "ही दाता-रुग्ण लिंक आधीच मंजूर आहे. डुप्लिकेट लिंक जतन केली नाही.",
  "directory.mappings.errorUpdateStatusPrefix":
    "लिंक स्थिती अपडेट करता आली नाही:",
  "directory.mappings.errorCreateLinkPrefix": "लिंक तयार करता आली नाही:",
  "directory.mappings.linkSavedSuccess": "लिंक यशस्वीरित्या जतन झाली.",
  "directory.mappings.errorDeactivatePrefix": "लिंक निष्क्रिय करता आली नाही:",
  "directory.mappings.linkSetInactiveSuccess": "लिंक निष्क्रिय केली.",
  "directory.mappings.statusApproved": "मंजूर",
  "directory.mappings.statusInactive": "निष्क्रिय",
  "directory.mappings.statusPending": "प्रलंबित",

  "stats.title": "विश्लेषण आणि सांख्यिकी",
  "stats.subtitle": "प्रणालीचा आढावा आणि कार्यक्षमता मोजमाप",
  "stats.loading": "आकडेवारी लोड होत आहे...",
  "stats.backToDashboard": "डॅशबोर्डवर परत जा",
  "stats.metric.totalDonors": "एकूण दाते",
  "stats.metric.totalPatients": "एकूण रुग्ण",
  "stats.metric.completedAppointments": "पूर्ण झालेल्या अपॉइंटमेंट",
  "stats.metric.completionRate": "पूर्णता टक्का",
  "stats.metric.activeDonorsInSystem": "सिस्टममधील सक्रिय दाते",
  "stats.metric.registeredPatients": "नोंदणीकृत रुग्ण",
  "stats.metric.successfullyCompleted": "यशस्वीरीत्या पूर्ण",
  "stats.metric.ofTotalAppointments": "एकूण अपॉइंटमेंटपैकी",
  "stats.section.appointmentOverview": "अपॉइंटमेंट स्थितीचा आढावा",
  "stats.section.scheduledAccepted": "नियोजित / स्वीकारले",
  "stats.section.donatedPending": "दान केले / प्रलंबित",
  "stats.section.completed": "पूर्ण",
  "stats.section.bloodGroupDistribution": "रक्तगट वितरण",
  "stats.section.thirtyDayTrend": "मागील 30 दिवसांचा ट्रेंड",
  "stats.section.completionPipeline": "पूर्णता पाइपलाइन",
  "stats.section.donorCohorts": "दाता गट",
  "stats.section.patientCohorts": "रुग्ण गट",
  "stats.section.bloodGroupSupplyDemand": "रक्तगट पुरवठा व मागणी",
  "stats.trend.totalAppointments": "एकूण अपॉइंटमेंट",
  "stats.pipeline.dropOff": "ड्रॉप-ऑफ",
  "stats.kpi.atRiskDonors": "जोखीमग्रस्त दाते",
  "stats.table.active": "सक्रिय",
  "stats.supplyStatus.shortage": "पुरवठा कमी",
  "stats.supplyStatus.tight": "मर्यादित पुरवठा",
  "stats.supplyStatus.healthy": "आरोग्यदायी पुरवठा",
  "stats.table.bloodGroup": "रक्तगट",
  "stats.table.availableDonors": "उपलब्ध दाते",
  "stats.table.registeredPatients": "नोंदणीकृत रुग्ण",
  "stats.table.ratio": "गुणोत्तर",
  "stats.section.advancedAnalytics": "प्रगत विश्लेषण",
  "stats.footer.note":
    "📊 अधिक प्रगत विश्लेषण आणि ML इनसाइट्स लवकरच येत आहेत. हा डॅशबोर्ड रक्तदान चक्र अनुकूल करण्यात मदत करेल.",

  "health.loading": "ऑपरेशन्स हेल्थ लोड होत आहे...",
  "health.title": "ऑपरेशन्स हेल्थ पॅनल",
  "health.subtitle": "मॅपिंग, नेमणूक आणि जोखीम संकेतांची त्वरित माहिती.",
  "health.metric.approvedMappings": "मंजूर मॅपिंग",
  "health.metric.pendingMappings": "प्रलंबित मॅपिंग",
  "health.metric.unassignedAppointments": "नेमणूक नसलेल्या अपॉइंटमेंट",
  "health.metric.incompatibleAttempts": "असंगत लिंक प्रयत्न",
  "health.metric.incompatibleAttemptsNA":
    "ट्रॅकिंग सक्षम करण्यासाठी operational_events.sql चालवा",
  "health.metric.incompatibleAttemptsLogged": "मॅपिंग वर्कफ्लोमधून नोंदवलेले",
  "health.queue.patientsNeedPool": "रुग्णांना दाता गट आवश्यक",
  "health.queue.donorsNeedPool": "दात्यांना रुग्ण गट आवश्यक",
  "health.queue.appointmentsNeedDonor": "अपॉइंटमेंटसाठी दाता आवश्यक",
  "health.queue.assignMappings": "मॅपिंगमध्ये नेमणूक करा",
  "health.queue.mapDonorPatient": "दाता-रुग्ण मॅप करा",
  "health.queue.openMasterSchedule": "मास्टर शेड्यूल उघडा",
  "health.queue.title": "अॅक्शन क्यू",
};

const TAMIL_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "language.label": "மொழி",
  "language.english": "ஆங்கிலம்",
  "language.hindi": "இந்தி",

  "dashboard.loading": "செயல்பாட்டு மையம் ஒத்திசைக்கப்படுகிறது...",
  "dashboard.nav.dashboard": "டாஷ்போர்டு",
  "dashboard.nav.directory": "அடைவு",
  "dashboard.nav.analytics": "பகுப்பாய்வு",
  "dashboard.nav.health": "ஆரோக்கியம்",
  "dashboard.stats.recipientsToday": "இன்றைய பெறுநர்கள்",
  "dashboard.stats.activeDonors": "செயலில் உள்ள தானதாரர்கள்",
  "dashboard.stats.upcomingPipeline": "வரவிருக்கும் பைப்லைன்",
  "dashboard.queue.title": "செயல் வரிசை",
  "dashboard.queue.viewHealth": "முழு ஆரோக்கிய பலகையைப் பாருங்கள்",
  "dashboard.queue.needAssignment": "சந்திப்புகளுக்கு தானதாரரை ஒதுக்க வேண்டும்",
  "dashboard.queue.needPatientPool": "நோயாளிகளுக்கு தானதாரர் குழு தேவை",
  "dashboard.queue.needDonorPool": "தானதாரர்களுக்கு நோயாளர் குழு தேவை",
  "dashboard.queue.openCalendar": "காலெண்டரைத் திறக்கவும்",
  "dashboard.queue.assignMappings": "மேப்பிங்களில் ஒதுக்கவும்",
  "dashboard.queue.mapDonorPatient": "தானதாரர்-நோயாளர் மேப் செய்யவும்",

  "directory.title": "அடைவு",
  "directory.subtitle":
    "அனைத்து தானதாரர்கள், நோயாளிகள் மற்றும் சந்திப்புகளைப் பார்க்கவும்",
  "directory.tab.donors": "தானதாரர்கள்",
  "directory.tab.patients": "நோயாளிகள்",
  "directory.tab.appointments": "சந்திப்புகள்",
  "directory.tab.mappings": "மேப்பிங்கள்",
  "directory.searchPlaceholder":
    "பெயர், இரத்த வகை, தொலைபேசி, தேதி அல்லது நிலை மூலம் தேடவும்...",
  "directory.loading": "அடைவு ஏற்றப்படுகிறது...",
  "directory.emptyDonors": "தானதாரர்கள் இல்லை",
  "directory.emptyPatients": "நோயாளிகள் இல்லை",
  "directory.nav.home": "முகப்பு",
  "directory.appt.card.patientLabel": "நோயாளர்",
  "directory.appt.card.donorLabel": "தானதாரர்",
  "directory.appt.card.unassignedDonor": "(ஒதுக்கப்படவில்லை)",
  "directory.appt.card.arrivalLabel": "வருகை:",
  "directory.appt.status.scheduled": "அட்டவணை",
  "directory.appt.status.accepted": "ஏற்றுக்கொள்ளப்பட்டது",
  "directory.appt.status.declined": "நிராகரிக்கப்பட்டது",
  "directory.appt.status.donated": "தானம் செய்யப்பட்டது",
  "directory.appt.status.completed": "முடிந்தது",
  "directory.cards.availableTag": "உள்ளது",
  "directory.cards.unavailableTag": "இல்லை",
  "directory.cards.activeTag": "செயலில்",
  "directory.cards.callAction": "அழை",
  "directory.cards.viewDetailsAction": "விவரம் பார்க்க",
  "directory.cards.notAvailable": "கிடைக்கவில்லை",
  "directory.mappings.title": "தானதாரர்-நோயாளர் இணைப்புகள்",
  "directory.mappings.subtitle":
    "அங்கீகரிக்கப்பட்ட இணைப்புகள் மட்டுமே சந்திப்பு ஒதுக்கீட்டிற்கு தகுதியானவை.",
  "directory.mappings.selectPatient": "நோயாளியை தேர்ந்தெடுக்கவும்",
  "directory.mappings.searchPatientPlaceholder":
    "பெயர், வகை, தொலைபேசி மூலம் நோயாளியை தேடவும்",
  "directory.mappings.noPatientMatches": "பொருந்தும் நோயாளிகள் இல்லை",
  "directory.mappings.selectDonor": "தானதாரரை தேர்ந்தெடுக்கவும்",
  "directory.mappings.searchDonorPlaceholder":
    "பெயர், வகை, தொலைபேசி மூலம் தானதாரரை தேடவும்",
  "directory.mappings.noDonorMatches": "பொருந்தும் தானதாரர்கள் இல்லை",
  "directory.mappings.saveApprovedLink":
    "அங்கீகரிக்கப்பட்ட இணைப்பை சேமிக்கவும்",
  "directory.mappings.linkAlreadyApproved":
    "இணைப்பு ஏற்கனவே அங்கீகரிக்கப்பட்டது",
  "directory.mappings.linkAlreadyApprovedDesc":
    "இந்த தானதாரர் இந்த நோயாளிக்காக ஏற்கனவே இணைக்கப்பட்டு அங்கீகரிக்கப்பட்டுள்ளார்.",
  "directory.mappings.noteManualVerification":
    "குறிப்பு: ABO/Rh அடிப்படை குறியீடு மட்டுமே. இறுதி மேப்பிங் கையேடு இரத்த பரிசோதனை சரிபார்ப்பின் அடிப்படையில் இருக்க வேண்டும்.",
  "directory.mappings.noLinksFound": "தானதாரர்-நோயாளர் இணைப்புகள் இல்லை",
  "directory.mappings.patientBloodGroup": "நோயாளி இரத்த வகை",
  "directory.mappings.links": "இணைப்புகள்",
  "directory.mappings.unknownDonor": "அறியப்படாத தானதாரர்",
  "directory.mappings.setInactive": "செயலிழக்கச் செய்",
  "directory.mappings.compatibilityUnknownTitle":
    "பொருந்துதலை மதிப்பிட முடியவில்லை",
  "directory.mappings.compatibilityUnknownDetail":
    "இரத்த வகை வடிவம் தவறு அல்லது இல்லை.",
  "directory.mappings.compatibilityOkTitle": "ABO/Rh பொருந்தும்",
  "directory.mappings.compatibilityBadTitle": "ABO/Rh பொருந்தாது",
  "directory.mappings.compatibilityOkDetailStart": "தானதாரர்",
  "directory.mappings.compatibilityOkDetailMiddle":
    "நோயாளிக்கு தானம் செய்யலாம்",
  "directory.mappings.compatibilityBadDetailStart": "தானதாரர்",
  "directory.mappings.compatibilityBadDetailMiddle":
    "நோயாளியுடன் இணைக்கப்படக் கூடாது",
  "directory.mappings.errorUnknown": "அறியப்படாத இணைப்பு பிழை.",
  "directory.mappings.errorTableMissing":
    "patient_donor_links அட்டவணை இல்லை. முதலில் SQL மாற்றத்தை இயக்கவும்.",
  "directory.mappings.errorPermissionDenied":
    "patient_donor_links க்கு RLS/policies அனுமதி மறுக்கப்பட்டது.",
  "directory.mappings.errorOperationFailed": "செயல்பாடு தோல்வியடைந்தது.",
  "directory.mappings.cannotSavePrefix": "இணைப்பை சேமிக்க முடியவில்லை:",
  "directory.mappings.cannotSaveSuffix":
    "ABO/Rh பொருந்தும் ஜோடியை தேர்வு செய்யவும்.",
  "directory.mappings.duplicateApprovedLink":
    "இந்த தானதாரர்-நோயாளர் இணைப்பு ஏற்கனவே அங்கீகரிக்கப்பட்டது. நகல் இணைப்பு சேமிக்கப்படவில்லை.",
  "directory.mappings.errorUpdateStatusPrefix":
    "இணைப்பு நிலையை புதுப்பிக்க முடியவில்லை:",
  "directory.mappings.errorCreateLinkPrefix": "இணைப்பை உருவாக்க முடியவில்லை:",
  "directory.mappings.linkSavedSuccess": "இணைப்பு வெற்றிகரமாக சேமிக்கப்பட்டது.",
  "directory.mappings.errorDeactivatePrefix":
    "இணைப்பை செயலிழக்கச் செய்ய முடியவில்லை:",
  "directory.mappings.linkSetInactiveSuccess":
    "இணைப்பு செயலிழக்கச் செய்யப்பட்டது.",
  "directory.mappings.statusApproved": "அங்கீகரிக்கப்பட்டது",
  "directory.mappings.statusInactive": "செயலிழந்தது",
  "directory.mappings.statusPending": "நிலுவையில்",

  "stats.title": "பகுப்பாய்வு மற்றும் புள்ளிவிவரங்கள்",
  "stats.subtitle": "கணினி கண்ணோட்டம் மற்றும் செயல்திறன் அளவைகள்",
  "stats.loading": "புள்ளிவிவரங்கள் ஏற்றப்படுகிறது...",
  "stats.backToDashboard": "டாஷ்போர்டுக்கு திரும்பவும்",
  "stats.metric.totalDonors": "மொத்த தானதாரர்கள்",
  "stats.metric.totalPatients": "மொத்த நோயாளிகள்",
  "stats.metric.completedAppointments": "முடிந்த சந்திப்புகள்",
  "stats.metric.completionRate": "முடிவு விகிதம்",
  "stats.metric.activeDonorsInSystem": "அமைப்பில் செயலில் உள்ள தானதாரர்கள்",
  "stats.metric.registeredPatients": "பதிவுசெய்யப்பட்ட நோயாளிகள்",
  "stats.metric.successfullyCompleted": "வெற்றிகரமாக முடிந்தது",
  "stats.metric.ofTotalAppointments": "மொத்த சந்திப்புகளில்",
  "stats.section.appointmentOverview": "சந்திப்பு நிலை கண்ணோட்டம்",
  "stats.section.scheduledAccepted": "அட்டவணைப்படுத்தப்பட்டது / ஏற்கப்பட்டது",
  "stats.section.donatedPending": "தானம் / நிலுவை",
  "stats.section.completed": "முடிந்தது",
  "stats.section.bloodGroupDistribution": "இரத்த வகை விநியோகம்",
  "stats.section.thirtyDayTrend": "கடைசி 30 நாட்கள் போக்கு",
  "stats.section.completionPipeline": "முடிவு பைப் லைன்",
  "stats.section.donorCohorts": "தானதாரர் குழுக்கள்",
  "stats.section.patientCohorts": "நோயாளர் குழுக்கள்",
  "stats.section.bloodGroupSupplyDemand": "இரத்த வகை சப்ளை மற்றும் டிமாண்ட்",
  "stats.trend.totalAppointments": "மொத்த சந்திப்புகள்",
  "stats.pipeline.dropOff": "குறைவு விகிதம்",
  "stats.kpi.atRiskDonors": "ஆபத்து நிலையில் உள்ள தானதாரர்கள்",
  "stats.table.active": "செயலில்",
  "stats.supplyStatus.shortage": "சப்ளை குறைவு",
  "stats.supplyStatus.tight": "குறைந்த சப்ளை",
  "stats.supplyStatus.healthy": "நல்ல சப்ளை",
  "stats.table.bloodGroup": "இரத்த வகை",
  "stats.table.availableDonors": "கிடைக்கும் தானதாரர்கள்",
  "stats.table.registeredPatients": "பதிவுசெய்யப்பட்ட நோயாளிகள்",
  "stats.table.ratio": "விகிதம்",
  "stats.section.advancedAnalytics": "மேம்பட்ட பகுப்பாய்வு",
  "stats.footer.note":
    "📊 மேலும் மேம்பட்ட பகுப்பாய்வு மற்றும் ML உள்ளடக்கங்கள் விரைவில். இந்த டாஷ்போர்டு இரத்த தான சுழற்சியை மேம்படுத்த உதவும்.",

  "health.loading": "செயல்பாட்டு ஆரோக்கியம் ஏற்றப்படுகிறது...",
  "health.title": "செயல்பாட்டு ஆரோக்கிய பலகம்",
  "health.subtitle":
    "மேப்பிங், ஒதுக்கீடு மற்றும் அபாய சிக்னல்கள் பற்றிய விரைவு காட்சி.",
  "health.metric.approvedMappings": "அங்கீகரிக்கப்பட்ட மேப்பிங்கள்",
  "health.metric.pendingMappings": "நிலுவையில் உள்ள மேப்பிங்கள்",
  "health.metric.unassignedAppointments": "ஒதுக்கப்படாத சந்திப்புகள்",
  "health.metric.incompatibleAttempts": "பொருந்தாத இணைப்பு முயற்சிகள்",
  "health.metric.incompatibleAttemptsNA":
    "கண்காணிப்பை இயக்க operational_events.sql ஐ இயக்கவும்",
  "health.metric.incompatibleAttemptsLogged":
    "மேப்பிங் செயல்முறையிலிருந்து பதிவு செய்யப்பட்டது",
  "health.queue.patientsNeedPool": "நோயாளிகளுக்கு தானதாரர் குழு தேவை",
  "health.queue.donorsNeedPool": "தானதாரர்களுக்கு நோயாளர் குழு தேவை",
  "health.queue.appointmentsNeedDonor": "சந்திப்புகளுக்கு தானதாரர் தேவை",
  "health.queue.assignMappings": "மேப்பிங்களில் ஒதுக்கவும்",
  "health.queue.mapDonorPatient": "தானதாரர்-நோயாளர் மேப் செய்யவும்",
  "health.queue.openMasterSchedule": "மாஸ்டர் அட்டவணையைத் திறக்கவும்",
  "health.queue.title": "செயல் வரிசை",
};

const GUJARATI_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "language.label": "ભાષા",
  "language.english": "અંગ્રેજી",
  "language.hindi": "હિન્દી",

  "dashboard.loading": "ઓપરેશનલ હબ સિંક થઈ રહ્યું છે...",
  "dashboard.nav.dashboard": "ડેશબોર્ડ",
  "dashboard.nav.directory": "ડિરેક્ટરી",
  "dashboard.nav.analytics": "એનલિટિક્સ",
  "dashboard.nav.health": "હેલ્થ",
  "dashboard.stats.recipientsToday": "આજના રિસીપિયન્ટ્સ",
  "dashboard.stats.activeDonors": "સક્રિય દાતાઓ",
  "dashboard.stats.upcomingPipeline": "આગામી પાઇપલાઇન",
  "dashboard.queue.title": "ઍક્શન ક્યૂ",
  "dashboard.queue.viewHealth": "પૂર્ણ હેલ્થ પેનલ જુઓ",
  "dashboard.queue.needAssignment": "અપોઇન્ટમેન્ટ માટે દાતા સોંપવાનો બાકી છે",
  "dashboard.queue.needPatientPool": "રોગીઓને દાતા પૂલ જોઈએ",
  "dashboard.queue.needDonorPool": "દાતાઓને દર્દી પૂલ જોઈએ",
  "dashboard.queue.openCalendar": "કેલેન્ડર ખોલો",
  "dashboard.queue.assignMappings": "મૅપિંગમાં સોંપો",
  "dashboard.queue.mapDonorPatient": "દાતા-દર્દી મૅપ કરો",

  "directory.title": "ડિરેક્ટરી",
  "directory.subtitle": "બધા દાતાઓ, દર્દીઓ અને અપોઇન્ટમેન્ટ જુઓ",
  "directory.tab.donors": "દાતા",
  "directory.tab.patients": "દર્દી",
  "directory.tab.appointments": "અપોઇન્ટમેન્ટ",
  "directory.tab.mappings": "મૅપિંગ",
  "directory.searchPlaceholder":
    "નામ, બ્લડ ગ્રુપ, ફોન, તારીખ અથવા સ્થિતિથી શોધો...",
  "directory.loading": "ડિરેક્ટરી લોડ થઈ રહી છે...",
  "directory.emptyDonors": "કોઈ દાતા મળ્યા નથી",
  "directory.emptyPatients": "કોઈ દર્દી મળ્યા નથી",
  "directory.nav.home": "હોમ",
  "directory.appt.card.patientLabel": "દર્દી",
  "directory.appt.card.donorLabel": "દાતા",
  "directory.appt.card.unassignedDonor": "(સોંપાયેલ નથી)",
  "directory.appt.card.arrivalLabel": "આગમન:",
  "directory.appt.status.scheduled": "નિયોજિત",
  "directory.appt.status.accepted": "સ્વીકારેલ",
  "directory.appt.status.declined": "નકારેલ",
  "directory.appt.status.donated": "દાન થયું",
  "directory.appt.status.completed": "પૂર્ણ",
  "directory.cards.availableTag": "ઉપલબ્ધ",
  "directory.cards.unavailableTag": "અનુપલબ્ધ",
  "directory.cards.activeTag": "સક્રિય",
  "directory.cards.callAction": "કૉલ",
  "directory.cards.viewDetailsAction": "વિગતો જુઓ",
  "directory.cards.notAvailable": "ઉપલબ્ધ નથી",
  "directory.mappings.title": "દાતા-દર્દી લિંક્સ",
  "directory.mappings.subtitle":
    "ફક્ત મંજૂર લિંક્સ જ અપોઇન્ટમેન્ટ સોંપણી માટે પાત્ર છે.",
  "directory.mappings.selectPatient": "દર્દી પસંદ કરો",
  "directory.mappings.searchPatientPlaceholder": "નામ, ગ્રુપ, ફોનથી દર્દી શોધો",
  "directory.mappings.noPatientMatches": "મેળ ખાતા દર્દીઓ મળ્યા નથી",
  "directory.mappings.selectDonor": "દાતા પસંદ કરો",
  "directory.mappings.searchDonorPlaceholder": "નામ, ગ્રુપ, ફોનથી દાતા શોધો",
  "directory.mappings.noDonorMatches": "મેળ ખાતા દાતા મળ્યા નથી",
  "directory.mappings.saveApprovedLink": "મંજૂર લિંક સાચવો",
  "directory.mappings.linkAlreadyApproved": "લિંક પહેલેથી મંજૂર છે",
  "directory.mappings.linkAlreadyApprovedDesc":
    "આ દાતા આ દર્દી માટે પહેલેથી લિંક અને મંજૂર છે.",
  "directory.mappings.noteManualVerification":
    "નોંધ: ABO/Rh માત્ર આધારરેખા છે. અંતિમ મૅપિંગ મેન્યુઅલ બ્લડ ટેસ્ટ વેરિફિકેશન પર આધારિત હોવી જોઈએ.",
  "directory.mappings.noLinksFound": "દાતા-દર્દી લિંક્સ મળી નથી",
  "directory.mappings.patientBloodGroup": "દર્દી બ્લડ ગ્રુપ",
  "directory.mappings.links": "લિંક્સ",
  "directory.mappings.unknownDonor": "અજ્ઞાત દાતા",
  "directory.mappings.setInactive": "નિષ્ક્રિય કરો",
  "directory.mappings.compatibilityUnknownTitle":
    "સુસંગતતા મૂલ્યાંકન કરી શકાતું નથી",
  "directory.mappings.compatibilityUnknownDetail":
    "બ્લડ ગ્રુપ ફોર્મેટ અમાન્ય છે અથવા ગાયબ છે.",
  "directory.mappings.compatibilityOkTitle": "ABO/Rh સુસંગત",
  "directory.mappings.compatibilityBadTitle": "ABO/Rh અસંગત",
  "directory.mappings.compatibilityOkDetailStart": "દાતા",
  "directory.mappings.compatibilityOkDetailMiddle": "દર્દીને દાન આપી શકે છે",
  "directory.mappings.compatibilityBadDetailStart": "દાતા",
  "directory.mappings.compatibilityBadDetailMiddle":
    "ને દર્દી સાથે લિંક ન કરવો જોઈએ",
  "directory.mappings.errorUnknown": "અજ્ઞાત લિંક ભૂલ.",
  "directory.mappings.errorTableMissing":
    "patient_donor_links ટેબલ ગાયબ છે. પહેલા SQL માઇગ્રેશન ચલાવો.",
  "directory.mappings.errorPermissionDenied":
    "patient_donor_links માટે RLS/policies દ્વારા મંજૂરી નકારી દેવામાં આવી.",
  "directory.mappings.errorOperationFailed": "ઓપરેશન નિષ્ફળ ગયું.",
  "directory.mappings.cannotSavePrefix": "લિંક સાચવી શકાઈ નહીં:",
  "directory.mappings.cannotSaveSuffix":
    "કૃપા કરીને ABO/Rh સુસંગત જોડી પસંદ કરો.",
  "directory.mappings.duplicateApprovedLink":
    "આ દાતા-દર્દી લિંક પહેલેથી મંજૂર છે. ડુપ્લિકેટ લિંક સાચવાઈ નથી.",
  "directory.mappings.errorUpdateStatusPrefix":
    "લિંક સ્થિતિ અપડેટ કરી શકાઈ નથી:",
  "directory.mappings.errorCreateLinkPrefix": "લિંક બનાવી શકાઈ નથી:",
  "directory.mappings.linkSavedSuccess": "લિંક સફળતાપૂર્વક સાચવાઈ.",
  "directory.mappings.errorDeactivatePrefix": "લિંક નિષ્ક્રિય કરી શકાઈ નથી:",
  "directory.mappings.linkSetInactiveSuccess": "લિંક નિષ્ક્રિય રાખવામાં આવી.",
  "directory.mappings.statusApproved": "મંજૂર",
  "directory.mappings.statusInactive": "નિષ્ક્રિય",
  "directory.mappings.statusPending": "બાકી",

  "stats.title": "એનલિટિક્સ અને આંકડાશાસ્ત્ર",
  "stats.subtitle": "સિસ્ટમ ઓવરવ્યૂ અને કાર્યક્ષમતા મેટ્રિક્સ",
  "stats.loading": "આંકડાઓ લોડ થઈ રહ્યા છે...",
  "stats.backToDashboard": "ડેશબોર્ડ પર પાછા જાઓ",
  "stats.metric.totalDonors": "કુલ દાતા",
  "stats.metric.totalPatients": "કુલ દર્દી",
  "stats.metric.completedAppointments": "પૂર્ણ થયેલી અપોઇન્ટમેન્ટ",
  "stats.metric.completionRate": "પૂર્ણતા દર",
  "stats.metric.activeDonorsInSystem": "સિસ્ટમમાં સક્રિય દાતા",
  "stats.metric.registeredPatients": "નોંધાયેલા દર્દી",
  "stats.metric.successfullyCompleted": "સફળતાપૂર્વક પૂર્ણ",
  "stats.metric.ofTotalAppointments": "કુલ અપોઇન્ટમેન્ટમાંથી",
  "stats.section.appointmentOverview": "અપોઇન્ટમેન્ટ સ્થિતિ ઓવરવ્યૂ",
  "stats.section.scheduledAccepted": "શેડ્યૂલ / સ્વીકારેલ",
  "stats.section.donatedPending": "દાન થયું / બાકી",
  "stats.section.completed": "પૂર્ણ",
  "stats.section.bloodGroupDistribution": "બ્લડ ગ્રુપ વિતરણ",
  "stats.section.thirtyDayTrend": "છેલ્લા 30 દિવસનો ટ્રેન્ડ",
  "stats.section.completionPipeline": "પૂર્ણતા પાઇપલાઇન",
  "stats.section.donorCohorts": "દાતા જૂથો",
  "stats.section.patientCohorts": "દર્દી જૂથો",
  "stats.section.bloodGroupSupplyDemand": "બ્લડ ગ્રુપ સપ્લાય અને ડિમાન્ડ",
  "stats.trend.totalAppointments": "કુલ અપોઇન્ટમેન્ટ",
  "stats.pipeline.dropOff": "ડ્રોપ-ઓફ",
  "stats.kpi.atRiskDonors": "જોખમવાળા દાતા",
  "stats.table.active": "સક્રિય",
  "stats.supplyStatus.shortage": "સપ્લાયની અછત",
  "stats.supplyStatus.tight": "મર્યાદિત સપ્લાય",
  "stats.supplyStatus.healthy": "સ્વસ્થ સપ્લાય",
  "stats.table.bloodGroup": "બ્લડ ગ્રુપ",
  "stats.table.availableDonors": "ઉપલબ્ધ દાતા",
  "stats.table.registeredPatients": "નોંધાયેલા દર્દી",
  "stats.table.ratio": "અનુપાત",
  "stats.section.advancedAnalytics": "અદ્યતન વિશ્લેષણ",
  "stats.footer.note":
    "📊 વધુ અદ્યતન એનાલિટિક્સ અને ML ઇન્સાઇટ્સ જલ્દી આવી રહી છે. આ ડેશબોર્ડ રક્તદાન ચક્રને ઑપ્ટિમાઇઝ કરવામાં મદદ કરશે.",

  "health.loading": "ઓપરેશન્સ હેલ્થ લોડ થઈ રહ્યું છે...",
  "health.title": "ઓપરેશન્સ હેલ્થ પેનલ",
  "health.subtitle": "મૅપિંગ, સોંપણી અને જોખમ સંકેતોની ઝડપી દૃશ્યતા.",
  "health.metric.approvedMappings": "મંજૂર મૅપિંગ",
  "health.metric.pendingMappings": "બાકી મૅપિંગ",
  "health.metric.unassignedAppointments": "અસોંપાયેલ અપોઇન્ટમેન્ટ",
  "health.metric.incompatibleAttempts": "અસંગત લિંક પ્રયત્નો",
  "health.metric.incompatibleAttemptsNA":
    "ટ્રેકિંગ સક્ષમ કરવા operational_events.sql ચલાવો",
  "health.metric.incompatibleAttemptsLogged": "મૅપિંગ વર્કફ્લોથી લોગ થયેલ",
  "health.queue.patientsNeedPool": "રોગીઓને દાતા પૂલ જોઈએ",
  "health.queue.donorsNeedPool": "દાતાઓને દર્દી પૂલ જોઈએ",
  "health.queue.appointmentsNeedDonor": "અપોઇન્ટમેન્ટ માટે દાતા જરૂરી",
  "health.queue.assignMappings": "મૅપિંગમાં સોંપો",
  "health.queue.mapDonorPatient": "દાતા-દર્દી મૅપ કરો",
  "health.queue.openMasterSchedule": "માસ્ટર શેડ્યૂલ ખોલો",
  "health.queue.title": "ઍક્શન ક્યૂ",
};

const DICTIONARIES: Record<LanguageCode, Dictionary> = {
  en: ENGLISH_DICTIONARY,
  hi: HINDI_DICTIONARY,
  mr: MARATHI_DICTIONARY,
  ta: TAMIL_DICTIONARY,
  gu: GUJARATI_DICTIONARY,
};

function isLanguageCode(value: string | null): value is LanguageCode {
  return (
    value === "en" ||
    value === "hi" ||
    value === "mr" ||
    value === "ta" ||
    value === "gu"
  );
}

export function getStoredLanguage(): LanguageCode {
  if (!I18N_ENABLED || typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguageCode(stored)) {
    return stored;
  }

  return "en";
}

export function setStoredLanguage(language: LanguageCode) {
  if (!I18N_ENABLED || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}

export function translate(language: LanguageCode, key: string): string {
  const selected = DICTIONARIES[language];
  return selected[key] || ENGLISH_DICTIONARY[key] || key;
}

export function useI18n() {
  const [language, setLanguage] = useState<LanguageCode>("en");

  useEffect(() => {
    if (!I18N_ENABLED) {
      setLanguage("en");
      return;
    }

    const applyStoredLanguage = () => {
      const current = getStoredLanguage();
      setLanguage(current);
      document.documentElement.lang = current;
    };

    applyStoredLanguage();
    window.addEventListener("storage", applyStoredLanguage);
    window.addEventListener(LANGUAGE_EVENT, applyStoredLanguage);

    return () => {
      window.removeEventListener("storage", applyStoredLanguage);
      window.removeEventListener(LANGUAGE_EVENT, applyStoredLanguage);
    };
  }, []);

  const t = useMemo(() => {
    return (key: string) => translate(language, key);
  }, [language]);

  return { language, t, enabled: I18N_ENABLED };
}
