# Database Migrations — Roadsmith SaaS

These are legacy application migrations retained for schema history. They are not a substitute for reconciling the live Supabase migration history before production use. Apply only after reviewing the target environment.

## Migration Index

| # | File | Purpose |
|---|------|---------|
| 001 | `001_schools_table.sql` | Root `schools` tenant table, `school_id` FK on `students_driver_ed/sessions/payments`, RPC functions `increment_seats_booked`/`get_seats_available`, RLS policies |
| 002 | `002_instructors.sql` | `instructors` table, `instructor_id` FK on `sessions`, reminder cols on students, soft-delete `deleted_at` |
| 003 | `003_security_hardening.sql` | Fixed `increment_seats_booked(school_id)` version, `processed_stripe_events` for webhook idempotency, audit log cols, age check constraint, RLS on all tables |
| 004 | `004_booking_schema.sql` | `session_types`, `instructor_availability`, `instructor_time_off`, `bookings` table, `get_available_slots()` function, RLS policies |
| 005 | `005_school_profiles_tca.sql` | `schools.slug`, `school_profiles` table, TCA cols on students (`enrollment_date`, `completion_date`, `certificate_number`), age NOT NULL |
| 006 | `006_subscription_status.sql` | `schools.subscription_status`, `subscription_id`, `trial_ends_at` |
| 007 | `007_add_active_column.sql` | `schools.active` BOOLEAN |
| 008 | `008_processed_stripe_events.sql` | `processed_stripe_events` table (Stripe webhook idempotency), 7-day auto-purge function |
| 009 | `009_bookings_missing_columns.sql` | Adds `session_id` FK, `deposit_amount_cents`, `confirmation_token`, `cancellation_reason`, `cancelled_at` to `bookings` |
| 010 | `010_schools_owner_email_unique.sql` | UNIQUE constraint on `schools.owner_email` |
| 012 | `012_atomic_seat_booking.sql` | `book_seat()` atomic RPC with `SELECT FOR UPDATE` row lock, DB-level oversell constraint on `sessions.seats_booked` |
| 013a | `013_command_center.sql` | Command-center preferences, compliance status, and activity log tables |
| 013b | `013_instructor_student_link.sql` | Optional primary instructor link on student records |
| 014 | `014_night_hours.sql` | Tennessee night-driving hours on student records |
| 015 | `015_bookings_student_id.sql` | Optional student link on bookings |
| 016 | `016_bookings_link_status.sql` | Booking-to-student link outcome tracking |

## Key Functions

- **`increment_seats_booked(session_id, school_id)`** — Increments `seats_booked` if under `max_seats` and session is `scheduled`. Used by booking flow.
- **`get_seats_available(session_id)`** — Returns `max_seats - seats_booked`.
- **`book_seat(...)`** — Atomic seat booking. Takes row lock on session, checks capacity, inserts booking, increments counter in single transaction. Prevents race condition overselling.
- **`get_available_slots(...)`** — Returns available session slots for a date range given school/instructor/session type.
- **`seed_session_types(school_id)`** — Seeds default session types for a new school (Traffic School 4h/8h, Private Lesson, Driving Assessment, Road Test Prep).

## Notes

- Migrations 001–005 contain RLS policies — do not skip these if setting up a new environment
- Migration 003 is the corrected version — the original was broken (referenced non-existent columns)
- Migration 008 `processed_stripe_events` table may conflict with migration 003 if both try to create it — migration 003 creates it first, migration 008 is idempotent (`CREATE TABLE IF NOT EXISTS`)
- Migration 012 `book_seat()` requires `payment_status` column on `bookings` — verify column exists before deploying code that calls `admin.rpc('book_seat')`
- Migration 011 was intentionally omitted from the public tree because it created an internal Mission Control activity table with an unsafe anonymous policy; its live-application status must be reconciled separately.
- The duplicate 013 prefix reflects legacy manual migration history; do not assume filename order is the live database order.
