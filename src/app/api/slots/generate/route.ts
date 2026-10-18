import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/server'

type GenerateSlotsBody = {
  school_id?: string
  session_type_id?: string
  instructor_id?: string
}

type AvailabilityRow = {
  instructor_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

type ExistingSessionRow = {
  instructor_id: string | null
  start_date: string
  start_time: string | null
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function timeToMinutes(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:00`
}

function sessionKey(instructorId: string, startDate: string, startTime: string) {
  return `${instructorId}:${startDate}:${startTime.slice(0, 5)}`
}

export async function POST(request: Request) {
  let body: GenerateSlotsBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { school_id: schoolId, session_type_id: sessionTypeId, instructor_id: instructorId } = body

  if (!schoolId || !sessionTypeId) {
    return NextResponse.json(
      { error: 'school_id and session_type_id are required' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin() as unknown as SupabaseClient

  const { data: sessionType, error: sessionTypeError } = await admin
    .from('session_types')
    .select('id, school_id, duration_minutes')
    .eq('id', sessionTypeId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (sessionTypeError) {
    return NextResponse.json({ error: sessionTypeError.message }, { status: 500 })
  }

  if (!sessionType) {
    return NextResponse.json({ error: 'Session type not found' }, { status: 404 })
  }

  let availabilityQuery = admin
    .from('instructor_availability')
    .select('instructor_id, day_of_week, start_time, end_time, instructors!inner(id, school_id, active)')
    .eq('instructors.school_id', schoolId)
    .eq('instructors.active', true)
    .eq('active', true)
    .gte('day_of_week', 1)
    .lte('day_of_week', 5)

  if (instructorId) {
    availabilityQuery = availabilityQuery.eq('instructor_id', instructorId)
  }

  const { data: availability, error: availabilityError } = await availabilityQuery

  if (availabilityError) {
    return NextResponse.json({ error: availabilityError.message }, { status: 500 })
  }

  const availabilityRows = (availability ?? []) as AvailabilityRow[]
  if (availabilityRows.length === 0) {
    return NextResponse.json({ generated: 0 })
  }

  const today = new Date()
  const startDate = dateKey(today)
  const end = new Date(today)
  end.setDate(today.getDate() + 29)
  const endDate = dateKey(end)
  const instructorIds = Array.from(new Set(availabilityRows.map((row) => row.instructor_id)))

  const { data: existingSessions, error: existingError } = await admin
    .from('sessions')
    .select('instructor_id, start_date, start_time')
    .in('instructor_id', instructorIds)
    .gte('start_date', startDate)
    .lte('start_date', endDate)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const existingKeys = new Set(
    ((existingSessions ?? []) as ExistingSessionRow[])
      .filter((session) => session.instructor_id && session.start_time)
      .map((session) => sessionKey(session.instructor_id!, session.start_date, session.start_time!))
  )

  const durationMinutes = Math.max(1, Number(sessionType.duration_minutes) || 60)
  const sessionsToInsert = []

  for (let offset = 0; offset < 30; offset++) {
    const date = new Date(today)
    date.setDate(today.getDate() + offset)
    const dayOfWeek = date.getDay()
    const start_date = dateKey(date)

    for (const window of availabilityRows) {
      if (window.day_of_week !== dayOfWeek) continue

      const windowStart = timeToMinutes(window.start_time)
      const windowEnd = timeToMinutes(window.end_time)

      for (let slotStart = windowStart; slotStart + durationMinutes <= windowEnd; slotStart += durationMinutes) {
        const start_time = minutesToTime(slotStart)
        const key = sessionKey(window.instructor_id, start_date, start_time)

        if (existingKeys.has(key)) continue

        existingKeys.add(key)
        sessionsToInsert.push({
          school_id: schoolId,
          session_type_id: sessionTypeId,
          instructor_id: window.instructor_id,
          start_date,
          start_time,
          end_date: start_date,
          status: 'scheduled',
          max_seats: 1,
          seats_booked: 0,
        })
      }
    }
  }

  if (sessionsToInsert.length === 0) {
    return NextResponse.json({ generated: 0 })
  }

  const { error: insertError } = await admin
    .from('sessions')
    .insert(sessionsToInsert)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ generated: sessionsToInsert.length })
}
