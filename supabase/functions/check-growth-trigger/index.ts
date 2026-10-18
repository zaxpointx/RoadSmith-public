// Supabase Edge Function: check-growth-trigger
// Purpose: when a school crosses 5 active instructors OR 50 active students,
//          send the school owner a Resend email prompting an upgrade to Growth tier.
//
// Env vars required (set via `supabase secrets set`):
//   SUPABASE_URL              — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected
//   RESEND_API_KEY            — Resend API key for email sending
//   FROM_EMAIL                — sender address (e.g. "Roadsmith <hello@roadsmith.app>")
//   GROWTH_TIER_URL           — link to upgrade flow (e.g. https://roadsmith.vercel.app/pricing)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

interface RequestBody {
  school_id?: string;
  sweep_all?: boolean;
}

interface GrowthMetrics {
  school_id: string;
  school_name: string;
  active_students: number;
  active_instructors: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendUpgradeEmail(opts: {
  resendApiKey: string;
  fromEmail: string;
  growthTierUrl: string;
  toEmail: string;
  schoolName: string;
  activeStudents: number;
  activeInstructors: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const subject = `${opts.schoolName}: you're growing — let's talk about Roadsmith Growth`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; font-size: 20px;">You're growing fast</h2>
      <p style="color: #444; line-height: 1.6;">
        Quick heads-up — your school <strong>${opts.schoolName}</strong> now has:
      </p>
      <ul style="color: #444; line-height: 1.8;">
        <li><strong>${opts.activeStudents}</strong> active students</li>
        <li><strong>${opts.activeInstructors}</strong> active instructors</li>
      </ul>
      <p style="color: #444; line-height: 1.6;">
        You're at or above the threshold for our <strong>Growth tier</strong>, which unlocks
        the parent portal, instructor management, and priority support — built for schools
        your size.
      </p>
      <p style="margin: 32px 0;">
        <a href="${opts.growthTierUrl}"
           style="background: #16a34a; color: #fff; padding: 12px 24px; border-radius: 8px;
                  text-decoration: none; font-weight: 600; display: inline-block;">
          See Growth tier →
        </a>
      </p>
      <p style="color: #888; font-size: 13px;">
        No action needed if you're happy with Starter. Just wanted to flag it.
      </p>
    </div>
  `;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.fromEmail,
      to: opts.toEmail,
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return { ok: false, error: `Resend ${resp.status}: ${errText.slice(0, 200)}` };
  }

  const body = await resp.json();
  return { ok: true, id: body.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL") || "Roadsmith <hello@roadsmith.app>";
  const growthTierUrl =
    Deno.env.get("GROWTH_TIER_URL") || "https://roadsmith.vercel.app/pricing";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "missing Supabase env" }, 500);
  }
  if (!resendApiKey) {
    return json({ error: "missing RESEND_API_KEY" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    // empty body is OK — treat as sweep_all
  }

  // Find candidate schools: crossed threshold, not yet emailed today
  let query = supabase
    .from("school_growth_metrics")
    .select("school_id, school_name, active_students, active_instructors")
    .or("active_instructors.gte.5,active_students.gte.50");

  if (body.school_id) {
    query = query.eq("school_id", body.school_id);
  }

  const { data: metrics, error: metricsErr } = await query;
  if (metricsErr) {
    return json({ error: `metrics query failed: ${metricsErr.message}` }, 500);
  }

  const candidates = (metrics ?? []) as GrowthMetrics[];
  const results: Array<{
    school_id: string;
    school_name: string;
    emailed: boolean;
    message_id?: string;
    error?: string;
    skipped_reason?: string;
  }> = [];

  for (const m of candidates) {
    // Look up the school's owner email
    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .select("id, owner_email, name, plan_tier")
      .eq("id", m.school_id)
      .single();

    if (schoolErr || !school) {
      results.push({
        school_id: m.school_id,
        school_name: m.school_name,
        emailed: false,
        skipped_reason: `school lookup failed: ${schoolErr?.message ?? "not found"}`,
      });
      continue;
    }

    // Skip if already on Growth tier
    if (school.plan_tier === "growth") {
      results.push({
        school_id: m.school_id,
        school_name: m.school_name,
        emailed: false,
        skipped_reason: "already on growth tier",
      });
      continue;
    }

    if (!school.owner_email) {
      results.push({
        school_id: m.school_id,
        school_name: m.school_name,
        emailed: false,
        skipped_reason: "no owner_email",
      });
      continue;
    }

    // Idempotency: check if we already emailed this school today
    const todayKey = `growth_trigger_${new Date().toISOString().slice(0, 10)}`;
    const { data: existing } = await supabase
      .from("schools")
      .select("metadata")
      .eq("id", m.school_id)
      .single();

    const meta = (existing?.metadata ?? {}) as Record<string, unknown>;
    if (meta[todayKey] === true) {
      results.push({
        school_id: m.school_id,
        school_name: m.school_name,
        emailed: false,
        skipped_reason: "already emailed today",
      });
      continue;
    }

    // Send the email
    const sendResult = await sendUpgradeEmail({
      resendApiKey,
      fromEmail,
      growthTierUrl,
      toEmail: school.owner_email,
      schoolName: school.name ?? m.school_name,
      activeStudents: m.active_students,
      activeInstructors: m.active_instructors,
    });

    if (sendResult.ok) {
      await supabase
        .from("schools")
        .update({
          metadata: { ...meta, [todayKey]: true },
        })
        .eq("id", m.school_id);

      results.push({
        school_id: m.school_id,
        school_name: m.school_name,
        emailed: true,
        message_id: sendResult.id,
      });
    } else {
      results.push({
        school_id: m.school_id,
        school_name: m.school_name,
        emailed: false,
        error: sendResult.error,
      });
    }
  }

  return json({
    scanned: candidates.length,
    sent: results.filter((r) => r.emailed).length,
    skipped: results.filter((r) => !r.emailed).length,
    results,
  });
});