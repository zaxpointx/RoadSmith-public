# SPEC.md - TDC Autopilot v2

**Status:** Active development
**Updated:** 2026-05-28

---

## Goal

Build the $99/mo driving school autopilot: a small school imports its operation in under 10 minutes, uses one dashboard for scheduling, students, payments, and Tennessee compliance, then stops relying on Google Calendar, Wix, paper files, and Venmo.

The product promise is:

> "I imported my entire operation in one click and haven't thought about my old system since."

---

## Target Customer

Small Tennessee driving schools with 1-3 instructors that currently run on scattered tools:

- Google Calendar or phone scheduling
- Wix/Squarespace public pages
- Paper student folders
- Venmo/Cash App/manual deposits
- Manually prepared teen driver paperwork

---

## Current Baseline

Already present in the repo:

- Public booking flow with Stripe deposit
- School admin dashboard
- Students, instructors, sessions, calendar, billing, reports
- CSV student import
- Demo mode
- Onboarding assistant
- TCA-style progress tracking with classroom and driving hours
- Booking lifecycle helper that can create/link student records

The missing enterprise spine is not "more pages." It is activation and compliance:

- clear first-run checklist
- reliable import outcome
- student record readiness
- Tennessee teen driver form readiness
- owner dashboard actions that make the school operational immediately

---

## Tennessee Compliance Forms

Source checks:

- Tennessee Driver Services says applicants under 18 need proof of school attendance, and the Certificate of Compulsory School Attendance is valid for 30 days.
- Tennessee Driver Services lists the 50-hour certificate as part of the teen graduated license path; the driver manual states Form SF-1256 confirms at least 50 behind-the-wheel hours including 10 night hours.
- Tennessee state materials identify Minor/Teenage Affidavit and Cancellation as SF-0259.

Build these as compliance artifacts, not generic "forms":

| Form | Name | Product Meaning |
|---|---|---|
| `SF-1010` | Certificate of Compulsory School Attendance | Track attendance-proof readiness and 30-day freshness |
| `SF-1256` | Certification of 50 Hours Behind the Wheel | Track 50 total hours and 10 night hours requirement; current schema only stores school driving hours |
| `SF-0259` | Minor/Teenage Affidavit and Cancellation | Track parent/guardian signature and financial responsibility readiness |

Important data gap: current schema has `driving_hours` but not `total_guardian_driving_hours`, `night_driving_hours`, parent legal name, address, or signature state. The first implementation should surface readiness and missing fields without pretending the forms can be fully auto-filed.

---

## First Build Slice

### 1. Compliance Definitions

Add reusable Tennessee teen-driver form definitions and readiness helpers.

Inputs:

- student name
- DOB
- permit number
- parent email
- classroom hours
- driving hours
- certificate issued timestamp
- enrollment date

Outputs:

- form list
- status: `ready`, `needs_info`, or `blocked`
- missing requirements
- next action label

### 2. School Admin Compliance Page

Route: `/school-admin/compliance`

What the owner sees:

- Count of students ready for each form
- Count of students blocked by missing info
- Student-by-student readiness table
- Clear "missing" chips, so import cleanup becomes obvious
- Links back to student records/import

### 3. Navigation

Add Compliance to the school admin sidebar and mobile nav.

---

## Later Slices

### Import Autopilot

- Better CSV column mapping
- Preview normalized rows
- Dedupe confidence
- Import summary with cleanup tasks
- Google Calendar ingest path

### Form Generation

- Printable PDF/HTML for each Tennessee form
- Store generated timestamp and source data snapshot
- Require manual review before download/signature
- Add fields for guardian name, relationship, address, night hours, and attendance proof date

### Activation Dashboard

- One "Finish setup" task rail:
  - import students
  - add instructors
  - define session types
  - connect Stripe
  - publish booking link
  - resolve compliance blockers

### Booking-to-Student Link

- On confirmed booking, create or link `students_driver_ed`
- Show booking source on student record
- Avoid duplicate students by email + DOB + school

---

## Guardrails

- Do not invent government submission capability.
- Do not mark SF-1256 fully ready until total 50 hours and 10 night hours are modeled.
- Do not expose decrypted student PII outside authenticated school admin/demo flows.
- Keep UI dense and operational, not marketing-style.
- Build against the actual schema, not migration assumptions.

---

## Verification

Before shipping a slice:

1. `npm run typecheck`
2. `npm run build`
3. Manual check of `/school-admin/compliance` in demo mode
