-- Seed data for Roadsmith SaaS demo
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Create demo school
INSERT INTO schools (id, name, owner_email, state, active, slug, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Driving School',
  'demo-operator@example.com',
  'TN',
  true,
  'demo-driving-school',
  NOW()
) ON CONFLICT DO NOTHING;

-- 2. Create instructors
INSERT INTO instructors (id, school_id, name, email, phone, license_number, active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Demo Instructor A', 'instructor-a@example.com', '0000000000', 'DEMO-LICENSE-A', true, NOW()),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Demo Instructor B', 'instructor-b@example.com', '0000000000', 'DEMO-LICENSE-B', true, NOW())
ON CONFLICT DO NOTHING;

-- 3. Create session types
INSERT INTO session_types (id, school_id, name, description, duration_minutes, price_cents, deposit_cents, color, tca_hours_credit, active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Traffic School (4 Hour)', 'State-approved driver improvement course — 4 classroom hours', 240, 14900, 2500, '#ef4444', 4.0, true, NOW()),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Private Lesson', 'One-on-one behind-the-wheel instruction', 60, 5500, 2500, '#06b6d4', NULL, true, NOW()),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Road Test Prep', 'Practice session to prepare for state road test', 60, 5500, 2500, '#10b981', NULL, true, NOW())
ON CONFLICT DO NOTHING;

-- 4. Instructor availability (weekly recurring)
INSERT INTO instructor_availability (instructor_id, day_of_week, start_time, end_time, active, created_at)
VALUES
  -- Demo Instructor A: Mon-Fri 8am-5pm (day_of_week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
  ('00000000-0000-0000-0000-000000000010', 1, '08:00', '17:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000010', 2, '08:00', '17:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000010', 3, '08:00', '17:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000010', 4, '08:00', '17:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000010', 5, '08:00', '17:00', true, NOW()),
  -- Demo Instructor B: Tue-Sat 9am-6pm
  ('00000000-0000-0000-0000-000000000011', 2, '09:00', '18:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000011', 3, '09:00', '18:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000011', 4, '09:00', '18:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000011', 5, '09:00', '18:00', true, NOW()),
  ('00000000-0000-0000-0000-000000000011', 6, '09:00', '18:00', true, NOW())
ON CONFLICT DO NOTHING;

-- 5. Sessions for next 2 weeks
INSERT INTO sessions (id, school_id, instructor_id, session_type_id, start_date, start_time, end_time, max_seats, seats_booked, location, cancelled, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', to_char(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '09:00', '13:00', 8, 3, 'Oak Ridge, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000021', to_char(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '14:00', '15:00', 1, 0, 'Oak Ridge, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000020', to_char(NOW() + INTERVAL '2 days', 'YYYY-MM-DD'), '09:00', '13:00', 8, 5, 'Knoxville, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022', to_char(NOW() + INTERVAL '2 days', 'YYYY-MM-DD'), '14:00', '15:00', 1, 1, 'Knoxville, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000021', to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), '08:00', '09:00', 1, 0, 'Oak Ridge, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', to_char(NOW() + INTERVAL '4 days', 'YYYY-MM-DD'), '09:00', '13:00', 8, 7, 'Oak Ridge, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', to_char(NOW() + INTERVAL '5 days', 'YYYY-MM-DD'), '10:00', '11:00', 1, 0, 'Knoxville, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000037', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000022', to_char(NOW() + INTERVAL '6 days', 'YYYY-MM-DD'), '09:00', '10:00', 1, 0, 'Oak Ridge, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000038', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', to_char(NOW() + INTERVAL '8 days', 'YYYY-MM-DD'), '09:00', '13:00', 8, 2, 'Oak Ridge, TN', false, NOW()),
  ('00000000-0000-0000-0000-000000000039', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', to_char(NOW() + INTERVAL '9 days', 'YYYY-MM-DD'), '09:00', '10:00', 1, 0, 'Knoxville, TN', false, NOW())
ON CONFLICT DO NOTHING;

-- 6. Students with varied TCA progress
INSERT INTO students_driver_ed (id, school_id, legal_name, email, phone, dob, permit_number, classroom_hours, driving_hours, enrollment_date, certificate_issued_at, created_at)
VALUES
  -- New enrollee
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'Emma Thompson', 'emmathompson@email.com', '8655550001', '2009-03-15', 'TN-PER-8812', 0.0, 0.0, CURRENT_DATE, NULL, NOW()),
  -- Early progress
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'James Wilson', 'jameswilson@email.com', '8655550002', '2009-07-22', 'TN-PER-8834', 4.0, 2.0, CURRENT_DATE - INTERVAL '5 days', NULL, NOW()),
  -- Mid progress
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', 'Sophia Martinez', 'sophiamartinez@email.com', '8655550003', '2009-01-08', 'TN-PER-7752', 4.0, 4.0, CURRENT_DATE - INTERVAL '12 days', NULL, NOW()),
  -- Nearly done
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000001', 'Liam Johnson', 'liamjohnson@email.com', '8655550004', '2008-11-30', 'TN-PER-9901', 6.0, 5.0, CURRENT_DATE - INTERVAL '20 days', NULL, NOW()),
  -- Complete
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000001', 'Olivia Brown', 'oliviabrown@email.com', '8655550005', '2008-09-14', 'TN-PER-6621', 6.0, 6.0, CURRENT_DATE - INTERVAL '30 days', generate_certificate_number('00000000-0000-0000-0000-000000000044'), NOW()),
  -- Another mid-progress student
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000001', 'Noah Davis', 'noahdavis@email.com', '8655550006', '2009-05-19', 'TN-PER-4412', 4.0, 3.0, CURRENT_DATE - INTERVAL '8 days', NULL, NOW()),
  -- New enrollee 2
  ('00000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000001', 'Ava Garcia', 'avagarcia@email.com', '8655550007', '2009-08-03', NULL, 0.0, 0.0, CURRENT_DATE, NULL, NOW()),
  -- Complete 2
  ('00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000001', 'Ethan Miller', 'ethanmill@email.com', '8655550008', '2008-12-27', 'TN-PER-3345', 6.0, 6.0, CURRENT_DATE - INTERVAL '45 days', generate_certificate_number('00000000-0000-0000-0000-000000000047'), NOW())
ON CONFLICT DO NOTHING;

-- 7. Bookings (confirmed sessions for the next few days)
INSERT INTO bookings (id, school_id, session_type_id, instructor_id, session_date, session_time, student_name, student_email, student_phone, status, reminder_48h_sent, reminder_4h_sent, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', to_char(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '09:00', 'Emma Thompson', 'emmathompson@email.com', '8655550001', 'confirmed', false, false, NOW()),
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', to_char(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '14:00', 'James Wilson', 'jameswilson@email.com', '8655550002', 'confirmed', false, false, NOW()),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000011', to_char(NOW() + INTERVAL '2 days', 'YYYY-MM-DD'), '09:00', 'Sophia Martinez', 'sophiamartinez@email.com', '8655550003', 'confirmed', false, false, NOW()),
  ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', to_char(NOW() + INTERVAL '2 days', 'YYYY-MM-DD'), '14:00', 'Noah Davis', 'noahdavis@email.com', '8655550006', 'confirmed', false, false, NOW()),
  ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', to_char(NOW() + INTERVAL '4 days', 'YYYY-MM-DD'), '09:00', 'Liam Johnson', 'liamjohnson@email.com', '8655550004', 'confirmed', false, false, NOW())
ON CONFLICT DO NOTHING;

COMMIT;
