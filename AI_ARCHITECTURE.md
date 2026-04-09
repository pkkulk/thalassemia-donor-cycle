# AI Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📱 Mobile App (React Native)     💻 Web Dashboard (Next.js)          │
│  ├─ Patient Home                  ├─ Admin Dashboard                  │
│  ├─ Book Appointment              ├─ AI Analytics Dashboard            │
│  ├─ Donor Dashboard               │  ├─ Prioritized Patient Queue      │
│  └─ Accept/Reject                 │  ├─ Critical Alerts               │
│                                    │  ├─ Match Statistics              │
│                                    │  ├─ Donor Suggestions            │
│                                    │  └─ Optimize Schedule Btn         │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP/REST API
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        API / BACKEND LAYER                              │
├────────┬────────┬─────────────────┬──────────────────────────────────────┤
│        │        │                 │                                      │
│  Existing       │                 │         🤖 AI SERVICES              │
│  Endpoints      │   NEW AI         │                                      │
│  POST /appts    │   Endpoints      │  ┌──────────────────────────────┐  │
│  /new           │   ───────────    │  │ donorMatcher.js             │  │
│  /notifications │   POST /appts/   │  │ ├─ findBestDonors()        │  │
│  /sendDonorEmail│   intelligent    │  │ ├─ scoreDonor()            │  │
│  /sendReminder  │                  │  │ └─ getMatchingStats()      │  │
│                 │   GET /admin/    │  └──────────────────────────────┘  │
│                 │   analytics      │                                      │
│                 │   ?action=queue  │  ┌──────────────────────────────┐  │
│                 │   ?action=alerts │  │ priorityScorer.js           │  │
│                 │   ?action=stats  │  │ ├─ getPrioritizedQueue()    │  │
│                 │   ?action=donor- │  │ ├─ scorePatient()           │  │
│                 │    suggestions   │  │ ├─ getQueueStats()          │  │
│                 │   ?action=       │  │ └─ classifyUrgency()        │  │
│                 │    optimize      │  └──────────────────────────────┘  │
│                 │                  │                                      │
│                 │   POST /admin/   │  ┌──────────────────────────────┐  │
│                 │   analytics      │  │ notificationGenerator.js    │  │
│                 │   ?action=       │  │ ├─ generateDonorEmail()     │  │
│                 │    optimize      │  │ ├─ generateReminder()       │  │
│                 │                  │  │ ├─ generateAdminAlert()     │  │
│                 │                  │  │ ├─ generateTemplate()       │  │
│                 │                  │  │ └─ sendEmail() [Resend]     │  │
│                 │                  │  └──────────────────────────────┘  │
│                 │                  │                                      │
└─────────────────┼──────────────────┼──────────────────────────────────────┘
                  │                  │
                  │ Supabase SDK     │ Resend Email API
                  │                  │
┌─────────────────▼──────────────────▼──────────────────────────────────────┐
│                        DATA & EXTERNAL SERVICES                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📊 Supabase PostgreSQL Database                📧 Resend Email Service │
│  ├─ patients (+ urgency fields)                 ├─ Send notifications  │
│  ├─ donor (+ metrics fields)                    ├─ Templates           │
│  ├─ appointments (+ AI scoring)                 └─ Delivery tracking   │
│  └─ Real-time subscriptions                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                     AI FLOW DIAGRAM                                    ┃
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓

SCENARIO 1: Patient Books Appointment (Smart Booking)
─────────────────────────────────────────────────────────

┌─ Patient submits: Book appointment for 2026-03-01
│
├─→ POST /api/appointments/intelligent
│   {patientId, date, isEmergency, autoAssign}
│
├─→ 🤖 Step 1: Score Patient Urgency
│   ├─ Calculate urgency_score (0-100)
│   ├─ Classify: CRITICAL | HIGH | MEDIUM | LOW | ROUTINE
│   └─ Return: urgency_level
│
├─→ 🤖 Step 2: Find Best Donor Matches
│   ├─ Fetch patient blood_group, location, age, etc
│   ├─ Fetch all active donors
│   ├─ Score each donor based on:
│   │  ├─ Blood type compatibility (30 pts)
│   │  ├─ Donation eligibility (20 pts)
│   │  ├─ Reliability history (15 pts)
│   │  ├─ Location proximity (15 pts)
│   │  ├─ Response time (10 pts)
│   │  └─ Preference (5 pts)
│   ├─ Filter incompatible donors
│   ├─ Sort by matchScore (highest first)
│   └─ Return: Top 3 candidates (or top 1 for emergency)
│
├─→ 🤖 Step 3: Auto-Assign Best Donor (if enabled)
│   ├─ Select candidate with highest matchScore
│   ├─ Update appointment with donor_id
│   ├─ Set status = 'Assigned'
│   └─ Record donor_match_score
│
├─→ 🤖 Step 4: Generate Personalized Email
│   ├─ Fetch donor & patient details
│   ├─ Determine tone (critical | important | friendly)
│   ├─ Generate contextual email template
│   ├─ Personalize with names, dates, blood type
│   └─ Return: Email content
│
├─→ 📧 Step 5: Send Notification
│   ├─ Call Resend API
│   ├─ Subject: Based on urgency
│   ├─ Body: Personalized template
│   └─ Track: Email ID for logging
│
└─→ Response to Frontend
    ├─ appointment_id
    ├─ patient_urgency (score, level)
    ├─ assigned_donor (name, reliability)
    ├─ match_reason
    └─ alternatives (if autoAssign=false)


SCENARIO 2: Admin Views Dashboard (AI Analytics)
──────────────────────────────────────────────────

┌─ Admin opens AI Analytics Dashboard
│
├─→ Fetch: GET /api/admin/analytics?action=queue
│   ├─ Get all pending appointments
│   ├─ For each: Call scorePatient()
│   ├─ Calculate urgency_score for each
│   ├─ Classify urgency_level
│   ├─ Sort by urgency_score DESC
│   └─ Display with color-coded urgency bars
│
├─→ Fetch: GET /api/admin/analytics?action=alerts
│   ├─ Scan all patients
│   ├─ Calculate: days since last transfusion
│   ├─ Generate alerts for overdue patients
│   ├─ Categorize: CRITICAL | HIGH | MEDIUM
│   ├─ Show action items
│   └─ Display with alert icons & urgency colors
│
├─→ Fetch: GET /api/admin/analytics?action=stats
│   ├─ Calculate: success_rate
│   ├─ Calculate: avg_donor_reliability
│   ├─ Count: completed vs total appointments
│   └─ Display in stat cards with trends
│
├─→ Admin clicks on a patient
│   ├─ Fetch: GET /api/admin/analytics?action=donor-suggestions
│   │   ├─ Params: patientId, appointmentDate
│   │   ├─ Call: findBestDonors()
│   │   ├─ Return: Top 3 candidates sorted by matchScore
│   │   └─ Show: Name, reliability, reasoning
│   │
│   └─ Admin can:
│       ├─ Accept recommendation (auto-assign)
│       ├─ Choose different donor
│       ├─ Suggest different date
│       └─ Mark as emergency
│
├─→ Admin clicks "Optimize Schedule"
│   ├─ POST /api/admin/analytics?action=optimize
│   │   ├─ Get ALL pending appointments
│   │   ├─ For EACH pending appt:
│   │   │   ├─ Call findBestDonors()
│   │   │   ├─ If match found:
│   │   │   │   ├─ Auto-assign donor
│   │   │   │   ├─ Send notification
│   │   │   │   └─ Update status='Assigned'
│   │   │   └─ If no match:
│   │   │       └─ Suggest alternative dates
│   │   │
│   │   └─ Return: summary of optimizations
│   │
│   └─ Results:
│       ├─ X appointments matched
│       ├─ Y failed (show reasons)
│       └─ Dashboard refreshes automatically


SCENARIO 3: Scheduled Reminders
────────────────────────────────

Time: Daily 8 AM (scheduled via cron job)
│
├─→ Query: appointments WHERE date = tomorrow AND status = 'Assigned'
│
├─→ For EACH appointment:
│   ├─ Call: generateReminderNotification(appointmentId)
│   │   ├─ Calculate: days until appointment
│   │   ├─ Generate: contextual reminder message
│   │   │   ├─ 4 days before: "Prepare for donation"
│   │   │   ├─ 1 day before: "Please confirm"
│   │   │   └─ Today: "Final reminder + arrive early"
│   │   │
│   │   └─ Return: email subject + body
│   │
│   └─ Call: sendEmail(emailData)
│       └─ Send via Resend

```

---

## Data Flow for Donor Matching Algorithm

```
INPUT: patientId, appointmentDate, isEmergency

STEP 1: Load Patient Data
├─ blood_group: "O+"
├─ age: 12
├─ city: "Mumbai"
└─ comorbidities: ["cardiac condition"]

STEP 2: Load All Donors
├─ Filter by: is_active = true
└─ Result: [Donor1, Donor2, ..., DonorN]

STEP 3: Score Each Donor
For each donor:
  │
  ├─ Check: blood_group in COMPATIBILITY[patient.blood_group]?
  │   NO  → REJECT (score = -1)
  │   YES → Continue
  │
  ├─ Blood Type Match Score (0-30)
  │   ├─ Exact match (O+ to O+): +30
  │   ├─ Compatible (O+ to A+): +15
  │   └─ Default: 0
  │
  ├─ Donation Eligibility (0-20)
  │   ├─ Days since last: 90+? → +20
  │   ├─ Days since last: 56-90? → +10
  │   ├─ Days since last: <56? → REJECT (-1)
  │   └─ No history? → +15
  │
  ├─ Reliability Score (0-15)
  │   ├─ completed/total = 95%? → +15
  │   ├─ completed/total = 75%? → +10
  │   └─ completed/total = 50%? → +5
  │
  ├─ Location Score (0-15)
  │   ├─ Same city? → +15
  │   ├─ Different city? → +5
  │   └─ No data? → 0
  │
  ├─ Response Time (0-10)
  │   ├─ avg_response_time < 24h? → +10
  │   └─ Otherwise: 0
  │
  ├─ Preference Bonus (0-5)
  │   ├─ Patient's preferred donor? → +5
  │   └─ Otherwise: 0
  │
  └─ FINAL SCORE = Clamp(0, 100)

STEP 4: Filter & Sort
├─ Remove all donors with score = -1
├─ Check for schedule conflicts (donor already assigned)
├─ Sort by score DESC
└─ Return: Top N candidates

OUTPUT: 
[
  { rank: 1, donor_id, donor_name, matchScore: 92, reliability: 95%, reason: "..." },
  { rank: 2, donor_id, donor_name, matchScore: 85, reliability: 88%, reason: "..." },
  { rank: 3, donor_id, donor_name, matchScore: 78, reliability: 80%, reason: "..." }
]
```

---

## Database Queries Used by AI Services

### Donor Matcher Queries
```sql
-- Get patient details
SELECT id, name, blood_group, city, urgency_level 
FROM patients WHERE id = ?

-- Get all active donors
SELECT id, name, blood_group, city, last_donation_date, 
       total_appointments, completed_appointments, avg_response_time_hours, is_preferred 
FROM donor WHERE is_active = true

-- Check conflicts for a date
SELECT donor_id FROM appointments 
WHERE date = ? AND status = 'Confirmed'

-- Calculate donor reliability
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN status='Completed' THEN 1 END) as completed
FROM appointments WHERE donor_id = ?
```

### Priority Scorer Queries
```sql
-- Get pending appointments
SELECT id, patient_id, date, created_at, status 
FROM appointments WHERE status = 'Pending'

-- Get patient details with health info
SELECT id, name, age, blood_group, emergency_flag, 
       comorbidities, recent_complications, transfusion_frequency_days
FROM patients WHERE id IN (?)

-- Get last transfusion date
SELECT patient_id, date FROM appointments 
WHERE patient_id IN (?) AND status = 'Completed' 
ORDER BY date DESC

-- Get all alerts-worthy patients
SELECT id, name FROM patients 
WHERE ...criteria...
```

