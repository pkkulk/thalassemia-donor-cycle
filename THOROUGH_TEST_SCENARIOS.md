# Thorough End-to-End Test Scenarios

Use this as the full validation suite after major changes.

## 1. Scope

Covered apps and modules:

- Mobile app: auth, signup validations, patient flow, donor flow, language/theme, back behavior
- Admin web: dashboard, directory, stats, health, appointment assignment lifecycle
- Backend APIs: dashboard/stats/appointments/notifications core behavior
- Database constraints and guards: phone, email, blood group, uniqueness, lifecycle safety

Not in scope:

- Donor-patient chat/messaging (intentionally removed from current code)

## 2. Test Data Baseline

Prepare this before execution:

- 8 donor records and 8 patient records (already added)
- At least 3 approved donor-patient links
- At least 1 patient with no approved donor link
- At least 1 donor with zero donations
- At least 1 donor with at least 1 completed donation
- At least 3 appointments with different statuses: scheduled, accepted, completed
- At least 1 declined/no-show case for fallback testing

## 3. Environment Matrix

Execute all major scenarios in:

- Android emulator/device
- Web dashboard in Chrome
- Optional cross-check in Edge
- Light and dark mode where available
- Online and one offline spot-check

## 4. Mobile App Test Scenarios

### M-AUTH-01: Choose Role Screen Navigation

Precondition:

- App opened fresh

Steps:

1. Open app.
2. On role screen, tap Donor.
3. Go back.
4. Tap Patient.

Expected:

- Donor and Patient routes open correctly.
- Back returns to role screen without crash.

### M-AUTH-02: Signup Required Fields Validation

Precondition:

- Signup screen opened

Steps:

1. Leave all fields empty.
2. Tap Continue.

Expected:

- Inline validation text appears near each required field.
- Continue remains disabled when invalid.

### M-AUTH-03: Phone Validation Inline

Precondition:

- Signup screen opened

Steps:

1. Enter valid name, blood group, email, password.
2. Enter phone with fewer than 10 digits.

Expected:

- Inline phone error appears.
- Continue button is disabled.

### M-AUTH-04: Email Validation Inline

Precondition:

- Signup screen opened

Steps:

1. Fill all fields valid except email.
2. Enter invalid email format.

Expected:

- Inline email error appears.
- Continue button is disabled.

### M-AUTH-05: Blood Group Selector Required + Valid Values

Precondition:

- Signup screen opened

Steps:

1. Tap blood group selector.
2. Verify options list.
3. Select one valid option.
4. Reopen and select another valid option.

Expected:

- Only valid blood groups are shown: A+, A-, B+, B-, AB+, AB-, O+, O-.
- No free-text blood group entry path.
- Selected value appears correctly.

### M-AUTH-06: Password Minimum Length

Precondition:

- Signup screen opened

Steps:

1. Fill all fields with valid data.
2. Enter password with fewer than 6 chars.

Expected:

- Inline password min-length error appears.
- Continue remains disabled.

### M-AUTH-07: Successful Signup Path

Precondition:

- New email and new phone not used before

Steps:

1. Fill all fields valid.
2. Tap Continue.

Expected:

- Submit state appears.
- User profile row is created in donor or patients table based on chosen role.
- User is redirected to login after success message.

### M-AUTH-08: Duplicate Email Handling

Precondition:

- Existing account with same email already present

Steps:

1. Try signup with same email.
2. Use wrong password.
3. Retry with correct password.

Expected:

- Wrong password path shows email already registered style feedback.
- Correct password path does not create duplicate profile rows.
- User is guided to login.

### M-AUTH-09: Duplicate Phone Handling

Precondition:

- Existing profile with same phone

Steps:

1. Try signup with same phone and different email.

Expected:

- Signup is blocked by DB uniqueness.
- Inline phone duplicate error appears.

### M-AUTH-10: Login With Valid Credentials

Precondition:

- Existing valid user account

Steps:

1. Enter valid email/password.
2. Tap login.

Expected:

- User lands in the correct home by role.
- No transient errors.

### M-AUTH-11: Login With Invalid Password

Precondition:

- Existing account

Steps:

1. Enter correct email and wrong password.
2. Tap login.

Expected:

- Login fails with clear error.
- Session is not created.

### M-AUTH-12: Missing Profile Recovery Path

Precondition:

- Auth user exists, profile row manually deleted

Steps:

1. Login using valid auth credentials.

Expected:

- App detects missing profile.
- User is signed out and routed safely (no crash / no blocked spinner).

### M-AUTH-13: Session Persistence After Restart

Precondition:

- User logged in

Steps:

1. Force-close app.
2. Reopen app.

Expected:

- Session restores correctly.
- User lands in appropriate screen.

### M-AUTH-14: Logout Behavior

Precondition:

- User logged in on home screen

Steps:

1. Tap logout icon.

Expected:

- Session cleared.
- User redirected to login/role entry.

### M-UX-01: Android Hardware Back On Patient Home

Precondition:

- Logged in as patient, currently on patient home

Steps:

1. Press Android back button.

Expected:

- Exit confirmation dialog appears.
- Cancel keeps user in app.
- Exit closes app.

### M-UX-02: Android Hardware Back On Donor Home

Precondition:

- Logged in as donor, currently on donor home

Steps:

1. Press Android back button.

Expected:

- Exit confirmation dialog appears.
- Cancel keeps user in app.
- Exit closes app.

### M-PAT-01: Patient Linked Pool With Active Links

Precondition:

- Patient mapped to approved donor(s)

Steps:

1. Login as mapped patient.
2. Open Linked Pool tab.

Expected:

- Linked donor cards appear with expected details.

### M-PAT-02: Patient Linked Pool Empty State

Precondition:

- Patient has no approved link

Steps:

1. Login as unlinked patient.
2. Open Linked Pool tab.

Expected:

- Friendly empty/unlinked message appears.

### M-PAT-03: Book Appointment Valid Date

Precondition:

- Logged in patient with valid profile

Steps:

1. Open Book Appointment.
2. Pick a valid future date.
3. Submit booking.

Expected:

- Success confirmation shown.
- Appointment appears in Upcoming.

### M-PAT-04: Book Appointment Past Date Rejection

Precondition:

- Logged in patient

Steps:

1. Open Book Appointment.
2. Select a past date.
3. Submit.

Expected:

- Booking blocked.
- Clear validation error shown.

### M-PAT-05: Upcoming Appointment Rendering

Precondition:

- Patient has upcoming appointments

Steps:

1. Open Upcoming tab.

Expected:

- Appointments list loads correctly.
- Assigned donor info appears when available.

### M-PAT-06: History Appointment Rendering

Precondition:

- Patient has completed appointments

Steps:

1. Open History tab.

Expected:

- Completed history list appears with proper statuses.

### M-PAT-07: Calendar Export Visibility Rule

Precondition:

- Patient has upcoming appointment with donor assigned

Steps:

1. Open Upcoming tab.
2. Check action buttons for calendar export.

Expected:

- Calendar actions visible only when assignment exists.

### M-DON-01: Donor Linked Pool With Active Links

Precondition:

- Donor linked to approved patient(s)

Steps:

1. Login as donor.
2. Open Linked Pool tab.

Expected:

- Linked patient data is visible.

### M-DON-02: Donor Linked Pool Empty State

Precondition:

- Donor has no approved patient links

Steps:

1. Login as unlinked donor.
2. Open Linked Pool tab.

Expected:

- Empty state guidance appears.

### M-DON-03: Donor Accept Appointment

Precondition:

- Donor has at least one scheduled appointment

Steps:

1. Open Upcoming tab.
2. Tap Accept on one appointment.

Expected:

- Status updates to accepted.
- State persists after refresh/reopen.

### M-DON-04: Donor Decline Appointment

Precondition:

- Donor has at least one scheduled appointment

Steps:

1. Open Upcoming tab.
2. Tap Cancel/Decline.

Expected:

- Status updates to declined.
- State persists after refresh/reopen.

### M-DON-05: Donor History Rendering

Precondition:

- Donor has completed appointments

Steps:

1. Open History tab.

Expected:

- Donation history records show correctly.

### M-DON-06: Leaderboard With No Eligible Data

Precondition:

- Donor total donations equals zero

Steps:

1. Open donor leaderboard tab/section.

Expected:

- No leaderboard data message shown.
- Donor with zero donations not ranked.

### M-DON-07: Leaderboard With Eligible Data

Precondition:

- At least one donor has total_donations greater than zero

Steps:

1. Open donor leaderboard.

Expected:

- Ranked donors displayed.
- Order and counts look correct.

### M-DON-08: Donor Calendar Export Visibility Rule

Precondition:

- Donor has accepted appointment

Steps:

1. Open Upcoming section.
2. Check calendar controls.

Expected:

- Calendar actions shown after accept state.

### M-I18N-01: Language Switch Live Update

Precondition:

- Any mobile screen open

Steps:

1. Change language from top controls.
2. Observe visible labels.

Expected:

- Text updates immediately.
- No missing key placeholders.

### M-I18N-02: Language Persistence

Precondition:

- Language changed from default

Steps:

1. Restart app.

Expected:

- Previously selected language persists.

### M-THEME-01: Theme Switch Live Update

Precondition:

- Any mobile screen open

Steps:

1. Toggle light/dark/system modes.

Expected:

- Colors and text remain readable.
- Inputs/buttons remain accessible.

### M-OFFLINE-01: Offline Login/Fetch Handling

Precondition:

- Device network disabled

Steps:

1. Attempt login.
2. If already logged in, open screens that fetch remote data.

Expected:

- Graceful error messages.
- No app crash or infinite spinner.

## 5. Admin Web Test Scenarios

### W-CORE-01: Dashboard Loads

Precondition:

- Backend running

Steps:

1. Open web dashboard root page.
2. Navigate to Dashboard.

Expected:

- Dashboard widgets and appointment sections load.

### W-CORE-02: Stats Page Loads

Precondition:

- Analytics SQL already applied

Steps:

1. Navigate to Stats page.

Expected:

- Summary, supply-demand, and bottleneck sections load without fetch errors.

### W-CORE-03: Health Page Loads

Precondition:

- Backend running

Steps:

1. Navigate to Health page.

Expected:

- Operational indicators render.
- No fatal client errors.

### W-DIR-01: Directory Donors Tab

Precondition:

- Donor seed data exists

Steps:

1. Open Directory.
2. Go to Donors tab.

Expected:

- Donor list appears with expected cards/rows.

### W-DIR-02: Directory Patients Tab

Precondition:

- Patient seed data exists

Steps:

1. Open Directory.
2. Go to Patients tab.

Expected:

- Patient list appears with expected cards/rows.

### W-DIR-03: Donor Detail Modal

Precondition:

- At least one donor exists

Steps:

1. Open donor detail.

Expected:

- Modal opens and linked patients are visible or empty state shown.

### W-DIR-04: Patient Detail Modal

Precondition:

- At least one patient exists

Steps:

1. Open patient detail.

Expected:

- Modal opens and linked donors are visible or empty state shown.

### W-MAP-01: Create Approved Mapping

Precondition:

- Compatible donor-patient pair available

Steps:

1. In Directory mappings, choose patient and donor.
2. Save as approved mapping.

Expected:

- Mapping appears immediately.
- Patient and donor now visible in each other linked pools.

### W-MAP-02: Block Duplicate Mapping

Precondition:

- One mapping already exists for a pair

Steps:

1. Try creating same pair mapping again.

Expected:

- Duplicate prevented.
- Clear warning/error shown.

### W-MAP-03: Block Incompatible Blood Group Pairing

Precondition:

- Incompatible donor and patient blood groups available

Steps:

1. Attempt incompatible mapping.

Expected:

- Validation prevents save.

### W-MAP-04: Deactivate Mapping

Precondition:

- Active approved mapping exists

Steps:

1. Set mapping inactive.

Expected:

- Mapping status updates.
- Donor excluded from assignment options for that patient.

### W-APT-01: Open Appointment Detail Modal

Precondition:

- Dashboard has appointment data

Steps:

1. Click date cell with appointments.

Expected:

- Appointment detail modal opens.
- All date appointments listed.

### W-APT-02: Assign Donor To Unassigned Appointment

Precondition:

- Appointment exists with mapped eligible donor

Steps:

1. Open appointment modal.
2. Select donor.
3. Save assignment.

Expected:

- Status reflects assigned/scheduled with donor.
- Data persists on refresh.

### W-APT-03: Assignment Options Restricted To Linked Donors

Precondition:

- Patient has approved linked donors

Steps:

1. Open donor select list for that patient appointment.

Expected:

- Only approved linked donors are listed.

### W-APT-04: No-Link Assignment Block

Precondition:

- Patient with no approved links

Steps:

1. Open appointment modal.
2. Try to assign donor.

Expected:

- Assignment blocked.
- Clear instruction to create link first.

### W-APT-05: Status Lifecycle Valid Path

Precondition:

- Appointment in scheduled state

Steps:

1. Move appointment through accepted, donated, completed via supported UI/admin actions.

Expected:

- Valid transitions succeed.
- Timestamps/lifecycle fields update.

### W-APT-06: Invalid Status Transition Blocked

Precondition:

- Appointment in scheduled or accepted state

Steps:

1. Attempt an invalid transition (for example scheduled to completed directly) via API helper or admin path.

Expected:

- DB guard rejects invalid transition.
- Error is surfaced.

### W-RANK-01: Donor Ranking Panel In Modal

Precondition:

- Ranking SQL and endpoint available

Steps:

1. Open unassigned appointment modal.

Expected:

- Ranked donors load with scores and confidence labels.

### W-RANK-02: Select Donor From Ranked List

Precondition:

- Ranked list shown

Steps:

1. Choose donor from ranked suggestions.
2. Assign selected donor.

Expected:

- Assignment succeeds.
- Selected donor stored correctly.

### W-FALLBACK-01: Suggest Fallback For Declined/No-Show

Precondition:

- Appointment marked declined/no-show

Steps:

1. Trigger fallback suggestion action.

Expected:

- Suggested donors and dates returned.

### W-FALLBACK-02: Create Fallback Appointment

Precondition:

- Fallback suggestions available

Steps:

1. Select suggested donor/date.
2. Create fallback appointment.

Expected:

- New linked appointment created.
- original_appointment_id and reschedule metadata populated.

### W-FALLBACK-03: Reschedule Limit Enforcement

Precondition:

- Appointment already rescheduled 3 times

Steps:

1. Attempt another fallback creation.

Expected:

- Action rejected due to max reschedule limit.

### W-THEME-01: Theme Toggle + Persistence

Precondition:

- Web dashboard open

Steps:

1. Toggle theme.
2. Refresh browser.

Expected:

- Theme persists after reload.

### W-THEME-02: Contrast Check Across Pages

Precondition:

- Both themes tested

Steps:

1. Visit Dashboard, Directory, Stats, Health.
2. Check text on cards/badges/inputs/buttons.

Expected:

- No low-contrast unreadable text.

### W-A11Y-01: Keyboard Navigation

Precondition:

- Web dashboard open

Steps:

1. Navigate major controls with Tab/Shift+Tab.
2. Activate using Enter/Space.

Expected:

- Focus visible.
- Key actions usable without mouse.

## 6. API and Integration Scenarios

### API-01: CORS Preflight Success

Steps:

1. Send OPTIONS request to dashboard and analytics endpoints.

Expected:

- Returns 200/204 with CORS headers.

### API-02: Dashboard Retention Endpoint

Steps:

1. Call donor-retention endpoint.

Expected:

- JSON payload shape stable.
- No server error for normal data.

### API-03: Dashboard Leaderboard Endpoint

Steps:

1. Call donor-leaderboard endpoint.

Expected:

- Donors with total_donations equal to zero are excluded.

### API-04: Analytics Summary Endpoint

Steps:

1. Call analytics summary endpoint.

Expected:

- Returns aggregates matching DB view.

### API-05: Analytics Supply-Demand Endpoint

Steps:

1. Call analytics supply-demand endpoint.

Expected:

- Grouped data by blood group returned.

### API-06: Analytics Bottlenecks Endpoint

Steps:

1. Call analytics bottlenecks endpoint.

Expected:

- Bottleneck metrics returned, no malformed fields.

### API-07: Calendar ICS Endpoint

Steps:

1. Call calendar endpoint for valid appointment_id.

Expected:

- RFC 5545 ICS response with expected fields.

### API-08: Calendar Endpoint Invalid ID

Steps:

1. Call calendar endpoint with invalid/missing appointment_id.

Expected:

- Proper error status and message.

### API-09: Reminder Dedupe Behavior

Precondition:

- Reminder logs migration enabled

Steps:

1. Trigger sendDueReminders twice for same due set.

Expected:

- Duplicate reminders are not sent for same recipient/type window.

### API-10: Notification Timeline and Mark Read

Precondition:

- Notification center migration enabled

Steps:

1. Fetch timeline.
2. Mark one as read.
3. Mark all as read.
4. Fetch unread count.

Expected:

- Read status updates correctly.
- Unread count reflects changes.

## 7. Database Constraint and Guard Scenarios

### DB-01: Phone Format Constraint

Steps:

1. Try insert/update donor or patient with non-10-digit phone.

Expected:

- Operation rejected by check constraint.

### DB-02: Email Format Constraint

Steps:

1. Try insert/update invalid email.

Expected:

- Operation rejected.

### DB-03: Blood Group Constraint

Steps:

1. Try insert/update blood_group as X+, A, or empty.

Expected:

- Operation rejected.

### DB-04: Same-Table Email Uniqueness

Steps:

1. Insert two donor rows with same normalized email.

Expected:

- Second insert blocked.

### DB-05: Same-Table Phone Uniqueness

Steps:

1. Insert two patient rows with same phone.

Expected:

- Second insert blocked.

### DB-06: Cross-Table Email Uniqueness

Steps:

1. Insert donor with email already used by patient.

Expected:

- Blocked by cross-profile trigger.

### DB-07: Cross-Table Phone Uniqueness

Steps:

1. Insert patient with phone already used by donor.

Expected:

- Blocked by cross-profile trigger.

### DB-08: Lifecycle Guard Valid Transition

Steps:

1. Update appointment across valid statuses.

Expected:

- Accepted by DB.

### DB-09: Lifecycle Guard Invalid Transition

Steps:

1. Attempt invalid status jump.

Expected:

- Rejected with guard error.

### DB-10: Profile Completeness Guard

Steps:

1. Remove required profile field and attempt critical operation.

Expected:

- Operation blocked due to incomplete profile.

### DB-11: Safety Guard (Donor Interval/Availability)

Steps:

1. Attempt unsafe assignment/transition violating donor safety guard.

Expected:

- Operation blocked.

## 8. Regression and Reliability Scenarios

### REG-01: Rapid Tap Protection On Continue

Steps:

1. Enter valid signup data.
2. Tap Continue rapidly multiple times.

Expected:

- Single effective submission.
- No duplicate profile rows.

### REG-02: Refresh/Reopen Data Consistency

Steps:

1. Perform action (assign, accept, decline).
2. Refresh web or restart app.

Expected:

- Latest data persists and remains correct.

### REG-03: API Error Surface Quality

Steps:

1. Temporarily stop backend and load affected screens.

Expected:

- User sees understandable error feedback.
- App/web should not crash.

### REG-04: Empty Dataset Behavior

Steps:

1. Use account with no links and no appointments.

Expected:

- Empty states are shown instead of broken UI.

## 9. Execution Template

Use this format while running each test:

- Scenario ID:
- Tester:
- Date:
- Environment:
- Result: Pass or Fail
- Evidence: screenshot or short note
- Defect ID (if fail):

## 10. Exit Criteria

Release candidate is acceptable when:

- All critical scenarios pass: auth, booking, assignment, acceptance, completion, constraints
- No blocker defects remain open
- No data integrity violations in DB checks
- At least one full pass completed on Android and web
