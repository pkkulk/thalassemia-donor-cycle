# Smoke Test Checklist

Use this checklist before release after any change to mapping, appointments, or theming.

## Automated gates (run first)

- [ ] Web lint passes
  - Command: `cd aweb-dashboard && npx eslint src --ext .ts,.tsx`
- [ ] Web production build passes
  - Command: `cd aweb-dashboard && npm run build`

---

## A) Mapping Flow (Admin Web)

### A1. Create/approve mapping
- [ ] Open `Directory -> Mappings`
- [ ] Select patient + donor pair with compatible blood group
- [ ] Save approved link
- [ ] Expected: success message appears and link is visible under patient group

### A2. Duplicate prevention
- [ ] Try saving the same already-approved pair again
- [ ] Expected: warning shown; save blocked; no duplicate link created

### A3. Incompatible pair blocking
- [ ] Select ABO/Rh incompatible pair
- [ ] Expected: compatibility warning shown; save disabled

### A4. Deactivate mapping
- [ ] Click `Set Inactive` on an approved mapping
- [ ] Expected: status changes to inactive and donor becomes ineligible for assignment

---

## B) Assignment + Calendar Flow (Admin Web)

### B1. Open date modal from calendar
- [ ] In `Dashboard`, click a date tile with appointments
- [ ] Expected: `AppointmentDetailModal` opens with all appointments for that date

### B2. Linked-donor-only assignment
- [ ] For a patient with approved links, open donor dropdown
- [ ] Expected: only linked/approved donors listed

### B3. No-link guard
- [ ] For patient with no approved links, open date modal
- [ ] Expected: warning displayed and assignment unavailable

### B4. Status transition chain
- [ ] Assign donor -> donor accepts -> admin marks donated -> admin marks completed
- [ ] Expected: status flow is `Scheduled -> Accepted -> Donated -> Completed`

### B5. Date status coloring
- [ ] Verify calendar date tiles update as unassigned/partial/assigned
- [ ] Expected: color/state reflects donor assignment coverage for that date

---

## C) Directory Modals

### C1. Donor card details
- [ ] In `Directory -> Donors`, click a donor card
- [ ] Expected: donor modal opens and shows `Linked Patients` list
- [ ] Expected empty state when none: `No patients assigned`

### C2. Patient card details
- [ ] In `Directory -> Patients`, click a patient card
- [ ] Expected: patient modal opens and shows `Linked Donors` list
- [ ] Expected empty state when none: `No donors assigned`

---

## D) Mobile App - Patient

### D1. Linked donor pool visibility
- [ ] Login as patient with active/approved mapped donor
- [ ] Go to `Linked Pool` tab
- [ ] Expected: mapped donor list appears with name/blood group/phone

### D2. Upcoming appointments
- [ ] Go to `Upcoming` tab
- [ ] Expected: assigned donor card appears when donor assigned

### D3. History
- [ ] Go to `History` tab
- [ ] Expected: completed appointments listed correctly

---

## E) Mobile App - Donor

### E1. Linked patient pool visibility
- [ ] Login as donor with active mapping
- [ ] Go to `Linked Pool` tab
- [ ] Expected: mapped patient list appears with name/blood group/phone

### E2. Upcoming actions
- [ ] Go to `Upcoming` tab
- [ ] Accept and decline test appointments
- [ ] Expected: state updates reflect immediately and persist after refresh

### E3. History card clipping
- [ ] Go to `History` tab and scroll to bottom
- [ ] Expected: last card is fully visible (not cut off)

---

## F) Theme Smoke (Admin Web)

Perform all checks in both light and dark mode.

### F1. Theme toggle and persistence
- [ ] Toggle theme from top-right switch
- [ ] Refresh page
- [ ] Expected: previously selected theme persists

### F2. Contrast/readability
- [ ] Check cards, badges, text, inputs, links in Dashboard/Directory/Stats
- [ ] Expected: no low-contrast text; status badges are readable

### F3. Keyboard accessibility
- [ ] Navigate with `Tab`
- [ ] Expected: visible focus ring on interactive controls

---

## Sign-off

- [ ] Tested by:
- [ ] Date:
- [ ] Build SHA/Commit:
- [ ] Notes:
