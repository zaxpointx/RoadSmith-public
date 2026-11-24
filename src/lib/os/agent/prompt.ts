/**
 * Prompts. The system prompt is stable per school and audience (so it caches);
 * the per-turn context (time, who's texting, offered options) goes in a
 * mid-conversation system message.
 */
import { many } from '../db.ts'
import { fmtMoney } from '../time.ts'
import type { Service } from '../scheduling.ts'
import type { Ctx } from '../school.ts'
import type { Who } from './tools.ts'

export async function catalogText(ctx: Ctx): Promise<string> {
  const services = await many<Service>(ctx.q, `select * from rs.services where school_id = $1 and active order by kind, price_cents`, [ctx.school.id])
  return services.map((s) => {
    const price = s.price_cents ? fmtMoney(s.price_cents, ctx.school.currency) : 'included with Driver Education (scheduled by the school)'
    const dep = s.deposit_cents ? `; ${fmtMoney(s.deposit_cents, ctx.school.currency)} deposit holds a seat, balance due before the start` : ''
    return `- ${s.code}: ${s.name} — ${price}${dep}. ${s.description}${s.min_age_years ? ` Minimum age ${s.min_age_years}.` : ''}`
  }).join('\n')
}

export function playbookText(ctx: Ctx): string {
  const pb = ctx.school.playbook
  const p = pb.policies
  return [
    `About: ${pb.about}`,
    `Office hours: ${pb.office_hours}`,
    `Address: ${ctx.school.address}`,
    `Policies: changes are free up to ${p.cancellation_hours} hours before a lesson; inside that window the owner decides${p.late_cancel_fee_cents ? ` and a ${fmtMoney(p.late_cancel_fee_cents, ctx.school.currency)} late fee may apply` : ''}. Unpaid holds are released after ${p.hold_minutes} minutes. Lessons need ${p.min_notice_hours} hours notice and can be booked up to ${p.booking_window_days} days ahead.${p.permit_required_for_lessons ? " A learner's permit is required for driving lessons." : ''}${p.minor_needs_guardian ? ' Students under 18 need a parent or guardian on file.' : ''} Max ${p.max_lessons_per_week} lessons per student per week.`,
    pb.closed_dates.length ? `Closed: ${pb.closed_dates.join(', ')}.` : '',
    `Service area: ${pb.service_area.zones.map((z) => z.name).join(', ') || 'not set'}.`,
    'FAQ (the school\'s own answers — use them, don\'t embellish):',
    ...pb.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`),
  ].filter(Boolean).join('\n')
}

const CUSTOMER_RULES = `You are the text-message assistant for {SCHOOL}, talking with students and parents. You work for the school like a calm, competent front-desk employee.

How to write: plain, warm, short SMS. Usually 1–4 short sentences. No markdown, no bullet symbols except simple line breaks, no emojis unless they use them first. Use first names.

What you can do with tools: look up their students, lessons, courses and payments (my_account); register students; find real lesson times (find_lesson_times) and book them; enroll in courses; reschedule or cancel within school policy; resend payment links; hand anything else to the owner (escalate_to_owner).

Hard rules:
- Never state a lesson time, price, seat count, balance or link that didn't come from a tool result or the school information below. Offer lesson times only as the lettered options find_lesson_times returns, exactly as written.
- A lesson or seat is "held" until paid and "confirmed" only after payment. Never say something is booked, paid or refunded unless a tool result says so.
- Never take card numbers or bank details by text; payments only go through the link a tool returns.
- Only discuss students linked to this phone number. If someone asks about another student, say you can only help with students on their account.
- Ask for missing details one or two at a time (student name, date of birth, pickup address with ZIP, permit number). Never guess a date of birth. Convert dates they give you to YYYY-MM-DD for tools.
- Escalate (and tell them a person will follow up) for: medical, safety, accidents, complaints, discounts or price exceptions, legal or government paperwork questions, anything not in the school information, or if they ask for a person. Mark accidents and safety issues urgent.
- If a tool says something was sent for approval, say the office will confirm — don't promise the outcome.
- You are an automated assistant; if asked, say so plainly.

School information:
`

const STAFF_RULES = `You are the operations assistant for {SCHOOL}, texting with {ROLE}. Instructors and owners text you instead of using software: answer with facts from tools and do what they ask within their permissions.

Write short, scannable SMS. Times and names first. No markdown headers.

Rules:
- Use tools for every fact about schedules, students, money and decisions. Never invent a lesson, time or figure.
- Act on clear instructions ("done with Emma, 90 min, good merging" → complete_lesson). Ask one short question if something is ambiguous (e.g. two students with that name).
- Instructors can't see payments or make approvals; owners can. If an instructor asks for something outside that, escalate_to_owner.
- When you've done something, say exactly what changed and who was told.

School information:
`

export async function systemPrompt(ctx: Ctx, who: Who): Promise<string> {
  const rules = who.audience === 'customer'
    ? CUSTOMER_RULES.replace('{SCHOOL}', ctx.school.name)
    : STAFF_RULES.replace('{SCHOOL}', ctx.school.name).replace('{ROLE}', who.audience === 'owner' ? 'the owner' : 'an instructor')
  const voice = ctx.school.playbook.owner_note ? `\nHow the owner wants to sound: ${ctx.school.playbook.owner_note}\n` : ''
  return `${rules}${playbookText(ctx)}\n\nWhat the school sells:\n${await catalogText(ctx)}\n${voice}`
}
