# SPEC.md — Night Hours Tracking + SF-1256 Readiness

**Status:** Active development
**Updated:** 2026-05-31

---

## Goal

Fix SF-1256 ("Certification of 50 Hours Behind the Wheel") which is permanently blocked because the system doesn't track night hours. TN law requires 10 of the 50 hours to be night driving. This spec covers adding night hours tracking so the compliance checker can accurately report form readiness.

---

## What We're Building

1. **`night_hours` field** on `students_driver_ed` — cumulative night driving hours
2. **Session completion update** — accepts `night_driving_hours` and writes to student
3. **Compliance checker fix** — computes night hours from `students_driver_ed.night_hours` instead of saying "not tracked yet"
4. **Demo seed update** — add night session types and seed data with night hours

---

## Data Model

```
students_driver_ed:
  night_hours NUMERIC(5,1) DEFAULT 0  -- cumulative night driving hours
```

Session completion accepts:
```json
{
  "student_id": "uuid",
  "driving_hours": 1.5,
  "night_driving_hours": 0.5   // new field
}
```

Both hours are added to the student's running totals.

---

## Compliance Logic — SF-1256

The form checks (all must pass):

1. `permit_number` exists and is not `PENDING` or empty
2. `driving_hours >= 50` (total behind-the-wheel hours)
3. `night_hours >= 10` (night hours portion of the 50)

If any check fails, the form is `blocked` with specific missing reasons.
If all pass, the form is `ready`.

---

## Key Files to Change

| File | Change |
|---|---|
| `src/lib/migrations/014_night_hours.sql` | Add `night_hours` column to `students_driver_ed` |
| `src/app/api/school-admin/sessions/[id]/complete/route.ts` | Accept + track `night_driving_hours` |
| `src/lib/compliance/tennessee-teen-driver-forms.ts` | Add `night_hours` to `ComplianceStudent` type; fix SF-1256 logic |
| `src/app/api/school-admin/compliance/summary/route.ts` | Include `night_hours` in student query |
| `src/app/api/demo/students/route.ts` | Include `night_hours` in demo student query |
| `src/app/api/school-admin/students/[id]/compliance/route.ts` | Include `night_hours` in compliance query |
| `src/app/api/seed/route.ts` | Seed `night_hours` on demo students |

---

## Guardrails

- `night_hours` cannot exceed `driving_hours` — session completion should clamp
- Night hours are only logged when the instructor marks them during session completion
- Schema change is backward-compatible (nullable, default 0)

---

## Verification

1. `npm run build` — must pass
2. Manual: demo mode → complete a session with night hours → check compliance page shows SF-1256 less blocked