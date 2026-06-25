import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LanguageCode = "en" | "hi" | "mr" | "ta" | "gu";

type Dictionary = Record<string, string>;
const STORAGE_KEY = "mobile-app-language";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
};

export const SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; label: string }> =
  [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "mr", label: "मराठी" },
    { code: "ta", label: "தமிழ்" },
    { code: "gu", label: "ગુજરાતી" },
  ];

const ENGLISH_DICTIONARY: Dictionary = {
  "common.language": "Language",
  "common.continue": "Continue",
  "common.back": "Back",
  "common.error": "Error",
  "common.success": "Success",
  "common.na": "N/A",
  "common.chooseLanguageHint": "Tap to switch",
  "common.appearance": "Appearance",
  "common.themeLight": "Light",
  "common.themeDark": "Dark",
  "common.themeSystem": "System",

  "choose.heading": "Please click on the appropriate option,",
  "choose.subheading": "Choose your role to continue",
  "choose.donor": "Donor",
  "choose.patient": "Patient",
  "choose.signupHere": "Sign up here..",
  "choose.signUp": "Sign Up",
  "choose.alreadyRegistered": "Already Registered...?",
  "choose.login": "Log in",

  "login.welcome": "Welcome",
  "login.back": "Back!",
  "login.subtext": "Please enter your credentials.",
  "login.emailLabel": "Enter your Email",
  "login.passwordLabel": "Enter your Password",
  "login.emailPlaceholder": "Email",
  "login.passwordPlaceholder": "Password",
  "login.forgotPassword": "Forgot Password...?",
  "login.missingFieldsTitle": "Missing fields",
  "login.missingFieldsDesc": "Please enter both email and password.",
  "login.failedTitle": "Login failed",
  "login.userIdMissing": "User ID not found after authentication.",
  "login.successTitle": "Success",
  "login.successDesc": "Logged in successfully! Redirecting...",

  "signup.welcome": "Welcome to",
  "signup.appName": "RaktSetu!",
  "signup.asRole": "Signing up as a",
  "signup.fillDetails": "Fill in the details to create an account.",
  "signup.fullName": "Full Name",
  "signup.bloodGroup": "Blood Group",
  "signup.phone": "Phone",
  "signup.email": "Email",
  "signup.password": "Password",
  "signup.fullNamePlaceholder": "Enter your full name",
  "signup.bloodGroupPlaceholder": "Select blood group",
  "signup.phonePlaceholder": "Enter 10-digit mobile number",
  "signup.emailPlaceholder": "Enter your email",
  "signup.invalidPhone":
    "Phone number must be exactly 10 digits and must not include the India country code.",
  "signup.invalidEmail": "Please enter a valid email address.",
  "signup.fullNameRequired": "Please enter your full name.",
  "signup.bloodGroupRequired": "Please enter your blood group.",
  "signup.invalidBloodGroup": "Please select a valid blood group.",
  "signup.phoneRequired": "Please enter your phone number.",
  "signup.emailRequired": "Please enter your email.",
  "signup.passwordRequired": "Please enter a password.",
  "signup.passwordMinLength": "Password must be at least 6 characters.",
  "signup.phoneAlreadyUsed":
    "This phone number is already used by another account.",
  "signup.emailAlreadyRegistered":
    "This email is already registered. Please log in.",
  "signup.submitting": "Creating account...",
  "signup.passwordPlaceholder": "Create a password",
  "signup.missingInfoTitle": "Missing info",
  "signup.missingInfoDesc": "Please fill in all the fields.",
  "signup.failedTitle": "Signup failed",
  "signup.userMissing": "User object not created.",
  "signup.profileFailed": "Profile Setup Failed",
  "signup.successTitle": "Success",
  "signup.successDesc": "Account created! Check your email to verify.",

  "patientHome.hello": "Hello",
  "patientHome.userFallback": "User",
  "patientHome.active": "Active",
  "patientHome.bookNew": "Book New Appointment",
  "patientHome.unlinkedTitle": "No donor pool linked yet",
  "patientHome.unlinkedDesc":
    "Your profile is active, but no approved donor is linked yet. Please ask the blood bank admin to assign your dedicated donor pool.",
  "patientHome.tab.pool": "Linked Pool",
  "patientHome.tab.upcoming": "Upcoming",
  "patientHome.tab.history": "History",
  "patientHome.poolTitle": "Linked Donor Pool",
  "patientHome.noDonors": "No donors assigned",
  "patientHome.noDonorsHint": "Approved donor mappings will appear here",
  "patientHome.upcomingTitle": "Upcoming Appointments",
  "patientHome.noUpcoming": "No upcoming appointments",
  "patientHome.noUpcomingHint": "Book an appointment to get started",
  "patientHome.assignedDonor": "Assigned Donor",
  "patientHome.scheduled": "Scheduled:",
  "patientHome.waitingForAssignment": "Waiting for donor assignment",
  "patientHome.historyTitle": "Appointment History",
  "patientHome.noHistory": "No appointment history",
  "patientHome.donor": "Donor",
  "patientHome.status.waitingDonor": "Waiting for Donor",
  "patientHome.status.donorAccepted": "Donor Accepted",
  "patientHome.status.donorDeclined": "Donor Declined",
  "patientHome.status.completed": "Completed",

  "donorHome.successTitle": "Success",
  "donorHome.youHave": "You have",
  "donorHome.thisDonation": "this donation.",
  "donorHome.genericError": "Something went wrong. Please try again.",
  "donorHome.authError":
    "Authentication Error: Please log in to view your schedule.",
  "donorHome.profileError":
    "Database Error: Could not find linked donor profile.",
  "donorHome.fetchAppointmentsError": "Error fetching scheduled donations.",
  "donorHome.loading": "Loading your schedule...",
  "donorHome.welcomeBack": "Welcome Back,",
  "donorHome.bloodGroup": "Blood Group",
  "donorHome.totalDonations": "Total Donations",
  "donorHome.lastDonation": "Last Donation",
  "donorHome.unlinkedTitle": "No patient pool linked yet",
  "donorHome.unlinkedDesc":
    "You are not yet assigned to any patient pool. Please contact the blood bank admin to map you to approved thalassemia patients.",
  "donorHome.tab.pool": "Linked Pool",
  "donorHome.tab.upcoming": "Upcoming",
  "donorHome.tab.history": "History",
  "donorHome.poolTitle": "Linked Patient Pool",
  "donorHome.noPatientsAssigned":
    "No patients assigned. Approved mapped patients will appear here.",
  "donorHome.upcomingTitle": "Upcoming Donation Schedule",
  "donorHome.noUpcomingAppointments":
    "You have no assigned donation appointments. Thank you for your support!",
  "donorHome.assignedDate": "ASSIGNED DATE",
  "donorHome.patientAppointment": "Patient Appointment:",
  "donorHome.confirmDonate": "Will you be able to donate?",
  "donorHome.accept": "Accept",
  "donorHome.cancel": "Cancel",
  "donorHome.acceptedLabel": "You have accepted this appointment",
  "donorHome.rejectedLabel": "You cancelled this appointment",
  "donorHome.historyTitle": "Donation History",
  "donorHome.noHistory":
    "You haven't completed any donations yet. Your first donation will appear here!",
  "donorHome.donorFallback": "Donor",
  "donorHome.status.scheduled": "Scheduled",
  "donorHome.status.accepted": "Accepted",
  "donorHome.status.declined": "Declined",
  "donorHome.summary.linkedPatients": "Linked Patients",
  "donorHome.summary.upcoming": "Upcoming",
  "donorHome.leaderboardTitle": "📊 Leaderboard",
  "donorHome.yourRank": "Your Rank",
  "donorHome.noLeaderboard": "No leaderboard data available.",
  "donorHome.donations": "donations",
  "donorHome.tab.leaderboard": "🏆 Leaderboard",

  "book.mustBeLoggedIn": "You must be logged in to book an appointment.",
  "book.failedLoadPatient":
    "Failed to load patient data. Please try again later.",
  "book.patientNotLoaded": "Patient data not loaded.",
  "book.datePast": "Appointment date cannot be in the past.",
  "book.noPoolMappedTitle": "No donor pool linked",
  "book.noPoolMappedDesc":
    "You can book appointments only after at least one approved donor is mapped to your profile. Please contact the blood bank admin.",
  "book.noPoolMappedError":
    "Booking is blocked until an approved donor pool is linked to your profile.",
  "book.successPrefix": "Appointment booked successfully for",
  "book.failedBook": "Failed to book appointment. Please try again.",
  "book.fetchingPatient": "Fetching patient data...",
  "book.couldNotLoadProfile":
    "Could not load patient profile. Please make sure you are logged in.",
  "book.title": "Book Appointment",
  "book.welcome": "Welcome",
  "book.subtitle": "Schedule your next visit.",
  "book.patientName": "Patient Name",
  "book.bloodGroup": "Blood Group",
  "book.phone": "Phone",
  "book.appointmentDate": "Appointment Date",
  "book.booking": "Booking...",
  "book.bookAppointment": "Book Appointment",
  "book.ok": "OK",

  "modal.title": "Modal",
  "modal.info": "This is a modal screen.",

  "notFound.title": "Oops!",
  "notFound.message": "This screen doesn't exist.",
  "notFound.goHome": "Go to home screen!",
};

const HINDI_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "common.language": "भाषा",
  "common.continue": "जारी रखें",
  "common.back": "वापस",
  "common.error": "त्रुटि",
  "common.success": "सफलता",
  "common.na": "उपलब्ध नहीं",
  "common.chooseLanguageHint": "बदलने के लिए टैप करें",
  "common.appearance": "रूप",
  "common.themeLight": "लाइट",
  "common.themeDark": "डार्क",
  "common.themeSystem": "सिस्टम",

  "choose.heading": "कृपया सही विकल्प चुनें,",
  "choose.subheading": "जारी रखने के लिए अपनी भूमिका चुनें",
  "choose.donor": "डोनर",
  "choose.patient": "मरीज",
  "choose.signupHere": "यहां साइन अप करें..",
  "choose.signUp": "साइन अप",
  "choose.alreadyRegistered": "पहले से पंजीकृत...?",
  "choose.login": "लॉग इन",

  "login.welcome": "स्वागत है",
  "login.back": "वापस!",
  "login.subtext": "कृपया अपनी जानकारी दर्ज करें।",
  "login.emailLabel": "अपना ईमेल दर्ज करें",
  "login.passwordLabel": "अपना पासवर्ड दर्ज करें",
  "login.emailPlaceholder": "ईमेल",
  "login.passwordPlaceholder": "पासवर्ड",
  "login.forgotPassword": "पासवर्ड भूल गए...?",
  "login.missingFieldsTitle": "जानकारी अधूरी",
  "login.missingFieldsDesc": "कृपया ईमेल और पासवर्ड दोनों दर्ज करें।",
  "login.failedTitle": "लॉगिन विफल",
  "login.userIdMissing": "प्रमाणीकरण के बाद यूज़र आईडी नहीं मिली।",
  "login.successTitle": "सफलता",
  "login.successDesc": "लॉगिन सफल! रीडायरेक्ट कर रहे हैं...",

  "signup.welcome": "स्वागत है",
  "signup.appName": "RaktSetu!",
  "signup.asRole": "आप साइन अप कर रहे हैं",
  "signup.fillDetails": "खाता बनाने के लिए विवरण भरें।",
  "signup.fullName": "पूरा नाम",
  "signup.bloodGroup": "ब्लड ग्रुप",
  "signup.phone": "फोन",
  "signup.email": "ईमेल",
  "signup.password": "पासवर्ड",
  "signup.fullNamePlaceholder": "अपना पूरा नाम दर्ज करें",
  "signup.bloodGroupPlaceholder": "ब्लड ग्रुप चुनें",
  "signup.phonePlaceholder": "10 अंकों का मोबाइल नंबर दर्ज करें",
  "signup.emailPlaceholder": "अपना ईमेल दर्ज करें",
  "signup.invalidPhone":
    "फोन नंबर ठीक 10 अंकों का होना चाहिए और इसमें भारत का कंट्री कोड शामिल नहीं होना चाहिए।",
  "signup.invalidEmail": "कृपया सही ईमेल पता दर्ज करें।",
  "signup.fullNameRequired": "कृपया अपना पूरा नाम दर्ज करें।",
  "signup.bloodGroupRequired": "कृपया अपना ब्लड ग्रुप दर्ज करें।",
  "signup.invalidBloodGroup": "कृपया सही ब्लड ग्रुप चुनें।",
  "signup.phoneRequired": "कृपया अपना फोन नंबर दर्ज करें।",
  "signup.emailRequired": "कृपया अपना ईमेल दर्ज करें।",
  "signup.passwordRequired": "कृपया पासवर्ड दर्ज करें।",
  "signup.passwordMinLength": "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
  "signup.phoneAlreadyUsed":
    "यह फोन नंबर पहले से किसी और खाते में इस्तेमाल हो रहा है।",
  "signup.emailAlreadyRegistered":
    "यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें।",
  "signup.submitting": "खाता बनाया जा रहा है...",
  "signup.passwordPlaceholder": "पासवर्ड बनाएं",
  "signup.missingInfoTitle": "जानकारी अधूरी",
  "signup.missingInfoDesc": "कृपया सभी फ़ील्ड भरें।",
  "signup.failedTitle": "साइनअप विफल",
  "signup.userMissing": "यूज़र ऑब्जेक्ट नहीं बना।",
  "signup.profileFailed": "प्रोफाइल सेटअप विफल",
  "signup.successTitle": "सफलता",
  "signup.successDesc": "खाता बन गया! सत्यापन के लिए ईमेल देखें।",

  "patientHome.hello": "नमस्ते",
  "patientHome.userFallback": "यूज़र",
  "patientHome.active": "सक्रिय",
  "patientHome.bookNew": "नई अपॉइंटमेंट बुक करें",
  "patientHome.unlinkedTitle": "अभी कोई डोनर पूल लिंक नहीं है",
  "patientHome.unlinkedDesc":
    "आपकी प्रोफाइल सक्रिय है, लेकिन अभी कोई स्वीकृत डोनर लिंक नहीं है। कृपया ब्लड बैंक एडमिन से अपना डोनर पूल असाइन करने को कहें।",
  "patientHome.tab.pool": "लिंक्ड पूल",
  "patientHome.tab.upcoming": "आगामी",
  "patientHome.tab.history": "इतिहास",
  "patientHome.poolTitle": "लिंक्ड डोनर पूल",
  "patientHome.noDonors": "कोई डोनर असाइन नहीं",
  "patientHome.noDonorsHint": "स्वीकृत डोनर मैपिंग यहां दिखाई देंगी",
  "patientHome.upcomingTitle": "आगामी अपॉइंटमेंट",
  "patientHome.noUpcoming": "कोई आगामी अपॉइंटमेंट नहीं",
  "patientHome.noUpcomingHint": "शुरू करने के लिए अपॉइंटमेंट बुक करें",
  "patientHome.assignedDonor": "असाइन्ड डोनर",
  "patientHome.scheduled": "निर्धारित:",
  "patientHome.waitingForAssignment": "डोनर असाइनमेंट की प्रतीक्षा",
  "patientHome.historyTitle": "अपॉइंटमेंट इतिहास",
  "patientHome.noHistory": "कोई अपॉइंटमेंट इतिहास नहीं",
  "patientHome.donor": "डोनर",
  "patientHome.status.waitingDonor": "डोनर की प्रतीक्षा",
  "patientHome.status.donorAccepted": "डोनर ने स्वीकार किया",
  "patientHome.status.donorDeclined": "डोनर ने अस्वीकार किया",
  "patientHome.status.completed": "पूर्ण",

  "donorHome.successTitle": "सफलता",
  "donorHome.youHave": "आपने",
  "donorHome.thisDonation": "यह डोनेशन।",
  "donorHome.genericError": "कुछ गलत हुआ। कृपया फिर से प्रयास करें।",
  "donorHome.authError":
    "प्रमाणीकरण त्रुटि: अपना शेड्यूल देखने के लिए लॉग इन करें।",
  "donorHome.profileError": "डेटाबेस त्रुटि: लिंक्ड डोनर प्रोफाइल नहीं मिली।",
  "donorHome.fetchAppointmentsError": "शेड्यूल्ड डोनेशन लोड करने में त्रुटि।",
  "donorHome.loading": "आपका शेड्यूल लोड हो रहा है...",
  "donorHome.welcomeBack": "फिर से स्वागत है,",
  "donorHome.bloodGroup": "ब्लड ग्रुप",
  "donorHome.totalDonations": "कुल डोनेशन",
  "donorHome.lastDonation": "पिछला डोनेशन",
  "donorHome.unlinkedTitle": "अभी कोई पेशेंट पूल लिंक नहीं है",
  "donorHome.unlinkedDesc":
    "आप अभी किसी पेशेंट पूल से असाइन नहीं हैं। कृपया ब्लड बैंक एडमिन से आपको स्वीकृत थैलेसीमिया मरीजों से मैप करने को कहें।",
  "donorHome.tab.pool": "लिंक्ड पूल",
  "donorHome.tab.upcoming": "आगामी",
  "donorHome.tab.history": "इतिहास",
  "donorHome.poolTitle": "लिंक्ड पेशेंट पूल",
  "donorHome.noPatientsAssigned":
    "कोई मरीज असाइन नहीं। स्वीकृत मैप किए गए मरीज यहां दिखेंगे।",
  "donorHome.upcomingTitle": "आगामी डोनेशन शेड्यूल",
  "donorHome.noUpcomingAppointments":
    "आपके पास कोई असाइन डोनेशन अपॉइंटमेंट नहीं है। आपके सहयोग के लिए धन्यवाद!",
  "donorHome.assignedDate": "असाइन्ड दिनांक",
  "donorHome.patientAppointment": "मरीज अपॉइंटमेंट:",
  "donorHome.confirmDonate": "क्या आप डोनेट कर पाएंगे?",
  "donorHome.accept": "स्वीकार करें",
  "donorHome.cancel": "रद्द करें",
  "donorHome.acceptedLabel": "आपने यह अपॉइंटमेंट स्वीकार की है",
  "donorHome.rejectedLabel": "आपने यह अपॉइंटमेंट रद्द की है",
  "donorHome.historyTitle": "डोनेशन इतिहास",
  "donorHome.noHistory":
    "आपने अभी तक कोई डोनेशन पूर्ण नहीं किया। आपका पहला डोनेशन यहां दिखेगा!",
  "donorHome.donorFallback": "दाता",
  "donorHome.status.scheduled": "निर्धारित",
  "donorHome.status.accepted": "स्वीकृत",
  "donorHome.status.declined": "अस्वीकृत",
  "donorHome.summary.linkedPatients": "लिंक्ड मरीज",
  "donorHome.summary.upcoming": "आगामी",

  "book.mustBeLoggedIn": "अपॉइंटमेंट बुक करने के लिए लॉग इन आवश्यक है।",
  "book.failedLoadPatient":
    "मरीज डेटा लोड नहीं हो सका। कृपया बाद में प्रयास करें।",
  "book.patientNotLoaded": "मरीज डेटा लोड नहीं हुआ।",
  "book.datePast": "अपॉइंटमेंट की तारीख पिछली नहीं हो सकती।",
  "book.noPoolMappedTitle": "डोनर पूल लिंक नहीं है",
  "book.noPoolMappedDesc":
    "अपॉइंटमेंट बुक करने से पहले आपकी प्रोफाइल से कम से कम एक approved donor लिंक होना जरूरी है। कृपया blood bank admin से संपर्क करें।",
  "book.noPoolMappedError":
    "जब तक approved donor pool लिंक नहीं होगा, बुकिंग नहीं हो सकती।",
  "book.successPrefix": "अपॉइंटमेंट सफलतापूर्वक बुक हुई:",
  "book.failedBook": "अपॉइंटमेंट बुक नहीं हो सकी। कृपया फिर से प्रयास करें।",
  "book.fetchingPatient": "मरीज डेटा लोड हो रहा है...",
  "book.couldNotLoadProfile":
    "मरीज प्रोफाइल लोड नहीं हो सकी। कृपया सुनिश्चित करें कि आप लॉग इन हैं।",
  "book.title": "अपॉइंटमेंट बुक करें",
  "book.welcome": "स्वागत है",
  "book.subtitle": "अपनी अगली विज़िट शेड्यूल करें।",
  "book.patientName": "मरीज का नाम",
  "book.bloodGroup": "ब्लड ग्रुप",
  "book.phone": "फोन",
  "book.appointmentDate": "अपॉइंटमेंट तिथि",
  "book.booking": "बुक हो रही है...",
  "book.bookAppointment": "अपॉइंटमेंट बुक करें",
  "book.ok": "ठीक है",

  "modal.title": "मोडल",
  "modal.info": "यह एक मोडल स्क्रीन है।",

  "notFound.title": "ओह!",
  "notFound.message": "यह स्क्रीन मौजूद नहीं है।",
  "notFound.goHome": "होम स्क्रीन पर जाएं!",
};

const MARATHI_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "common.language": "भाषा",
  "common.appearance": "दिसणे",
  "common.themeLight": "लाईट",
  "common.themeDark": "डार्क",
  "common.themeSystem": "सिस्टम",
  "common.continue": "पुढे",
  "common.back": "मागे",
  "common.error": "त्रुटी",
  "common.success": "यश",
  "common.na": "उपलब्ध नाही",
  "common.chooseLanguageHint": "बदलण्यासाठी टॅप करा",
  "choose.heading": "कृपया योग्य पर्याय निवडा,",
  "choose.subheading": "पुढे जाण्यासाठी तुमची भूमिका निवडा",
  "patientHome.bookNew": "नवीन अपॉइंटमेंट बुक करा",
  "choose.donor": "दाता",
  "choose.patient": "रुग्ण",
  "choose.signUp": "साइन अप",
  "choose.login": "लॉग इन",
  "patientHome.unlinkedTitle": "अजून दाता पूल जोडलेला नाही",
  "patientHome.unlinkedDesc":
    "तुमची प्रोफाइल सक्रिय आहे, पण अजून मंजूर दाता जोडलेला नाही. कृपया ब्लड बँक प्रशासकाला तुमचा समर्पित दाता पूल नेमण्यास सांगा.",
  "patientHome.tab.pool": "जोडलेला पूल",
  "patientHome.tab.upcoming": "आगामी",
  "patientHome.tab.history": "इतिहास",
  "patientHome.poolTitle": "जोडलेला दाता पूल",
  "patientHome.noDonors": "कोणताही दाता नेमलेला नाही",
  "patientHome.noDonorsHint": "मंजूर दाता मॅपिंग येथे दिसतील",
  "patientHome.upcomingTitle": "आगामी अपॉइंटमेंट",
  "patientHome.noUpcoming": "आगामी अपॉइंटमेंट नाहीत",
  "patientHome.noUpcomingHint": "सुरुवात करण्यासाठी अपॉइंटमेंट बुक करा",
  "patientHome.assignedDonor": "नेमलेला दाता",
  "patientHome.scheduled": "नियोजित:",
  "patientHome.waitingForAssignment": "दाता नेमणुकीची प्रतीक्षा",
  "patientHome.historyTitle": "अपॉइंटमेंट इतिहास",
  "patientHome.noHistory": "अपॉइंटमेंट इतिहास नाही",
  "patientHome.donor": "दाता",
  "patientHome.status.waitingDonor": "दाता प्रतीक्षेत",
  "patientHome.status.donorAccepted": "दात्याने स्वीकारले",
  "patientHome.status.donorDeclined": "दात्याने नाकारले",
  "patientHome.status.completed": "पूर्ण",
  "donorHome.unlinkedTitle": "अजून रुग्ण पूल जोडलेला नाही",
  "donorHome.unlinkedDesc":
    "तुम्हाला अजून कोणत्याही रुग्ण पूलमध्ये नेमलेले नाही. कृपया ब्लड बँक प्रशासकाशी संपर्क साधा.",
  "donorHome.tab.pool": "जोडलेला पूल",
  "donorHome.tab.upcoming": "आगामी",
  "donorHome.tab.history": "इतिहास",
  "donorHome.poolTitle": "जोडलेला रुग्ण पूल",
  "donorHome.upcomingTitle": "आगामी दान वेळापत्रक",
  "donorHome.noPatientsAssigned":
    "कोणतेही रुग्ण नेमलेले नाहीत. मंजूर मॅप केलेले रुग्ण येथे दिसतील.",
  "donorHome.noUpcomingAppointments":
    "तुमच्याकडे कोणतीही नेमलेली दान अपॉइंटमेंट नाही.",
  "donorHome.assignedDate": "नेमलेली तारीख",
  "donorHome.patientAppointment": "रुग्ण अपॉइंटमेंट:",
  "donorHome.confirmDonate": "तुम्ही दान करू शकाल का?",
  "donorHome.accept": "स्वीकारा",
  "donorHome.cancel": "रद्द करा",
  "donorHome.acceptedLabel": "तुम्ही ही अपॉइंटमेंट स्वीकारली आहे",
  "donorHome.rejectedLabel": "तुम्ही ही अपॉइंटमेंट रद्द केली आहे",
  "donorHome.historyTitle": "दान इतिहास",
  "donorHome.noHistory": "अजून कोणताही दान इतिहास नाही",
  "donorHome.summary.linkedPatients": "जोडलेले रुग्ण",
  "donorHome.summary.upcoming": "आगामी",
  "book.mustBeLoggedIn": "अपॉइंटमेंट बुक करण्यासाठी लॉगिन आवश्यक आहे.",
  "book.failedLoadPatient":
    "रुग्णाची माहिती लोड करता आली नाही. कृपया नंतर पुन्हा प्रयत्न करा.",
  "book.patientNotLoaded": "रुग्णाची माहिती लोड झालेली नाही.",
  "book.datePast": "अपॉइंटमेंटची तारीख भूतकाळात असू शकत नाही.",
  "book.successPrefix": "अपॉइंटमेंट यशस्वीरित्या बुक झाली:",
  "book.failedBook": "अपॉइंटमेंट बुक करता आली नाही. कृपया पुन्हा प्रयत्न करा.",
  "book.fetchingPatient": "रुग्णाची माहिती मिळवत आहोत...",
  "book.couldNotLoadProfile":
    "रुग्ण प्रोफाइल लोड करता आले नाही. कृपया तुम्ही लॉगिन केले आहे याची खात्री करा.",
  "book.title": "अपॉइंटमेंट बुक करा",
  "book.welcome": "स्वागत",
  "book.subtitle": "तुमची पुढील भेट ठरवा.",
  "book.patientName": "रुग्णाचे नाव",
  "book.bloodGroup": "रक्तगट",
  "book.phone": "फोन",
  "book.appointmentDate": "अपॉइंटमेंट तारीख",
  "book.booking": "बुक करत आहोत...",
  "book.bookAppointment": "अपॉइंटमेंट बुक करा",
  "book.ok": "ठीक आहे",
  "notFound.title": "अरेरे!",
  "notFound.message": "ही स्क्रीन उपलब्ध नाही.",
  "notFound.goHome": "मुख्य स्क्रीनवर जा!",
};

const TAMIL_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "common.language": "மொழி",
  "common.appearance": "தோற்றம்",
  "common.themeLight": "ஒளி",
  "common.themeDark": "இருள்",
  "common.themeSystem": "சிஸ்டம்",
  "common.continue": "தொடரவும்",
  "common.back": "பின்",
  "common.error": "பிழை",
  "common.success": "வெற்றி",
  "common.na": "கிடைக்கவில்லை",
  "common.chooseLanguageHint": "மாற்ற தட்டவும்",
  "choose.heading": "சரியான விருப்பத்தை தேர்ந்தெடுக்கவும்,",
  "choose.subheading": "தொடர உங்கள் பாத்திரத்தை தேர்வு செய்யவும்",
  "patientHome.bookNew": "புதிய சந்திப்பை பதிவு செய்யவும்",
  "choose.donor": "தானதாரர்",
  "choose.patient": "நோயாளர்",
  "choose.signUp": "பதிவு செய்யவும்",
  "choose.login": "உள்நுழைக",
  "patientHome.unlinkedTitle": "இன்னும் தானதாரர் குழு இணைக்கப்படவில்லை",
  "patientHome.unlinkedDesc":
    "உங்கள் சுயவிவரம் செயலில் உள்ளது, ஆனால் அங்கீகரிக்கப்பட்ட தானதாரர் இன்னும் இணைக்கப்படவில்லை. உங்கள் அர்ப்பணிக்கப்பட்ட தானதாரர் குழுவை ஒதுக்க நிர்வாகியை தொடர்பு கொள்ளவும்.",
  "patientHome.tab.pool": "இணைக்கப்பட்ட குழு",
  "patientHome.tab.upcoming": "வரவிருப்பு",
  "patientHome.tab.history": "வரலாறு",
  "patientHome.poolTitle": "இணைக்கப்பட்ட தானதாரர் குழு",
  "patientHome.noDonors": "தானதாரர்கள் ஒதுக்கப்படவில்லை",
  "patientHome.noDonorsHint":
    "அங்கீகரிக்கப்பட்ட தானதாரர் இணைப்புகள் இங்கே தோன்றும்",
  "patientHome.upcomingTitle": "வரவிருக்கும் சந்திப்புகள்",
  "patientHome.noUpcoming": "வரவிருக்கும் சந்திப்புகள் இல்லை",
  "patientHome.noUpcomingHint": "தொடங்க ஒரு சந்திப்பை முன்பதிவு செய்யவும்",
  "patientHome.assignedDonor": "ஒதுக்கப்பட்ட தானதாரர்",
  "patientHome.scheduled": "அட்டவணை:",
  "patientHome.waitingForAssignment": "தானதாரர் ஒதுக்கீட்டை காத்திருக்கிறது",
  "patientHome.historyTitle": "சந்திப்பு வரலாறு",
  "patientHome.noHistory": "சந்திப்பு வரலாறு இல்லை",
  "patientHome.donor": "தானதாரர்",
  "patientHome.status.waitingDonor": "தானதாரரை காத்திருக்கிறது",
  "patientHome.status.donorAccepted": "தானதாரர் ஏற்றார்",
  "patientHome.status.donorDeclined": "தானதாரர் நிராகரித்தார்",
  "patientHome.status.completed": "முடிந்தது",
  "donorHome.unlinkedTitle": "இன்னும் நோயாளர் குழு இணைக்கப்படவில்லை",
  "donorHome.unlinkedDesc":
    "நீங்கள் இன்னும் எந்த நோயாளர் குழுவிற்கும் ஒதுக்கப்படவில்லை. நிர்வாகியை தொடர்பு கொண்டு உங்களை இணைக்கவும்.",
  "donorHome.tab.pool": "இணைக்கப்பட்ட குழு",
  "donorHome.tab.upcoming": "வரவிருப்பு",
  "donorHome.tab.history": "வரலாறு",
  "donorHome.poolTitle": "இணைக்கப்பட்ட நோயாளர் குழு",
  "donorHome.upcomingTitle": "வரவிருக்கும் தான அட்டவணை",
  "donorHome.noPatientsAssigned":
    "நோயாளிகள் ஒதுக்கப்படவில்லை. அங்கீகரிக்கப்பட்ட இணைப்புகள் இங்கே தோன்றும்.",
  "donorHome.noUpcomingAppointments":
    "உங்களுக்கு ஒதுக்கப்பட்ட தான அட்டவணைகள் இல்லை.",
  "donorHome.assignedDate": "ஒதுக்கப்பட்ட தேதி",
  "donorHome.patientAppointment": "நோயாளர் சந்திப்பு:",
  "donorHome.confirmDonate": "நீங்கள் தானம் செய்ய முடியுமா?",
  "donorHome.accept": "ஏற்கவும்",
  "donorHome.cancel": "ரத்து செய்",
  "donorHome.acceptedLabel": "இந்த சந்திப்பை நீங்கள் ஏற்றுள்ளீர்கள்",
  "donorHome.rejectedLabel": "இந்த சந்திப்பை நீங்கள் ரத்து செய்தீர்கள்",
  "donorHome.historyTitle": "தான வரலாறு",
  "donorHome.noHistory": "இன்னும் தான வரலாறு இல்லை",
  "donorHome.summary.linkedPatients": "இணைக்கப்பட்ட நோயாளிகள்",
  "donorHome.summary.upcoming": "வரவிருப்பு",
  "book.mustBeLoggedIn": "அபாயிண்ட்மெண்ட் பதிவு செய்ய உள்நுழைவு அவசியம்.",
  "book.failedLoadPatient":
    "நோயாளர் தகவலை ஏற்ற முடியவில்லை. தயவுசெய்து பின்னர் முயற்சிக்கவும்.",
  "book.patientNotLoaded": "நோயாளர் தகவல் ஏற்றப்படவில்லை.",
  "book.datePast": "அபாயிண்ட்மெண்ட் தேதி கடந்த நாளாக இருக்க முடியாது.",
  "book.successPrefix": "அபாயிண்ட்மெண்ட் வெற்றிகரமாக பதிவு செய்யப்பட்டது:",
  "book.failedBook":
    "அபாயிண்ட்மெண்ட் பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
  "book.fetchingPatient": "நோயாளர் தகவலை பெறுகிறோம்...",
  "book.couldNotLoadProfile":
    "நோயாளர் சுயவிவரத்தை ஏற்ற முடியவில்லை. நீங்கள் உள்நுழைந்துள்ளீர்கள் என்பதை உறுதிப்படுத்தவும்.",
  "book.title": "அபாயிண்ட்மெண்ட் பதிவு",
  "book.welcome": "வரவேற்பு",
  "book.subtitle": "உங்கள் அடுத்த வருகையை திட்டமிடுங்கள்.",
  "book.patientName": "நோயாளர் பெயர்",
  "book.bloodGroup": "இரத்த வகை",
  "book.phone": "தொலைபேசி",
  "book.appointmentDate": "அபாயிண்ட்மெண்ட் தேதி",
  "book.booking": "பதிவு செய்கிறோம்...",
  "book.bookAppointment": "அபாயிண்ட்மெண்ட் பதிவு செய்யவும்",
  "book.ok": "சரி",
  "notFound.title": "ஓஹோ!",
  "notFound.message": "இந்த திரை இல்லை.",
  "notFound.goHome": "முகப்பு திரைக்கு செல்லவும்!",
};

const GUJARATI_DICTIONARY: Dictionary = {
  ...ENGLISH_DICTIONARY,
  "common.language": "ભાષા",
  "common.appearance": "દેખાવ",
  "common.themeLight": "લાઇટ",
  "common.themeDark": "ડાર્ક",
  "common.themeSystem": "સિસ્ટમ",
  "common.continue": "ચાલુ રાખો",
  "common.back": "પાછા",
  "common.error": "ભૂલ",
  "common.success": "સફળતા",
  "common.na": "ઉપલબ્ધ નથી",
  "common.chooseLanguageHint": "બદલવા માટે ટૅપ કરો",
  "choose.heading": "કૃપા કરીને યોગ્ય વિકલ્પ પસંદ કરો,",
  "choose.subheading": "આગળ વધવા માટે તમારી ભૂમિકા પસંદ કરો",
  "patientHome.bookNew": "નવી અપોઇન્ટમેન્ટ બુક કરો",
  "choose.donor": "દાતા",
  "choose.patient": "દર્દી",
  "choose.signUp": "સાઇન અપ",
  "choose.login": "લૉગ ઇન",
  "patientHome.unlinkedTitle": "હજુ દાતા પૂલ લિંક થયો નથી",
  "patientHome.unlinkedDesc":
    "તમારી પ્રોફાઇલ સક્રિય છે, પણ મંજૂર દાતા હજી લિંક થયો નથી. કૃપા કરીને બ્લડ બેંક એડમિનને તમારો સમર્પિત દાતા પૂલ સોંપવા વિનંતી કરો.",
  "patientHome.tab.pool": "લિંક થયેલ પૂલ",
  "patientHome.tab.upcoming": "આગામી",
  "patientHome.tab.history": "ઇતિહાસ",
  "patientHome.poolTitle": "લિંક થયેલ દાતા પૂલ",
  "patientHome.noDonors": "કોઈ દાતા સોંપાયેલ નથી",
  "patientHome.noDonorsHint": "મંજૂર દાતા મેપિંગ અહીં દેખાશે",
  "patientHome.upcomingTitle": "આગામી અપોઇન્ટમેન્ટ",
  "patientHome.noUpcoming": "કોઈ आगामी અપોઇન્ટમેન્ટ નથી",
  "patientHome.noUpcomingHint": "શરૂ કરવા માટે અપોઇન્ટમેન્ટ બુક કરો",
  "patientHome.assignedDonor": "સોંપાયેલ દાતા",
  "patientHome.scheduled": "નિયોજિત:",
  "patientHome.waitingForAssignment": "દાતા સોંપણીની રાહમાં",
  "patientHome.historyTitle": "અપોઇન્ટમેન્ટ ઇતિહાસ",
  "patientHome.noHistory": "અપોઇન્ટમેન્ટ ઇતિહાસ નથી",
  "patientHome.donor": "દાતા",
  "patientHome.status.waitingDonor": "દાતાની રાહમાં",
  "patientHome.status.donorAccepted": "દાતાએ સ્વીકાર્યું",
  "patientHome.status.donorDeclined": "દાતાએ નકારી દીધું",
  "patientHome.status.completed": "પૂર્ણ",
  "donorHome.unlinkedTitle": "હજુ દર્દી પૂલ લિંક થયો નથી",
  "donorHome.unlinkedDesc":
    "તમે હજી કોઈ દર્દી પૂલમાં સોંપાયેલા નથી. કૃપા કરીને એડમિનનો સંપર્ક કરો.",
  "donorHome.tab.pool": "લિંક થયેલ પૂલ",
  "donorHome.tab.upcoming": "આગામી",
  "donorHome.tab.history": "ઇતિહાસ",
  "donorHome.poolTitle": "લિંક થયેલ દર્દી પૂલ",
  "donorHome.upcomingTitle": "આગામી દાન સમયપત્રક",
  "donorHome.noPatientsAssigned":
    "કોઈ દર્દી સોંપાયેલ નથી. મંજૂર મેપ થયેલા દર્દીઓ અહીં દેખાશે.",
  "donorHome.noUpcomingAppointments":
    "તમારી પાસે કોઈ સોંપાયેલ દાન અપોઇન્ટમેન્ટ નથી.",
  "donorHome.assignedDate": "સોંપાયેલ તારીખ",
  "donorHome.patientAppointment": "દર્દી અપોઇન્ટમેન્ટ:",
  "donorHome.confirmDonate": "શું તમે દાન કરી શકશો?",
  "donorHome.accept": "સ્વીકારો",
  "donorHome.cancel": "રદ કરો",
  "donorHome.acceptedLabel": "તમે આ અપોઇન્ટમેન્ટ સ્વીકારી છે",
  "donorHome.rejectedLabel": "તમે આ અપોઇન્ટમેન્ટ રદ કરી છે",
  "donorHome.historyTitle": "દાન ઇતિહાસ",
  "donorHome.noHistory": "હજુ દાન ઇતિહાસ નથી",
  "donorHome.summary.linkedPatients": "લિંક થયેલ દર્દીઓ",
  "donorHome.summary.upcoming": "આગામી",
  "book.mustBeLoggedIn": "અપોઇન્ટમેન્ટ બુક કરવા માટે લૉગિન જરૂરી છે.",
  "book.failedLoadPatient":
    "દર્દીની માહિતી લોડ થઈ શકી નથી. કૃપા કરીને થોડા સમયમાં ફરી પ્રયત્ન કરો.",
  "book.patientNotLoaded": "દર્દીની માહિતી લોડ થઈ નથી.",
  "book.datePast": "અપોઇન્ટમેન્ટ તારીખ ભૂતકાળની હોઈ શકે નહીં.",
  "book.successPrefix": "અપોઇન્ટમેન્ટ સફળતાપૂર્વક બુક થઈ:",
  "book.failedBook": "અપોઇન્ટમેન્ટ બુક થઈ શકી નથી. ફરી પ્રયાસ કરો.",
  "book.fetchingPatient": "દર્દીની માહિતી મેળવી રહ્યા છીએ...",
  "book.couldNotLoadProfile":
    "દર્દી પ્રોફાઇલ લોડ થઈ શકી નથી. કૃપા કરીને ખાતરી કરો કે તમે લૉગિન છો.",
  "book.title": "અપોઇન્ટમેન્ટ બુક કરો",
  "book.welcome": "સ્વાગત",
  "book.subtitle": "તમારી આગળની મુલાકાતનું આયોજન કરો.",
  "book.patientName": "દર્દીનું નામ",
  "book.bloodGroup": "બ્લડ ગ્રુપ",
  "book.phone": "ફોન",
  "book.appointmentDate": "અપોઇન્ટમેન્ટ તારીખ",
  "book.booking": "બુક થઈ રહ્યું છે...",
  "book.bookAppointment": "અપોઇન્ટમેન્ટ બુક કરો",
  "book.ok": "બરાબર",
  "notFound.title": "અરે!",
  "notFound.message": "આ સ્ક્રીન ઉપલબ્ધ નથી.",
  "notFound.goHome": "હોમ સ્ક્રીન પર જાઓ!",
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

const I18nContext = createContext<I18nContextValue | null>(null);

async function loadPersistedLanguage(): Promise<LanguageCode | null> {
  try {
    const secureValue = await SecureStore.getItemAsync(STORAGE_KEY);
    if (isLanguageCode(secureValue)) {
      return secureValue;
    }
  } catch {
    // Ignore and continue to fallback storage.
  }

  try {
    const asyncValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (isLanguageCode(asyncValue)) {
      // Migrate legacy AsyncStorage value to SecureStore.
      void SecureStore.setItemAsync(STORAGE_KEY, asyncValue).catch(() => {
        // Ignore migration failures.
      });
      return asyncValue;
    }
  } catch {
    // Ignore read failures and use default language.
  }

  return null;
}

function persistLanguage(nextLanguage: LanguageCode): void {
  void Promise.allSettled([
    SecureStore.setItemAsync(STORAGE_KEY, nextLanguage),
    AsyncStorage.setItem(STORAGE_KEY, nextLanguage),
  ]);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const stored = await loadPersistedLanguage();
        if (isLanguageCode(stored)) {
          setLanguage(stored);
        }
      } catch {
        // Ignore storage errors and keep default language.
      } finally {
        setIsHydrated(true);
      }
    };

    loadLanguage();
  }, []);

  const setLanguageWithPersistence = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  };

  const t = useMemo(() => {
    return (key: string) => {
      const selected = DICTIONARIES[language] || {};
      return selected[key] || ENGLISH_DICTIONARY[key] || key;
    };
  }, [language]);

  const value: I18nContextValue = {
    language,
    setLanguage: setLanguageWithPersistence,
    t,
  };

  if (!isHydrated) {
    return null;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
