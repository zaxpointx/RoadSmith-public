# Roadsmith database schema reference

This is a public-safe reference for application code and review. It describes
the fields the runtime expects without identifying a hosted project, exposing
credentials, or documenting privileged inspection procedures.

---

## `sessions`

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid | PK |
| `start_date` | date | |
| `start_time` | text | Added via Migration 011 (2026-05-03) — default '09:00' |
| `end_date` | date | |
| `max_seats` | integer | |
| `seats_booked` | integer | |
| `created_at` | timestamp | |
| `school_id` | uuid | FK → schools |
| `instructor_id` | uuid | |
| `session_type_id` | uuid | FK → session_types |
| `status` | text | EXISTS — no separate `cancelled` boolean column |
| `location` | text | |

**No `cancelled` column. No `deleted_at` column.**

---

## `students_driver_ed`

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid | PK |
| `legal_name` | text | |
| `permit_number` | text | |
| `dob` | date | |
| `parent_email` | text | |
| `contract_signed_url` | text | |
| `classroom_hours` | numeric | |
| `driving_hours` | numeric | |
| `certificate_issued_at` | timestamp | nullable |
| `class_session_id` | uuid | FK → sessions |
| `created_at` | timestamp | |
| `permit_expiration` | date | |
| `date_of_birth` | date | |
| `address_street` | text | |
| `address_city` | text | |
| `emergency_contact_name` | text | |
| `emergency_contact_phone` | text | |
| `signature_url` | text | |
| `school_id` | uuid | FK → schools |
| `enrollment_date` | date | EXISTS |
| `completion_date` | date | nullable |
| `certificate_number` | text | nullable |
| `reminder_72h_sent` | boolean | |
| `reminder_24h_sent` | boolean | |
| `dob_encrypted` | text | |
| `permit_encrypted` | text | |

**No `deleted_at` column.**

---

## `bookings`

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid | PK |
| `school_id` | uuid | FK → schools |
| `session_type_id` | uuid | FK → session_types (nullable) |
| `instructor_id` | uuid | nullable |
| `session_date` | date | |
| `session_time` | text | |
| `student_name` | text | |
| `student_email` | text | |
| `student_phone` | text | |
| `status` | text | |
| `payment_status` | text | |
| `stripe_payment_intent_id` | text | nullable |
| `booking_token` | text | EXISTS |
| `notes` | text | nullable |
| `created_at` | timestamp | |
| `reminder_48h_sent` | boolean | |
| `reminder_4h_sent` | boolean | |
| `session_id` | uuid | FK → sessions (nullable) |
| `deposit_amount_cents` | integer | |
| `confirmation_token` | text | EXISTS — BOTH `booking_token` AND `confirmation_token` present |
| `cancellation_reason` | text | nullable |
| `cancelled_at` | timestamp | nullable |

**Has BOTH `booking_token` AND `confirmation_token`.**

---

## `schools`

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | |
| `owner_email` | text | |
| `owner_name` | text | |
| `phone` | text | |
| `state` | text | |
| `license_number` | text | |
| `plan_tier` | text | |
| `stripe_customer_id` | text | nullable |
| `service_zips` | text | |
| `created_at` | timestamp | |
| `slug` | text | |
| `owner_user_id` | uuid | nullable |
| `subscription_status` | text | |
| `subscription_id` | text | nullable |
| `trial_ends_at` | timestamp | nullable |
| `active` | boolean | |

**No `monthly_revenue` column.**

---

## `session_types`

| Column | Type (inferred) | Notes |
|---|---|---|
| `id` | uuid | PK |
| `school_id` | uuid | FK → schools |
| `name` | text | |
| `description` | text | |
| `duration_minutes` | integer | |
| `price_cents` | integer | |
| `deposit_cents` | integer | |
| `color` | text | |
| `tca_hours_credit` | numeric | nullable |
| `active` | boolean | |
| `created_at` | timestamp | |

---

## Summary of Key Questions

| Question | Answer |
|---|---|
| `sessions` has `cancelled` column? | **NO** — has `status` text field instead |
| `sessions` has `start_time`? | **NO** — has `start_date` (date only) and `end_date` |
| `sessions` has `deleted_at`? | **NO** |
| `students_driver_ed` has `deleted_at`? | **NO** |
| `students_driver_ed` has `enrollment_date`? | **YES** |
| `bookings` has `booking_token`? | **YES** |
| `bookings` has `confirmation_token`? | **YES** (both exist) |
| `schools` has `monthly_revenue`? | **NO** |

---

Source: application types, migrations, and reviewed runtime assumptions.

Live schema verification belongs in an authenticated, private operator runbook.
