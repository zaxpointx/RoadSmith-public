import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SEED_SECRET = process.env.SEED_SECRET;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    if (!SEED_SECRET) {
      return NextResponse.json({ error: 'Seed endpoint not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const day3 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const day4 = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];
    const day5 = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const day6 = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];
    const day8 = new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];
    const day9 = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];

    // Get existing school
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('slug', 'demo-driving-school')
      .maybeSingle();

    const schoolId = existingSchool?.id || '00000000-0000-0000-0000-000000000001';

    const results = [];

    // 1. Instructors
    const { error: instrErr } = await supabase.from('instructors').upsert([
      { id: '00000000-0000-0000-0000-000000000010', school_id: schoolId, name: 'Demo Instructor A', email: 'instructor-a@example.com', phone: '0000000000', license_number: 'DEMO-LICENSE-A', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000011', school_id: schoolId, name: 'Demo Instructor B', email: 'instructor-b@example.com', phone: '0000000000', license_number: 'DEMO-LICENSE-B', active: true, created_at: now },
    ], { onConflict: 'id' });
    results.push({ table: 'instructors', error: instrErr?.message });

    // 2. Session Types
    const { error: stErr } = await supabase.from('session_types').upsert([
      { id: '00000000-0000-0000-0000-000000000020', school_id: schoolId, name: 'Traffic School (4 Hour)', description: 'State-approved driver improvement course — 4 classroom hours', duration_minutes: 240, price_cents: 14900, deposit_cents: 2500, color: '#ef4444', tca_hours_credit: 4.0, active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000021', school_id: schoolId, name: 'Private Lesson', description: 'One-on-one behind-the-wheel instruction', duration_minutes: 60, price_cents: 5500, deposit_cents: 2500, color: '#06b6d4', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000022', school_id: schoolId, name: 'Road Test Prep', description: 'Practice session to prepare for state road test', duration_minutes: 60, price_cents: 5500, deposit_cents: 2500, color: '#10b981', active: true, created_at: now },
    ], { onConflict: 'id' });
    results.push({ table: 'session_types', error: stErr?.message });

    // 3. Instructor Availability
    const { error: availErr } = await supabase.from('instructor_availability').upsert([
      { id: '00000000-0000-0000-0000-000000000100', instructor_id: '00000000-0000-0000-0000-000000000010', day_of_week: 1, start_time: '08:00', end_time: '17:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000101', instructor_id: '00000000-0000-0000-0000-000000000010', day_of_week: 2, start_time: '08:00', end_time: '17:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000102', instructor_id: '00000000-0000-0000-0000-000000000010', day_of_week: 3, start_time: '08:00', end_time: '17:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000103', instructor_id: '00000000-0000-0000-0000-000000000010', day_of_week: 4, start_time: '08:00', end_time: '17:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000104', instructor_id: '00000000-0000-0000-0000-000000000010', day_of_week: 5, start_time: '08:00', end_time: '17:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000110', instructor_id: '00000000-0000-0000-0000-000000000011', day_of_week: 2, start_time: '09:00', end_time: '18:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000111', instructor_id: '00000000-0000-0000-0000-000000000011', day_of_week: 3, start_time: '09:00', end_time: '18:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000112', instructor_id: '00000000-0000-0000-0000-000000000011', day_of_week: 4, start_time: '09:00', end_time: '18:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000113', instructor_id: '00000000-0000-0000-0000-000000000011', day_of_week: 5, start_time: '09:00', end_time: '18:00', active: true, created_at: now },
      { id: '00000000-0000-0000-0000-000000000114', instructor_id: '00000000-0000-0000-0000-000000000011', day_of_week: 6, start_time: '09:00', end_time: '18:00', active: true, created_at: now },
    ], { onConflict: 'id' });
    results.push({ table: 'instructor_availability', error: availErr?.message });

    // 4. Sessions — ACTUAL COLUMNS: id, start_date, end_date, max_seats, seats_booked, school_id, instructor_id, session_type_id, status, location
    const { error: sessionsErr } = await supabase.from('sessions').upsert([
      { id: '00000000-0000-0000-0000-000000000030', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000010', session_type_id: '00000000-0000-0000-0000-000000000020', start_date: tomorrow, end_date: tomorrow, max_seats: 8, seats_booked: 3, status: 'scheduled', location: 'Oak Ridge, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000031', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000010', session_type_id: '00000000-0000-0000-0000-000000000021', start_date: tomorrow, end_date: tomorrow, max_seats: 1, seats_booked: 0, status: 'scheduled', location: 'Oak Ridge, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000032', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000011', session_type_id: '00000000-0000-0000-0000-000000000020', start_date: day2, end_date: day2, max_seats: 8, seats_booked: 5, status: 'scheduled', location: 'Knoxville, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000033', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000011', session_type_id: '00000000-0000-0000-0000-000000000022', start_date: day2, end_date: day2, max_seats: 1, seats_booked: 1, status: 'scheduled', location: 'Knoxville, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000034', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000010', session_type_id: '00000000-0000-0000-0000-000000000021', start_date: day3, end_date: day3, max_seats: 1, seats_booked: 0, status: 'scheduled', location: 'Oak Ridge, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000035', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000010', session_type_id: '00000000-0000-0000-0000-000000000020', start_date: day4, end_date: day4, max_seats: 8, seats_booked: 7, status: 'scheduled', location: 'Oak Ridge, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000036', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000011', session_type_id: '00000000-0000-0000-0000-000000000021', start_date: day5, end_date: day5, max_seats: 1, seats_booked: 0, status: 'scheduled', location: 'Knoxville, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000037', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000010', session_type_id: '00000000-0000-0000-0000-000000000022', start_date: day6, end_date: day6, max_seats: 1, seats_booked: 0, status: 'scheduled', location: 'Oak Ridge, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000038', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000010', session_type_id: '00000000-0000-0000-0000-000000000020', start_date: day8, end_date: day8, max_seats: 8, seats_booked: 2, status: 'scheduled', location: 'Oak Ridge, TN', created_at: now },
      { id: '00000000-0000-0000-0000-000000000039', school_id: schoolId, instructor_id: '00000000-0000-0000-0000-000000000011', session_type_id: '00000000-0000-0000-0000-000000000021', start_date: day9, end_date: day9, max_seats: 1, seats_booked: 0, status: 'scheduled', location: 'Knoxville, TN', created_at: now },
    ], { onConflict: 'id' });
    results.push({ table: 'sessions', error: sessionsErr?.message });

    // 5. Students — ACTUAL COLUMNS: id, legal_name, permit_number, dob (NOT NULL), dob_encrypted, school_id, enrollment_date, classroom_hours, driving_hours, certificate_issued_at, etc.
    const { error: studentsErr } = await supabase.from('students_driver_ed').upsert([
      { id: '00000000-0000-0000-0000-000000000040', school_id: schoolId, legal_name: 'Emma Thompson', dob: '2009-03-15', permit_number: 'TN-PER-8812', parent_email: 'emmathompson+parent@email.com', classroom_hours: 0.0, driving_hours: 0.0, enrollment_date: today, created_at: now },
      { id: '00000000-0000-0000-0000-000000000041', school_id: schoolId, legal_name: 'James Wilson', dob: '2009-07-22', permit_number: 'TN-PER-8834', parent_email: 'jameswilson+parent@email.com', classroom_hours: 4.0, driving_hours: 22.0, night_hours: 3.0, enrollment_date: today, created_at: now },
      { id: '00000000-0000-0000-0000-000000000042', school_id: schoolId, legal_name: 'Sophia Martinez', dob: '2009-01-08', permit_number: 'TN-PER-7752', parent_email: 'sophiamartinez+parent@email.com', classroom_hours: 4.0, driving_hours: 35.0, night_hours: 8.0, enrollment_date: today, created_at: now },
      { id: '00000000-0000-0000-0000-000000000043', school_id: schoolId, legal_name: 'Liam Johnson', dob: '2008-11-30', permit_number: 'TN-PER-9901', parent_email: 'liamjohnson+parent@email.com', classroom_hours: 6.0, driving_hours: 12.0, night_hours: 2.0, enrollment_date: today, created_at: now },
      { id: '00000000-0000-0000-0000-000000000044', school_id: schoolId, legal_name: 'Olivia Brown', dob: '2008-09-14', permit_number: 'TN-PER-6621', parent_email: 'oliviabrown+parent@email.com', classroom_hours: 6.0, driving_hours: 55.0, night_hours: 12.0, enrollment_date: today, certificate_issued_at: now, created_at: now },
      { id: '00000000-0000-0000-0000-000000000045', school_id: schoolId, legal_name: 'Noah Davis', dob: '2009-05-19', permit_number: 'TN-PER-4412', parent_email: 'noahdavis+parent@email.com', classroom_hours: 4.0, driving_hours: 18.0, night_hours: 4.0, enrollment_date: today, created_at: now },
      { id: '00000000-0000-0000-0000-000000000046', school_id: schoolId, legal_name: 'Ava Garcia', dob: '2009-08-03', parent_email: 'avagarcia+parent@email.com', classroom_hours: 0.0, driving_hours: 0.0, enrollment_date: today, created_at: now },
      { id: '00000000-0000-0000-0000-000000000047', school_id: schoolId, legal_name: 'Ethan Miller', dob: '2008-12-27', permit_number: 'TN-PER-3345', parent_email: 'ethanmill+parent@email.com', classroom_hours: 6.0, driving_hours: 6.0, enrollment_date: today, certificate_issued_at: now, created_at: now },
    ], { onConflict: 'id' });
    results.push({ table: 'students_driver_ed', error: studentsErr?.message });

    const errors = results.filter(r => r.error);
    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Seed failed' }, { status: 500 });
  }
}
