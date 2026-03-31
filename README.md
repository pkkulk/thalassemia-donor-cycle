## 📂 Repository Status

This project is **ongoing & sponsored**..

# 🩸 Thalassemia Patient–Donor Management System

A full-stack healthcare application designed to streamline **patient appointment booking**, **donor assignment**, and **confirmation workflows** for blood banks treating thalassemia patients.

---

## 📌 Problem Statement

Thalassemia patients require **regular and timely blood transfusions**.
Blood banks often face challenges like:

- Manual donor coordination
- Last-minute donor unavailability
- Poor communication between patients, donors, and blood banks

This system digitizes and automates the entire process to ensure **reliability, transparency, and timely care**.

---

## 🚀 Key Features

### 👤 Patient

- Book blood transfusion appointments through the app
- View appointment status and confirmations

### 🏥 Blood Bank Admin

- Dashboard to manage patient requests
- Assign donors based on availability and schedule
- Track donor confirmations in real time

### 🧑‍🦱 Donor

- Receive automated email notification when assigned
- Accept or reject appointments from the mobile app
- Confirm availability in advance (e.g., 4 days before patient arrival)

---

## 🔁 Workflow Overview

1. Patient books an appointment from the app
2. Request appears on the Blood Bank dashboard
3. Admin assigns a donor for the required date
4. Backend automatically sends an email notification to the donor
5. Donor opens the app and confirms availability
6. Confirmation status is reflected back on the admin dashboard

This ensures donors are **confirmed in advance**, reducing last-minute failures.

### 🔗 Dedicated Donor Pool (Thalassemia-safe)

This system now supports **patient-specific donor pools**.

- Admin creates donor-patient links from the web `Directory → Mappings` tab
- Only **approved linked donors** can be assigned to that patient
- If a patient has no approved link, assignment is blocked until mapping is created

To enable this, run the SQL migration in Supabase:

- `backend-api/sql/patient_donor_links.sql`
- (Optional hardening) `backend-api/sql/patient_donor_links_guards.sql` to enforce ABO/Rh compatibility at DB trigger level
- (Tier 1 required) `backend-api/sql/appointment_lifecycle_guards.sql` to enforce valid appointment status transitions and auto-stamp lifecycle timestamps

* (Tier 1 required) `backend-api/sql/safety_guards.sql` to enforce donor safety checks (90-day interval, availability, consent baseline) on critical appointment transitions
* (Tier 1 required) `backend-api/sql/reminder_logs.sql` to dedupe reminder sends (same-day + day-before) per appointment and recipient
* (Tier 1 required) `backend-api/sql/profile_completeness_guards.sql` to block critical appointment operations when patient/donor profile data is incomplete

Tier 1 reminder endpoint:

- `backend-api/api/notifications/sendDueReminders.js`
- Trigger via scheduler/cron or manual POST/GET to process due reminders.

* (Optional monitoring) `backend-api/sql/operational_events.sql` to enable incompatible-link attempt metrics in Health panel

---

## 🎯 Tier 2: Growth Features

### 🏆 Feature 1: Donor Ranking Logic

**Purpose:** Intelligently rank donors by composite score based on reliability, distance, and activity, automating donor selection to improve acceptance rates.

**Schema Changes:**

- `backend-api/sql/donor_ranking_logic.sql` - adds scoring columns to donor table and creates `donor_ranking_scores` audit trail table
- Columns added: `response_rate`, `distance_km`, `recent_activity_days`, `cancellation_count`, `completed_donations`

**Ranking Algorithm:**

- **Response Reliability (40%):** acceptance rate from past appointments
- **Distance (30%):** normalized distance in km from clinic
- **Recency (20%):** days since last donation (0-30 days ideal)
- **Penalties & Bonuses:** -10 per cancellation, +5 per 5 completed donations
- **Composite Score:** weighted average (0-100 scale)

**Backend API:**

- `backend-api/api/donors/rank.js` - GET `/api/donors/rank?appointment_id={id}&limit=10`
- Returns: Ranked list of approved linked donors with scores, confidence levels, and score breakdown

**Frontend Integration:**

- `aweb-dashboard/src/components/AppointmentDetailModal.tsx` updated:
  - Auto-fetches ranked donors when modal opens for unassigned appointments
  - Displays ranked donors with composite scores, confidence indicators (High/Medium/Low), and score explanations
  - One-click donor selection from ranked list
  - Shows "calculating..." spinner during ranking computation

**Usage:**

1. Open appointment modal for a date
2. For any unassigned appointment, ranked donors auto-load with scores
3. Click on a ranked donor card to select
4. Click "Assign Selected Donor" button
5. System assigns top-ranked donor for maximum acceptance probability

---

### 🔄 Feature 2: Reschedule & Fallback Flow

**Purpose:** Auto-suggest alternate donors and dates when a donor declines or misses an appointment, enabling rapid rescheduling without manual intervention.

**Schema Changes:**

- `backend-api/sql/reschedule_fallback_logic.sql` - adds reschedule metadata to appointments + fallback suggestion log
- Columns added: `original_appointment_id`, `reschedule_reason`, `reschedule_count`, `last_fallback_suggested_at`
- New table: `fallback_suggestions` (audit trail of all suggestions with acceptance status)

**Reschedule Reasons:**

- `donor_declined` - Donor explicitly rejected
- `no_show` - Donor failed to appear
- `patient_requested` - Patient asked to reschedule
- `admin_reassign` - Admin manually rescheduled

**Backend APIs:**

1. **Get Fallback Suggestions**
   - Endpoint: `POST /api/appointments/suggest-fallback`
   - Body: `{ appointment_id: string }`
   - Returns: Top 3 ranked replacement donors + top 3 alternative dates with reasons
   - Flow: Triggered when admin/system detects decline/no-show

2. **Create Fallback Appointment**
   - Endpoint: `POST /api/appointments/create-fallback`
   - Body: `{ original_appointment_id, donor_id, date, reason }`
   - Returns: New fallback appointment with reschedule_count incremented
   - Constraint: Max 3 rescheduling attempts per original appointment

**Helper Functions:**

- `get_fallback_suggestions()` - Smart ranking + date filtering logic (PostgreSQL)
- `create_fallback_appointment()` - Atomic creation with linked tracking
- `mark_fallback_accepted()` - Records donor acceptance of fallback

**Helper View:**

- `vw_pending_rescheduling` - Dashboard view of appointments needing rescheduling

**Usage Flow:**

1. Admin sees declined/no-show appointment in dashboard
2. Clicks "Suggest Fallback" button
3. System calls `suggest-fallback` API → returns 3 donors + 3 dates
4. Admin selects best option
5. System calls `create-fallback` API → new appointment created
6. Donor receives email notification for new date
7. Original appointment linked via `original_appointment_id` for audit trail

**Benefits:**

- ⚡ Fast recovery from donor cancellations (seconds vs hours)
- 🎯 Smart suggestions based on availability + ranking score
- 📊 Full audit trail via `fallback_suggestions` table
- 🛡️ Max 3 reschedules prevents infinite loops

---

### 🔔 Feature 3: In-App Notification Center

**Purpose:** Keep all operational updates in one timeline for patients, donors, and admins.

**Schema Changes:**

- `backend-api/sql/in_app_notification_center.sql`
- New table: `notifications`
- Trigger: `trg_create_appointment_notifications` (auto-creates timeline events on appointment insert/update)
- View: `vw_notifications_timeline`

**Event Coverage:**

- `booked`
- `assigned`
- Status-based events from appointment transitions (for example: Accepted, Declined, Donated, Completed)

**Backend APIs:**

1. **Fetch Timeline**

- Endpoint: `GET /api/notifications/timeline`
- Params: `role=patient|donor|admin`, plus `patient_id` or `donor_id` when required
- Optional: `unread_only=true`, `limit`, `offset`

2. **Mark Read**

- Endpoint: `PATCH /api/notifications/mark-read`
- Modes:
  - Single: `{ notification_id }`
  - Bulk: `{ mark_all: true, role, patient_id|donor_id }`

3. **Unread Count**

- Endpoint: `GET /api/notifications/unread-count`
- Params: `role=patient|donor|admin`, plus recipient id for patient/donor

**Usage Flow:**

1. Appointment is created or updated
2. Trigger writes notifications for patient, donor (if assigned), and admin
3. Client fetches timeline via `/api/notifications/timeline`
4. User opens item -> mark read via `/api/notifications/mark-read`
5. Badge count updates via `/api/notifications/unread-count`

---

### 📅 Feature 4: Calendar Integration (Mobile App - Patients & Donors)

**Purpose:** Let patients and donors add appointments to their device calendars in one tap, reducing missed visits.

**Architecture:**

- **NOT** on web dashboard (staff see everything on dashboard already)
- **Triggers** automatically on mobile app after donor assignment
- **Patients** see "Download ICS" and "Add to Calendar" buttons when donor is assigned
- **Donors** see calendar buttons after they accept an appointment

**Backend API:**

- `backend-api/api/appointments/calendar.js`
- Endpoint: `GET /api/appointments/calendar?appointment_id={id}`
- Output: RFC 5545 compliant `.ics` file with:
  - Appointment details (patient name, date, blood group)
  - Special instructions (arrive early, bring ID, etc.)
  - Critical reminders (don't miss appointment)

**Mobile Components:**

1. **Patient Home Screen** (`mobile-app/app/patient-home.tsx`)
   - Calendar buttons appear under "Upcoming Appointments" section
   - Only shown when donor is assigned to appointment
   - Displays donor name, blood group, and arrival time

2. **Donor Dashboard** (`mobile-app/app/DonorDashboardScreen.tsx`)
   - Calendar buttons appear under "Upcoming Appointments" section
   - Only shown when donor has accepted appointment
   - Shows patient name and appointment date

3. **Calendar Export Component** (`mobile-app/components/CalendarExportButton.tsx`)
   - Reusable React Native component
   - Two action buttons: "📥 Download ICS" and "📅 Add to Calendar"
   - Supports: Google Calendar, Apple Calendar, Outlook, device calendars

**Workflow:**

1. Patient books appointment
2. Blood Bank admin assigns donor (using Feature 1 - Donor Ranking)
3. **Patient receives notification** → Sees calendar buttons in app
4. Patient clicks "Download ICS" → File saved to device OR "Add to Calendar" → Opens Google Calendar
5. Donor receives notification about assignment
6. **Donor accepts/declines in app**
7. **If accepted**, donor sees calendar buttons
8. Donor can download/import appointment to their calendar

**Event Description Format:**

Calendar events include:

```
=== APPOINTMENT DETAILS ===
Appointment ID: {id}
Date: {date}
Patient: {name} (Blood Group: {group})

=== INSTRUCTIONS ===
- Please arrive 15 minutes early
- Bring valid identification and medical records
- Inform staff if you have any health concerns
- This is a mandatory transfusion appointment

=== CRITICAL ===
Do not miss this appointment as it is vital for treatment.
If you need to reschedule, contact support immediately.

=== NEXT STEPS ===
1. Confirm the appointment date and time
2. Arrange transportation if needed
3. Review any pre-appointment requirements
4. Contact facility staff for questions
```

**Environment Variable (Mobile App):**

- `NEXT_PUBLIC_BACKEND_API_BASE_URL`
  - Example local value: `http://localhost:3000`
  - Used for ICS download API calls from the mobile app

**Future Enhancements:**

- Push notifications when calendar event reminder triggers
- Automatic SMS to confirm attendance 24 hours before
- In-app calendar widget showing synced appointments

---

## 🧱 Tech Stack

### Frontend

- **Next.js** – Patient & Blood Bank dashboards
- **React.js** – Web interfaces
- **React Native** – Donor mobile application

### Backend

- **Node.js + Express.js** – REST APIs & business logic
- **JWT Authentication** – Secure role-based access

### Database & Services

- **Supabase PostgreSQL** – Relational data storage
- **Supabase Email Functions** – Automated email notifications

---

## 🧠 Architecture Highlights

- Role-based access control (Patient / Donor / Admin)
- Event-driven email notifications on donor assignment
- Centralized PostgreSQL schema for patients, donors, and appointments
- Scalable backend design with future AI integration readiness

---

## 🔮 Future Enhancements

- AI-based **emergency donor matching**
- Priority scoring for urgent patients
- SMS / WhatsApp notifications
- Analytics dashboard for blood bank usage patterns

---

## 👨‍💻 My Contribution

- Designed the **appointment & donor assignment workflow**
- Built UI for website and app and supabase handlinf
- Designed PostgreSQL schemas and relationships
- Integrated automated email notifications
- Connected React / React Native frontend with backend APIs

---

## 📸 Screenshots / Demo

<div align="center">
  <table>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/f7d23ce1-8403-4141-aa87-7bfc4515db8b" width="300"/></td>
      <td><img src="https://github.com/user-attachments/assets/e4178cff-7b87-4273-be8b-cb39a6156621" width="300"/></td>
      <td><img src="https://github.com/user-attachments/assets/307ba2c8-8fd7-44ae-be78-79b2f040f579" width="300"/></td>
    </tr>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/7cf198f3-41a7-4922-9a19-68b98d3f4efa" width="300"/></td>
      <td><img src="https://github.com/user-attachments/assets/e3f6e9a1-cc5b-4ecd-8c6f-078ce3fc8515" width="300"/></td>
      <td><img src="https://github.com/user-attachments/assets/f4e98ea7-6b49-479d-b88f-b56ba7abfa4d" width="300"/></td>
    </tr>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/26144759-9f2c-4a99-b01f-b98626b28f07" width="300"/></td>
      <td><img src="https://github.com/user-attachments/assets/cb29fdd0-b1cb-4f9f-8d98-66f392db53d9" width="300"/></td>
      <td></td>
    </tr>
  </table>
</div>

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/2e9d1f19-2ecb-4a28-852d-fbfe1106102b" />
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/13567c1b-d047-4f96-8939-7b035e6171b3" />

---

--
