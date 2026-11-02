-- Phase 0 scalability work from SCALABILITY_AUDIT.md §12.4:
--   1. indexes that back the keyset-paginated list queries
--   2. a latest-vitals RPC so the monitoring console stops reading 500 rows
--   3. storage size/MIME limits on the two private personal-data buckets
--   4. a database-backed rate limiter shared by every edge function

-- 1. List-query indexes ------------------------------------------------------

create index if not exists idx_patient_notifications_patient_created
  on public.patient_notifications (patient_user_id, created_at desc);

create index if not exists idx_patient_medical_records_patient_created
  on public.patient_medical_records (patient_user_id, created_at desc);

create index if not exists idx_patient_medications_patient_status
  on public.patient_medications (patient_user_id, status);

create index if not exists idx_mood_entries_patient_logged
  on public.mood_entries (patient_user_id, logged_at desc);

create index if not exists idx_patient_meals_patient_logged
  on public.patient_meals (patient_user_id, logged_at desc);

create index if not exists idx_patient_exercises_patient_logged
  on public.patient_exercises (patient_user_id, logged_at desc);

create index if not exists idx_care_plan_tasks_plan_created
  on public.care_plan_tasks (care_plan_id, created_at desc);

create index if not exists idx_defense_medical_records_attending
  on public.defense_medical_records (attending_staff_id, record_date desc);

create index if not exists idx_patient_vitals_patient_recorded
  on public.patient_vitals (patient_user_id, recorded_at desc);

-- 2. Latest vitals per patient ----------------------------------------------
-- The monitoring console used to pull 500 rows and de-duplicate in the browser.
-- SECURITY INVOKER keeps the caller's RLS rules in force.

create or replace function public.latest_patient_vitals()
returns setof public.patient_vitals
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (patient_user_id) *
  from public.patient_vitals
  order by patient_user_id, recorded_at desc
$$;

revoke all on function public.latest_patient_vitals() from public, anon;
grant execute on function public.latest_patient_vitals() to authenticated;

-- 3. Storage limits ----------------------------------------------------------

update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom']
where id = 'medical-records';

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-photos';

-- 4. Shared rate limiting ----------------------------------------------------
-- Edge functions run on many instances, so an in-memory counter enforces
-- "limit × instances" rather than the intended limit. This table gives every
-- function instance one shared fixed-window counter.

create table if not exists public.function_rate_limits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null default now(),
  window_seconds integer not null,
  count integer not null default 0,
  primary key (bucket, subject)
);

create index if not exists idx_function_rate_limits_window
  on public.function_rate_limits (window_start);

alter table public.function_rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_bucket is null or p_subject is null or p_max <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  insert into public.function_rate_limits (bucket, subject, window_start, window_seconds, count)
  values (p_bucket, p_subject, v_now, p_window_seconds, 1)
  on conflict (bucket, subject) do update
    set count = case
          when function_rate_limits.window_start + make_interval(secs => p_window_seconds) <= v_now
            then 1
          else function_rate_limits.count + 1
        end,
        window_start = case
          when function_rate_limits.window_start + make_interval(secs => p_window_seconds) <= v_now
            then v_now
          else function_rate_limits.window_start
        end,
        window_seconds = p_window_seconds
  returning count into v_count;

  -- Opportunistic prune keeps the table small without a scheduled job.
  if random() < 0.01 then
    delete from public.function_rate_limits
    where window_start < v_now - interval '1 day';
  end if;

  return v_count <= p_max;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
