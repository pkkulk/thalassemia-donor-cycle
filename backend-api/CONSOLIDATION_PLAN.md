# Vercel Function Consolidation Plan

## Problem
Currently have 19 Serverless Functions (limit is 12 on Hobby plan)

## Current Functions (19)
- **Donors** (3): rank, profile, nudge
- **Appointments** (5): new, create-fallback, intelligent, suggest-fallback, calendar
- **Notifications** (6): sendDueReminders, sendReminderEmail, unread-count, mark-read, sendDonorEmail, timeline
- **Dashboard** (2): donor-retention, donor-leaderboard
- **Analytics** (3): supply-demand, bottlenecks, summary

## Consolidation Strategy → 10 Functions

### 1. **Donors Router** (1 function replaces 3)
- Combine: rank.js, profile.js, nudge.js → `api/donors/index.js`
- Routes based on `action` query param:
  - `?action=rank` → donor ranking
  - `?action=profile` → donor profile
  - `?action=nudge` → nudge sender
- **Saves 2 functions**

### 2. **Appointments Router** (2 functions replace 5)
- Split into two functions based on complexity:
  - `api/appointments/index.js` → new, create-fallback, calendar (standard requests)
  - `api/appointments/intelligent.js` → intelligent matching (heavy computation)
  - Remove: suggest-fallback (consolidate into intelligent)
- **Saves 3 functions**

### 3. **Notifications Router** (2 functions replace 6)
- `api/notifications/index.js` → unread-count, mark-read, timeline (read/update)
- `api/notifications/send.js` → sendDueReminders, sendReminderEmail, sendDonorEmail (sending)
- Cron job updated to call `/api/notifications/send?type=reminder`
- **Saves 4 functions**

### 4. **Dashboard** (1 function replaces 2)
- Combine: donor-retention.js, donor-leaderboard.js → `api/dashboard/index.js`
- Routes based on `metric` query param
- **Saves 1 function**

### 5. **Analytics** (1 function replaces 3)
- Combine: supply-demand, bottlenecks, summary → `api/analytics/index.js`
- Routes based on `report` query param
- **Saves 2 functions**

## Final Count: 10 Functions
✓ Under 12 limit (with 2 functions margin for growth)

## Migration Steps
1. Create unified router functions
2. Update frontend API calls to use action/metric/report params
3. Update cron job in vercel.json
4. Test all endpoints
5. Delete old individual files
6. Deploy
