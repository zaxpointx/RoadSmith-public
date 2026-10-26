-- Migration: school_growth_metrics view + helper functions
-- Purpose: track active student/instructor count per school for the
-- Growth tier auto-trigger (Roadsmith pricing band decision 2026-07-01).
--
-- Idempotent: yes (CREATE OR REPLACE)
-- Depends on: students table (active boolean), instructors table (or equivalent)
--
-- Apply via: supabase migration up  (or supabase db push)
-- Or paste into Supabase Dashboard SQL Editor

CREATE OR REPLACE VIEW public.school_growth_metrics AS
SELECT
  s.school_id,
  -- active students = students where is_active = true OR deleted_at IS NULL
  (SELECT COUNT(*)::int
     FROM public.students st
    WHERE st.school_id = s.school_id
      AND (st.is_active = true OR st.deleted_at IS NULL)
  ) AS active_students,
  -- active instructors = instructors tied to the school, active
  (SELECT COUNT(*)::int
     FROM public.instructors i
    WHERE i.school_id = s.school_id
      AND COALESCE(i.is_active, true) = true
  ) AS active_instructors
FROM public.schools s;

COMMENT ON VIEW public.school_growth_metrics IS
  'Per-school counts of active students and instructors. Used by the Growth tier auto-trigger (Supabase Edge Function check-growth-trigger) to detect schools crossing 5 instructors OR 50 active students threshold.';

-- Helper RPC for the Edge Function: returns boolean for whether a school
-- has crossed either threshold. Cleaner than the Edge Function doing the math.
CREATE OR REPLACE FUNCTION public.school_crossed_growth_threshold(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_growth_metrics
     WHERE school_id = p_school_id
       AND (active_instructors >= 5 OR active_students >= 50)
  );
$$;

COMMENT ON FUNCTION public.school_crossed_growth_threshold(uuid) IS
  'Returns true when a school has 5+ active instructors OR 50+ active students. Used by check-growth-trigger Edge Function.';

-- Grant select on the view to authenticated users (RLS-friendly default).
-- Tighten in production if needed.
GRANT SELECT ON public.school_growth_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_crossed_growth_threshold(uuid) TO authenticated;