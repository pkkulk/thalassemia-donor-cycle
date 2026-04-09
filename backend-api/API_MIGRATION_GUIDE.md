# API Consolidation Migration Guide

## Summary
✅ Consolidated 19 functions to 10 functions (50% reduction)
✅ Under 12 function limit with 2 functions margin for growth

## Before → After Mapping

### 1. **Donors** (3 → 1 function)
| Old Endpoint | New Endpoint |
|---|---|
| `/api/donors/rank?appointment_id=X` | `/api/donors?action=rank&appointment_id=X` |
| `/api/donors/profile?donor_id=X` | `/api/donors?action=profile&donor_id=X` |
| `/api/donors/nudge` (POST) | `/api/donors?action=nudge&donor_id=X` (POST with body) |

### 2. **Appointments** (5 → 2 functions)
**Router 1: `/api/appointments` (index.js)** - 4 actions
| Old Endpoint | New Endpoint |
|---|---|
| `/api/appointments/new` (POST) | `/api/appointments?action=create` (POST) |
| `/api/appointments/create-fallback` (POST) | `/api/appointments?action=create-fallback` (POST) |
| `/api/appointments/suggest-fallback` (POST) | `/api/appointments?action=suggest-fallback` (POST) |
| `/api/appointments/calendar?appointment_id=X` | `/api/appointments?action=calendar&appointment_id=X` |

**Router 2: `/api/appointments/intelligent`** - Unchanged (heavy computation kept separate)
| Old Endpoint | New Endpoint |
|---|---|
| `/api/appointments/intelligent` (POST) | `/api/appointments/intelligent` (POST) [UNCHANGED] |

### 3. **Notifications** (6 → 2 functions)
**Router 1: `/api/notifications` (index.js)** - Read/management actions
| Old Endpoint | New Endpoint |
|---|---|
| `/api/notifications/unread-count?role=X&patient_id=Y` | `/api/notifications?action=unread-count&role=X&patient_id=Y` |
| `/api/notifications/mark-read` (PATCH) | `/api/notifications?action=mark-read` (PATCH) |
| `/api/notifications/timeline?role=X&patient_id=Y` | `/api/notifications?action=timeline&role=X&patient_id=Y` |

**Router 2: `/api/notifications/send`** - Sending actions
| Old Endpoint | New Endpoint |
|---|---|
| `/api/notifications/sendDueReminders` (POST/GET) | `/api/notifications/send?action=send-due-reminders` (POST) |
| `/api/notifications/sendReminderEmail` (POST) | `/api/notifications/send?action=send-reminder-email` (POST) |
| `/api/notifications/sendDonorEmail` (POST) | `/api/notifications/send?action=send-donor-email` (POST) |

**Cron Update:**
```json
{
  "path": "/api/notifications/send?action=send-due-reminders",
  "schedule": "0 7 * * *"
}
```

### 4. **Dashboard** (2 → 1 function)
| Old Endpoint | New Endpoint |
|---|---|
| `/api/dashboard/donor-retention` | `/api/dashboard?metric=retention` |
| `/api/dashboard/donor-leaderboard?limit=10` | `/api/dashboard?metric=leaderboard&limit=10` |

### 5. **Analytics** (3 → 1 function)
| Old Endpoint | New Endpoint |
|---|---|
| `/api/analytics/summary` | `/api/analytics?report=summary` |
| `/api/analytics/supply-demand` | `/api/analytics?report=supply-demand` |
| `/api/analytics/bottlenecks` | `/api/analytics?report=bottlenecks` |

## Files to Delete (Optional - for cleanup)
After testing in production:
```
backend-api/api/donors/rank.js
backend-api/api/donors/profile.js
backend-api/api/donors/nudge.js
backend-api/api/appointments/new.js
backend-api/api/appointments/create-fallback.js
backend-api/api/appointments/suggest-fallback.js
backend-api/api/appointments/calendar.js
backend-api/api/notifications/unread-count.js
backend-api/api/notifications/mark-read.js
backend-api/api/notifications/timeline.js
backend-api/api/notifications/sendDueReminders.js
backend-api/api/notifications/sendReminderEmail.js
backend-api/api/notifications/sendDonorEmail.js
backend-api/api/dashboard/donor-retention.js
backend-api/api/dashboard/donor-leaderboard.js
backend-api/api/analytics/summary.js
backend-api/api/analytics/supply-demand.js
backend-api/api/analytics/bottlenecks.js
```

## Frontend Code Updates Required

### Search & Replace Examples

**1. Donors API**
```javascript
// OLD
fetch('/api/donors/rank?appointment_id=' + apptId)
// NEW
fetch('/api/donors?action=rank&appointment_id=' + apptId)

// OLD
fetch(`/api/donors/profile?donor_id=${donorId}`)
// NEW
fetch(`/api/donors?action=profile&donor_id=${donorId}`)
```

**2. Appointments API**
```javascript
// OLD
fetch('/api/appointments/new', { method: 'POST', body: {...} })
// NEW
fetch('/api/appointments?action=create', { method: 'POST', body: {...} })

// OLD
fetch('/api/appointments/calendar?appointment_id=' + apptId)
// NEW
fetch('/api/appointments?action=calendar&appointment_id=' + apptId)
```

**3. Notifications API**
```javascript
// OLD
fetch(`/api/notifications/unread-count?role=donor&donor_id=${donorId}`)
// NEW
fetch(`/api/notifications?action=unread-count&role=donor&donor_id=${donorId}`)

// OLD
fetch('/api/notifications/send-donor-email', { method: 'POST', ... })
// NEW
fetch('/api/notifications/send?action=send-donor-email', { method: 'POST', ... })
```

**4. Dashboard API**
```javascript
// OLD
fetch('/api/dashboard/donor-retention')
// NEW
fetch('/api/dashboard?metric=retention')

// OLD
fetch('/api/dashboard/donor-leaderboard?limit=10')
// NEW
fetch('/api/dashboard?metric=leaderboard&limit=10')
```

**5. Analytics API**
```javascript
// OLD
fetch('/api/analytics/summary')
// NEW
fetch('/api/analytics?report=summary')

// OLD
fetch('/api/analytics/supply-demand')
// NEW
fetch('/api/analytics?report=supply-demand')
```

## Testing Checklist

- [ ] Test each consolidated endpoint with sample requests
- [ ] Verify cron job configuration in vercel.json
- [ ] Test all query parameters
- [ ] Verify error responses match old behavior
- [ ] Test with real mobile/web clients
- [ ] Monitor logs after deployment

## Deployment Steps

1. **Verify build**: Vercel should now recognize ≤10 functions (instead of 19)
2. **Update frontend API calls** to use new routes (see examples above)
3. **Test in staging** before production
4. **Deploy new backend** with consolidated routers
5. **Deploy frontend** with updated API calls
6. **Monitor** for any API failures in logs
7. **Clean up old files** after confirming everything works

## Rollback Plan

If issues occur, you can:
1. Revert to previous git commit
2. Redeploy old code (19 functions)
3. Identify the issue from logs
4. Fix and retry

All responses remain the same - only endpoint structure changed!
