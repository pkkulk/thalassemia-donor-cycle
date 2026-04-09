# 🚀 AI Implementation Checklist

Use this checklist to implement all AI components step by step.

---

## ✅ Phase 1: Database Setup (30 min)

- [ ] **Open Supabase Dashboard** → Go to SQL Editor
- [ ] **Run migrations for `patients` table:**
  ```sql
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20);
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_flag BOOLEAN DEFAULT false;
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities TEXT[] DEFAULT '{}';
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS recent_complications TEXT[] DEFAULT '{}';
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS transfusion_frequency_days INTEGER DEFAULT 28;
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  ```

- [ ] **Run migrations for `donor` table:**
  ```sql
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS last_donation_date DATE;
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS total_appointments INTEGER DEFAULT 0;
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS completed_appointments INTEGER DEFAULT 0;
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS avg_response_time_hours NUMERIC;
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false;
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  ALTER TABLE donor ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  ```

- [ ] **Run migrations for `appointments` table:**
  ```sql
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20);
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS donor_match_score NUMERIC;
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS donor_arrival DATE;
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_via VARCHAR(50);
  ```

- [ ] **Verify migrations:** Run these queries to check:
  ```sql
  SELECT column_name FROM information_schema.columns WHERE table_name='patients';
  SELECT column_name FROM information_schema.columns WHERE table_name='donor';
  SELECT column_name FROM information_schema.columns WHERE table_name='appointments';
  ```

---

## ✅ Phase 2: Update Sample Data (15 min)

- [ ] **Add test data to `donor` table:**
  ```sql
  UPDATE donor SET 
    last_donation_date = NOW() - INTERVAL '90 days',
    total_appointments = 10,
    completed_appointments = 9,
    avg_response_time_hours = 4,
    is_active = true,
    city = 'Mumbai'
  WHERE id = 'your-donor-id';
  ```

- [ ] **Add test data to `patients` table:**
  ```sql
  UPDATE patients SET 
    age = 15,
    city = 'Mumbai',
    transfusion_frequency_days = 28,
    emergency_flag = false
  WHERE id = 'your-patient-id';
  ```

- [ ] **Create sample appointment with completion status:**
  ```sql
  INSERT INTO appointments (patient_id, donor_id, date, status)
  VALUES ('patient-id', 'donor-id', NOW() - INTERVAL '30 days', 'Completed');
  ```

---

## ✅ Phase 3: Backend Setup (45 min)

- [ ] **Verify backend file structure:**
  ```bash
  ls -la backend-api/ai-services/
  # Should show:
  # - donorMatcher.js
  # - priorityScorer.js
  # - notificationGenerator.js
  ```

- [ ] **Check if files exist:**
  - [ ] `backend-api/ai-services/donorMatcher.js` ✓
  - [ ] `backend-api/ai-services/priorityScorer.js` ✓
  - [ ] `backend-api/ai-services/notificationGenerator.js` ✓
  - [ ] `backend-api/api/appointments/intelligent.js` ✓
  - [ ] `backend-api/api/admin/analytics.js` ✓

- [ ] **Install dependencies (if needed):**
  ```bash
  cd backend-api
  npm install
  # Should already have: resend, supabase, express, dotenv
  ```

- [ ] **Verify `.env` file has required vars:**
  ```
  RESEND_API_KEY=re_xxxxx (for email)
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
  ```

- [ ] **Test backend server starts:**
  ```bash
  cd backend-api
  npm run dev
  # Should start without errors
  ```

---

## ✅ Phase 4: Frontend Dashboard Setup (30 min)

- [ ] **Check if AI Dashboard component exists:**
  - [ ] `aweb-dashboard/src/components/AIAnalyticsDashboard.tsx` ✓

- [ ] **Add to dashboard page:**
  ```bash
  cd aweb-dashboard
  ```

- [ ] **Edit `src/app/dashboard/page.tsx`:**
  ```tsx
  // Add import at top
  import AIAnalyticsDashboard from '@/components/AIAnalyticsDashboard';

  // Add component in render
  export default function Dashboard() {
    return (
      <div>
        <Header/>
        <AIAnalyticsDashboard />  {/* ADD THIS LINE */}
        {/* existing components */}
      </div>
    );
  }
  ```

- [ ] **Verify API endpoints in component match backend:**
  - Check: `/api/admin/analytics?action=queue`
  - Check: `/api/admin/analytics?action=alerts`
  - Check: `/api/admin/analytics?action=stats`

- [ ] **Install any missing dependencies:**
  ```bash
  npm install react-icons
  ```

- [ ] **Build and test locally:**
  ```bash
  npm run dev
  # Open http://localhost:3000/dashboard
  ```

---

## ✅ Phase 5: API Testing (1 hour)

### Test 1: Donor Matching API

- [ ] **Create test patient appointment:**
  ```bash
  curl -X POST http://localhost:3000/api/appointments/intelligent \
    -H "Content-Type: application/json" \
    -d '{
      "patientId": "patient-uuid",
      "date": "2026-03-15",
      "isEmergency": false,
      "autoAssign": true
    }'
  ```

- [ ] **Expected response:**
  - Status should be `success` or `partial`
  - Should have `appointment.id`
  - Should have `patient_urgency.score` (0-100)
  - Should have `donor_assignment` (if donors available)

### Test 2: Analytics Queue API

- [ ] **Get prioritized queue:**
  ```bash
  curl http://localhost:3000/api/admin/analytics?action=queue
  ```

- [ ] **Expected response:**
  - `success: true`
  - Array of `queue` with patients sorted by urgency
  - Each patient has `urgency_score` (0-100)

### Test 3: Analytics Alerts API

- [ ] **Get critical alerts:**
  ```bash
  curl http://localhost:3000/api/admin/analytics?action=alerts
  ```

- [ ] **Expected response:**
  - `total_alerts` count
  - Arrays of alerts by severity
  - Each alert has actionable info

### Test 4: Donor Suggestions API

- [ ] **Get donor recommendations:**
  ```bash
  curl "http://localhost:3000/api/admin/analytics?action=donor-suggestions&patientId=xxx&date=2026-03-01"
  ```

- [ ] **Expected response:**
  - Array of `candidates` sorted by `matchScore`
  - Each candidate has `donor_name`, `reliability_percentage`, `reason`

### Test 5: Optimization API

- [ ] **Trigger schedule optimization:**
  ```bash
  curl -X POST http://localhost:3000/api/admin/analytics?action=optimize
  ```

- [ ] **Expected response:**
  - `optimized: X` (number of appointments matched)
  - `failed: Y` (number that couldn't be matched)
  - `suggestions: [...]` with details

---

## ✅ Phase 6: Email Testing (30 min)

- [ ] **Verify Resend API key is valid:**
  ```bash
  # In backend, test sending an email
  curl -X POST https://api.resend.com/emails \
    -H 'Authorization: Bearer YOUR_RESEND_KEY' \
    -H 'Content-Type: application/json' \
    -d '{
      "from": "onboarding@resend.dev",
      "to": "your-test@email.com",
      "subject": "Test",
      "text": "Test email"
    }'
  ```

- [ ] **Monitor email sending in logs:**
  ```bash
  # Watch backend logs
  docker-compose logs backend-api -f | grep -i email
  ```

- [ ] **Test sending email via API:**
  - Use intelligent appointment booking
  - Check Resend dashboard for delivered emails
  - Check donor's email inbox

---

## ✅ Phase 7: Dashboard Integration (1 hour)

- [ ] **Start development server:**
  ```bash
  cd aweb-dashboard
  npm run dev
  ```

- [ ] **Navigate to dashboard:**
  ```
  http://localhost:3000/dashboard
  ```

- [ ] **Verify AI Analytics Dashboard loads:**
  - [ ] Patient queue appears
  - [ ] Alert cards visible (if any alerts)
  - [ ] Stat cards show metrics
  - [ ] Colors and icons render correctly

- [ ] **Test interactions:**
  - [ ] Click on a patient → see donor suggestions
  - [ ] Click "Optimize" button → appointments get assigned
  - [ ] Data refreshes automatically (wait 5 min or manual refresh)

- [ ] **Test API calls from dashboard:**
  - Open DevTools → Network tab
  - Check that API calls are successful (200 status)
  - Verify response data structure

---

## ✅ Phase 8: Mobile App Integration (Optional, 30 min)

- [ ] **Update mobile app to use intelligent booking:**

  Edit `mobile-app/app/book-appointment.tsx`:
  ```typescript
  // Change from /api/appointments/new to /api/appointments/intelligent
  const response = await fetch('/api/appointments/intelligent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId,
      date: selectedDate,
      isEmergency,
      autoAssign: true  // Let AI assign donor
    })
  });
  ```

- [ ] **Update response handling in mobile app:**
  - Handle `status === 'success'` → show "Donor assigned"
  - Handle `status === 'partial'` → show "Waiting for admin"
  - Show assigned donor name if available

- [ ] **Test on mobile:**
  ```bash
  cd mobile-app
  npm run android  # for Android
  # or
  npm run ios      # for iOS
  ```

---

## ✅ Phase 9: Production Deployment (2 hours)

- [ ] **Docker setup for backend (if not done):**
  ```bash
  # Create or update Dockerfile in backend-api
  # Ensure it includes AI services
  ```

- [ ] **Vercel deployment for API:**
  ```bash
  cd backend-api
  vercel deploy --prod
  # Update API URLs in frontend .env
  ```

- [ ] **Deploy web dashboard:**
  ```bash
  cd aweb-dashboard
  npm run build
  vercel deploy --prod
  # Or use your deployment platform
  ```

- [ ] **Set environment variables in production:**
  - [ ] `RESEND_API_KEY` 
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`

- [ ] **Test all endpoints in production:**
  ```bash
  curl https://your-api.vercel.app/api/admin/analytics?action=queue
  ```

- [ ] **Monitor logs and errors:**
  - Set up error tracking (Sentry, LogRocket, etc.)
  - Monitor Resend email delivery

---

## ✅ Phase 10: Monitoring & Optimization (Ongoing)

- [ ] **Set up daily optimization cron job:**
  ```bash
  # Call POST /api/admin/analytics?action=optimize every day at 8 AM
  # Use a service like: AWS Lambda, Google Cloud Scheduler, etc.
  ```

- [ ] **Monitor key metrics:**
  - [ ] Success rate (completed/total)
  - [ ] Average matching score
  - [ ] Queue processing time
  - [ ] Email delivery rate

- [ ] **Collect feedback:**
  - Gather donor and patient feedback
  - Track unassigned appointments
  - Identify failing matching scenarios

- [ ] **Continuous improvement:**
  - Adjust scoring weights if needed
  - Add new data fields
  - Integrate real ML models

---

## 📋 Quick Reference

### Important URLs
```
Dashboard:  http://localhost:3000/dashboard
API Base:   http://localhost:3000/api
Supabase:   https://app.supabase.com
```

### Key Endpoints
```
POST   /api/appointments/intelligent
GET    /api/admin/analytics?action=queue
GET    /api/admin/analytics?action=alerts
GET    /api/admin/analytics?action=stats
GET    /api/admin/analytics?action=donor-suggestions
POST   /api/admin/analytics?action=optimize
```

### Key Files
```
Backend:
  - backend-api/ai-services/donorMatcher.js
  - backend-api/ai-services/priorityScorer.js
  - backend-api/ai-services/notificationGenerator.js
  - backend-api/api/appointments/intelligent.js
  - backend-api/api/admin/analytics.js

Frontend:
  - aweb-dashboard/src/components/AIAnalyticsDashboard.tsx
  - aweb-dashboard/src/app/dashboard/page.tsx
```

### Troubleshooting
```
❌ No donors found?
   → Check donor table has data
   → Check blood type compatibility
   → Check donation dates (56+ days)

❌ API returning 500?
   → Check backend logs
   → Verify Supabase credentials
   → Check API endpoint syntax

❌ Dashboard not loading?
   → Check browser console
   → Verify API CORS settings
   → Check API is running
```

---

## 🎉 Success Criteria

You'll know everything is working when:

✅ Patients can book appointments via `/api/appointments/intelligent`
✅ Donors are automatically matched and notified
✅ Admin dashboard shows prioritized patient queue
✅ Critical alerts appear for overdue patients
✅ "Optimize Schedule" button assigns donors to pending appointments
✅ Success rate & reliability metrics display correctly
✅ Emails are sent and delivered successfully

---

**Start with Phase 1 and work through sequentially. Each phase builds on the previous one!**

Good luck! 🚀

