-- Defence Learning & Communications Hub — schema, policies and lifecycle
--
-- DELIVERY NOTE
-- This migration is delivered as a file only. It has NOT been applied to the
-- shared Supabase project (ypcziwlehjbmqohrsvzo) in this environment, because
-- the hub currently runs entirely on synthetic, in-memory demonstration data.
-- Apply it deliberately, review it with the security owner, and seed only
-- synthetic records.
--
-- The capability matrix below mirrors src/lib/defenceLearning.ts exactly.
-- Any change to one must be made to the other.

-- ---------------------------------------------------------------------------
-- 1. Domain tables
-- ---------------------------------------------------------------------------

create table if not exists public.defence_learning_personas (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique references auth.users (id) on delete set null,
  service_number    text not null unique,
  full_name         text not null,
  rank              text,
  role              text not null check (role in (
                      'learner','instructor','training_officer','hq_publisher',
                      'reviewer','auditor','platform_admin')),
  branch            text not null check (branch in ('army','navy','airforce','joint')),
  formation         text not null,
  unit              text not null,
  facility          text not null,
  clearance         text not null check (clearance in ('unclassified','restricted','confidential','secret')),
  training_path     text not null check (training_path in ('general','first_responder','medic','clinician')),
  email             text not null,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists defence_learning_personas_unit_idx
  on public.defence_learning_personas (unit) where active;

create table if not exists public.defence_learning_content (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,
  summary                  text not null default '',
  channel_id               text not null check (channel_id in (
                             'first_aid','devices','equipment','policy',
                             'leadership','wellbeing','courses')),
  kind                     text not null check (kind in ('video','audio','pdf','slides','doc')),
  tags                     text[] not null default '{}',
  language                 text not null default 'en',
  -- Demonstration guard: no record may claim to be non-synthetic until a
  -- named reviewer has signed it off.
  synthetic                boolean not null default true,
  publisher_department     text not null,
  publisher_verified_by    uuid references public.defence_learning_personas (id),
  source_type              text not null default 'official' check (source_type in (
                             'official','ai_assisted','ai_translation','ai_summary')),
  derived_from_id          uuid references public.defence_learning_content (id),
  version                  text not null default '1.0',
  status                   text not null default 'draft' check (status in (
                             'draft','in_review','approved','scheduled','published',
                             'withdrawn','superseded','rejected')),
  classification           text not null default 'restricted' check (classification in (
                             'unclassified','restricted','confidential','secret')),
  audience_branches        text[] not null default '{}',
  audience_units           text[] not null default '{}',
  audience_paths           text[] not null default '{}',
  min_clearance            text not null default 'restricted' check (min_clearance in (
                             'unclassified','restricted','confidential','secret')),
  download_policy          text not null default 'allowed' check (download_policy in (
                             'allowed','audio_only','view_only','denied')),
  mandatory                boolean not null default false,
  acknowledgement_required boolean not null default false,
  language_resources       text[] not null default '{en}',
  approved_sources         text[] not null default '{}',
  reviewer_id              uuid references public.defence_learning_personas (id),
  reviewed_at              timestamptz,
  published_at             timestamptz,
  review_due_at            timestamptz,
  scheduled_for            timestamptz,
  superseded_by_id         uuid references public.defence_learning_content (id),
  supersedes_id            uuid references public.defence_learning_content (id),
  duration_sec             integer not null default 0 check (duration_sec >= 0),
  file_size_mb             integer not null default 0 check (file_size_mb >= 0),
  competence_level         text not null default 'Foundational' check (competence_level in (
                             'Awareness','Foundational','Operational','Advanced')),
  storage_path             text,
  checksum                 text,
  processing_status        text not null default 'ready' check (processing_status in (
                             'ready','scanning','transcoding','failed')),
  processing_error         text,
  created_by               uuid references public.defence_learning_personas (id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint defence_learning_content_synthetic_review check (
    synthetic or (reviewer_id is not null and reviewed_at is not null)
  ),
  constraint defence_learning_content_withdrawal_reason check (
    status <> 'withdrawn' or processing_error is not null
  )
);

create index if not exists defence_learning_content_learner_idx
  on public.defence_learning_content (status, classification, channel_id);
create index if not exists defence_learning_content_publisher_idx
  on public.defence_learning_content (created_by, status);

create table if not exists public.defence_learning_chapters (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.defence_learning_content (id) on delete cascade,
  label       text not null,
  start_sec   integer not null check (start_sec >= 0),
  position    integer not null default 0
);

create table if not exists public.defence_learning_transcript_sections (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.defence_learning_content (id) on delete cascade,
  title       text not null,
  start_sec   integer not null check (start_sec >= 0),
  body        text not null,
  position    integer not null default 0
);

create table if not exists public.defence_learning_caption_cues (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.defence_learning_content (id) on delete cascade,
  start_sec   integer not null check (start_sec >= 0),
  end_sec     integer not null check (end_sec >= start_sec),
  text        text not null
);

create table if not exists public.defence_learning_courses (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  summary          text not null default '',
  training_path    text not null check (training_path in ('general','first_responder','medic','clinician')),
  estimated_minutes integer not null default 0,
  mandatory        boolean not null default false,
  refresher_months integer,
  owner            text not null,
  practical_required boolean not null default false,
  assessment_id    uuid,
  created_at       timestamptz not null default now()
);

create table if not exists public.defence_learning_course_lessons (
  course_id  uuid not null references public.defence_learning_courses (id) on delete cascade,
  content_id uuid not null references public.defence_learning_content (id) on delete cascade,
  position   integer not null default 0,
  primary key (course_id, content_id)
);

create table if not exists public.defence_learning_assessments (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.defence_learning_content (id) on delete cascade,
  title        text not null,
  pass_mark    integer not null check (pass_mark between 0 and 100),
  max_attempts integer not null default 3 check (max_attempts > 0),
  created_at   timestamptz not null default now()
);

create table if not exists public.defence_learning_assessment_questions (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.defence_learning_assessments (id) on delete cascade,
  prompt        text not null,
  options       jsonb not null,
  answer_id     text not null,
  rationale     text not null,
  section_id    text,
  position      integer not null default 0
);

-- Answer keys never leave the server through the learner-facing policy. Only
-- reviewers and platform administrators can read this table directly; the
-- assessment RPC strips answers before returning.
create table if not exists public.defence_learning_attempts (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.defence_learning_assessments (id) on delete cascade,
  persona_id    uuid not null references public.defence_learning_personas (id) on delete cascade,
  score         integer not null check (score between 0 and 100),
  passed        boolean not null,
  answers       jsonb not null default '{}'::jsonb,
  completed_at  timestamptz not null default now()
);

create table if not exists public.defence_learning_competency_signoffs (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.defence_learning_content (id) on delete cascade,
  persona_id  uuid not null references public.defence_learning_personas (id) on delete cascade,
  level       text not null check (level in ('not_assessed','developing','competent')),
  signed_by   uuid not null references public.defence_learning_personas (id),
  signed_at   timestamptz not null default now(),
  notes       text not null default '',
  unique (content_id, persona_id)
);

create table if not exists public.defence_learning_assignments (
  id                     uuid primary key default gen_random_uuid(),
  target_kind            text not null check (target_kind in ('persona','unit')),
  target_id              text not null,
  content_id             uuid references public.defence_learning_content (id) on delete cascade,
  course_id              uuid references public.defence_learning_courses (id) on delete cascade,
  title                  text not null,
  assigned_by            uuid not null references public.defence_learning_personas (id),
  assigned_at            timestamptz not null default now(),
  due_at                 timestamptz not null,
  require_acknowledgement boolean not null default false,
  assessment_id          uuid references public.defence_learning_assessments (id),
  reminders_days         integer[] not null default '{7,3,1}',
  status                 text not null default 'active' check (status in ('active','completed','overdue')),
  constraint defence_learning_assignment_target check (
    (content_id is not null and course_id is null) or (content_id is null and course_id is not null)
  )
);

create index if not exists defence_learning_assignments_target_idx
  on public.defence_learning_assignments (target_kind, target_id, status);

create table if not exists public.defence_learning_progress (
  persona_id       uuid not null references public.defence_learning_personas (id) on delete cascade,
  content_id       uuid not null references public.defence_learning_content (id) on delete cascade,
  position_sec     integer not null default 0 check (position_sec >= 0),
  max_position_sec integer not null default 0 check (max_position_sec >= 0),
  percent          integer not null default 0 check (percent between 0 and 100),
  viewed_at        timestamptz,
  completed_at     timestamptz,
  acknowledged_at  timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (persona_id, content_id)
);

create table if not exists public.defence_learning_progress_events (
  event_id    text primary key,
  persona_id  uuid not null references public.defence_learning_personas (id) on delete cascade,
  content_id  uuid not null references public.defence_learning_content (id) on delete cascade,
  position_sec integer not null default 0,
  duration_sec integer not null default 0,
  kind        text not null check (kind in ('heartbeat','viewed','acknowledged','completed')),
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create table if not exists public.defence_learning_downloads (
  id                 uuid primary key default gen_random_uuid(),
  persona_id         uuid not null references public.defence_learning_personas (id) on delete cascade,
  content_id         uuid not null references public.defence_learning_content (id) on delete cascade,
  quality            text not null check (quality in ('360p','720p','1080p')),
  audio_only         boolean not null default false,
  include_transcript boolean not null default false,
  size_mb            integer not null check (size_mb >= 0),
  status             text not null default 'queued' check (status in (
                       'queued','downloading','ready','failed','revoked')),
  progress           integer not null default 0 check (progress between 0 and 100),
  downloaded_version text not null,
  last_sync_at       timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  unique (persona_id, content_id, downloaded_version)
);

create table if not exists public.defence_learning_questions (
  id          uuid primary key default gen_random_uuid(),
  persona_id  uuid not null references public.defence_learning_personas (id) on delete cascade,
  content_id  uuid references public.defence_learning_content (id) on delete set null,
  body        text not null check (char_length(body) between 1 and 2000),
  status      text not null default 'queued' check (status in ('queued','answered','escalated')),
  created_at  timestamptz not null default now(),
  answered_by uuid references public.defence_learning_personas (id),
  answer      text,
  citations   jsonb not null default '[]'::jsonb
);

create table if not exists public.defence_learning_question_rate (
  persona_id   uuid not null references public.defence_learning_personas (id) on delete cascade,
  window_start timestamptz not null,
  question_count integer not null default 0,
  ai_count       integer not null default 0,
  primary key (persona_id, window_start)
);

create table if not exists public.defence_learning_announcements (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,
  body                     text not null,
  channel_id               text not null,
  classification           text not null check (classification in (
                             'unclassified','restricted','confidential','secret')),
  published_at             timestamptz not null default now(),
  author                   text not null,
  acknowledgement_required boolean not null default false,
  read_minutes             integer not null default 2,
  audience_branches        text[] not null default '{}',
  audience_units           text[] not null default '{}',
  audience_paths           text[] not null default '{}'
);

create table if not exists public.defence_learning_announcement_acks (
  announcement_id uuid not null references public.defence_learning_announcements (id) on delete cascade,
  persona_id      uuid not null references public.defence_learning_personas (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, persona_id)
);

create table if not exists public.defence_learning_publication_events (
  id         uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.defence_learning_content (id) on delete cascade,
  action     text not null check (action in (
               'created','submitted','approved','rejected','published',
               'withdrawn','superseded','derivative_flagged')),
  actor      text not null,
  actor_id   uuid references public.defence_learning_personas (id),
  occurred_at timestamptz not null default now(),
  note       text not null default '',
  version    text not null
);

create table if not exists public.defence_learning_audit_events (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,
  actor_id   uuid references public.defence_learning_personas (id),
  action     text not null,
  target     text not null,
  meta       text,
  occurred_at timestamptz not null default now()
);

create index if not exists defence_learning_audit_time_idx
  on public.defence_learning_audit_events (occurred_at desc);

create table if not exists public.defence_learning_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('scan','transcode','ai_draft','publish','sync')),
  target_id   uuid,
  label       text not null,
  status      text not null default 'queued' check (status in ('queued','running','complete','failed')),
  progress    integer not null default 0 check (progress between 0 and 100),
  attempts    integer not null default 0,
  error       text,
  created_by  uuid references public.defence_learning_personas (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Capability matrix (mirror of src/lib/defenceLearning.ts)
-- ---------------------------------------------------------------------------

create or replace function public.defence_learning_capabilities(p_role text)
returns text[]
language sql
immutable
as $$
  select case p_role
    when 'learner' then array[
      'learning.view','library.browse','download.request','assessment.take','question.ask'
    ]
    when 'instructor' then array[
      'learning.view','library.browse','download.request','assessment.take','question.ask',
      'question.answer','course.manage','assessment.manage','competency.signoff','reports.view_unit'
    ]
    when 'training_officer' then array[
      'learning.view','library.browse','download.request','assessment.take','question.ask',
      'assignment.manage','reports.view_unit','reports.export'
    ]
    when 'hq_publisher' then array[
      'learning.view','library.browse','download.request','assessment.take','question.ask',
      'publish.draft','publish.submit','reports.view_unit'
    ]
    when 'reviewer' then array[
      'learning.view','library.browse','download.request','assessment.take','question.ask',
      'publish.review','publish.publish','publish.withdraw',
      'reports.view_network','reports.export','audit.view'
    ]
    when 'auditor' then array[
      'learning.view','library.browse','reports.view_network','reports.export','audit.view'
    ]
    when 'platform_admin' then array[
      'learning.view','library.browse','download.request','assessment.take','question.ask',
      'question.answer','course.manage','assessment.manage','competency.signoff',
      'assignment.manage','reports.view_unit','reports.view_network','reports.export',
      'publish.draft','publish.submit','publish.review','publish.publish','publish.withdraw',
      'audit.view','admin.configure'
    ]
    else array[]::text[]
  end;
$$;

create or replace function public.defence_learning_clearance_rank(p_value text)
returns integer
language sql
immutable
as $$
  select case p_value
    when 'unclassified' then 0
    when 'restricted' then 1
    when 'confidential' then 2
    when 'secret' then 3
    else 99
  end;
$$;

create or replace function public.defence_learning_persona_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.defence_learning_personas
  where auth_user_id = auth.uid() and active
  limit 1;
$$;

-- The personas policy must not sub-select its own table or Postgres reports
-- infinite recursion. Read the caller's unit through a definer helper instead.
create or replace function public.defence_learning_current_unit()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select unit from public.defence_learning_personas
  where auth_user_id = auth.uid() and active
  limit 1;
$$;

create or replace function public.defence_learning_has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p_capability = any(public.defence_learning_capabilities(p.role))
    from public.defence_learning_personas p
    where p.auth_user_id = auth.uid() and p.active
    limit 1
  ), false);
$$;

create or replace function public.defence_learning_can_see_content(p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.defence_learning_content c
    join public.defence_learning_personas p
      on p.auth_user_id = auth.uid() and p.active
    where c.id = p_content_id
      and c.status = 'published'
      and c.processing_status <> 'failed'
      and public.defence_learning_clearance_rank(p.clearance)
            >= public.defence_learning_clearance_rank(c.min_clearance)
      and (cardinality(c.audience_branches) = 0 or p.branch = any(c.audience_branches))
      and (cardinality(c.audience_units) = 0 or p.unit = any(c.audience_units))
      and (cardinality(c.audience_paths) = 0 or p.training_path = any(c.audience_paths))
  );
$$;

create or replace function public.defence_learning_pipeline_visible(p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.defence_learning_content c
    join public.defence_learning_personas p
      on p.auth_user_id = auth.uid() and p.active
    where c.id = p_content_id
      and (
        p.role = 'platform_admin'
        or (p.role = 'reviewer' and (c.status <> 'draft' or c.created_by = p.id))
        or (p.role = 'hq_publisher' and c.created_by = p.id)
        or (p.role = 'auditor' and c.status in ('published','withdrawn','superseded'))
        or c.status = 'published'
      )
  );
$$;

revoke all on function public.defence_learning_capabilities(text) from public;
revoke all on function public.defence_learning_clearance_rank(text) from public;
grant execute on function public.defence_learning_capabilities(text) to authenticated;
grant execute on function public.defence_learning_clearance_rank(text) to authenticated;
grant execute on function public.defence_learning_persona_id() to authenticated;
grant execute on function public.defence_learning_current_unit() to authenticated;
grant execute on function public.defence_learning_has_capability(text) to authenticated;
grant execute on function public.defence_learning_can_see_content(uuid) to authenticated;
grant execute on function public.defence_learning_pipeline_visible(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Idempotent progress ingestion
-- ---------------------------------------------------------------------------

create or replace function public.defence_learning_record_progress(
  p_event_id      text,
  p_content_id    uuid,
  p_position_sec  integer,
  p_duration_sec  integer,
  p_kind          text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid;
  v_percent integer;
  v_inserted integer := 0;
  v_position integer := greatest(coalesce(p_position_sec, 0), 0);
begin
  v_persona := public.defence_learning_persona_id();
  if v_persona is null then
    raise exception 'no active defence learning persona for this session';
  end if;

  if p_kind not in ('heartbeat','viewed','acknowledged','completed') then
    raise exception 'invalid progress event kind';
  end if;

  if not public.defence_learning_can_see_content(p_content_id) then
    raise exception 'content is outside the caller''s scope';
  end if;

  -- Replayed identifiers (offline queues, reconnecting devices) are absorbed.
  insert into public.defence_learning_progress_events (
    event_id, persona_id, content_id, position_sec, duration_sec, kind
  ) values (
    p_event_id, v_persona, p_content_id, v_position, greatest(coalesce(p_duration_sec, 0), 0), p_kind
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return;
  end if;

  v_percent := case
    when coalesce(p_duration_sec, 0) > 0
      then least(100, round(v_position::numeric / p_duration_sec * 100)::integer)
    else 0
  end;

  insert into public.defence_learning_progress (
    persona_id, content_id, position_sec, max_position_sec, percent,
    viewed_at, completed_at, acknowledged_at, updated_at
  ) values (
    v_persona, p_content_id, v_position, v_position, v_percent,
    case when p_kind = 'viewed' or v_percent > 0 then now() end,
    case when p_kind = 'completed' then now() end,
    case when p_kind = 'acknowledged' then now() end,
    now()
  )
  on conflict (persona_id, content_id) do update set
    position_sec     = excluded.position_sec,
    max_position_sec = greatest(public.defence_learning_progress.max_position_sec, excluded.max_position_sec),
    percent          = greatest(public.defence_learning_progress.percent, excluded.percent),
    viewed_at        = coalesce(public.defence_learning_progress.viewed_at, excluded.viewed_at),
    completed_at     = coalesce(public.defence_learning_progress.completed_at, excluded.completed_at),
    acknowledged_at  = coalesce(public.defence_learning_progress.acknowledged_at, excluded.acknowledged_at),
    updated_at       = now();
end;
$$;

revoke all on function public.defence_learning_record_progress(text, uuid, integer, integer, text) from public;
grant execute on function public.defence_learning_record_progress(text, uuid, integer, integer, text) to authenticated;

-- Assessment grading happens server-side. The answer key never reaches the
-- browser, attempt limits are enforced here, and the learner cannot submit a
-- score of their own choosing.
create or replace function public.defence_learning_submit_attempt(
  p_assessment_id uuid,
  p_answers jsonb
)
returns table (score integer, passed boolean, correct_ids text[], incorrect_ids text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_persona uuid;
  v_assessment public.defence_learning_assessments%rowtype;
  v_question public.defence_learning_assessment_questions%rowtype;
  v_attempts integer;
  v_total integer := 0;
  v_correct integer := 0;
  v_score integer := 0;
  v_correct_ids text[] := '{}';
  v_incorrect_ids text[] := '{}';
begin
  v_persona := public.defence_learning_persona_id();
  if v_persona is null then
    raise exception 'no active defence learning persona for this session';
  end if;

  select * into v_assessment from public.defence_learning_assessments
  where id = p_assessment_id;
  if v_assessment.id is null then
    raise exception 'assessment not found';
  end if;

  if not public.defence_learning_can_see_content(v_assessment.content_id) then
    raise exception 'assessment is outside the caller''s scope';
  end if;

  select count(*) into v_attempts
  from public.defence_learning_attempts
  where assessment_id = p_assessment_id and persona_id = v_persona;

  if v_attempts >= v_assessment.max_attempts then
    raise exception 'attempt limit reached';
  end if;

  for v_question in
    select * from public.defence_learning_assessment_questions
    where assessment_id = p_assessment_id
    order by position
  loop
    v_total := v_total + 1;
    if (p_answers ->> v_question.id) = v_question.answer_id then
      v_correct := v_correct + 1;
      v_correct_ids := v_correct_ids || v_question.id;
    else
      v_incorrect_ids := v_incorrect_ids || v_question.id;
    end if;
  end loop;

  if v_total > 0 then
    v_score := round(v_correct::numeric / v_total * 100)::integer;
  end if;

  insert into public.defence_learning_attempts (
    assessment_id, persona_id, score, passed, answers
  ) values (
    p_assessment_id, v_persona, v_score, v_score >= v_assessment.pass_mark, coalesce(p_answers, '{}'::jsonb)
  );

  score := v_score;
  passed := v_score >= v_assessment.pass_mark;
  correct_ids := v_correct_ids;
  incorrect_ids := v_incorrect_ids;
  return next;
end;
$$;

revoke all on function public.defence_learning_submit_attempt(uuid, jsonb) from public;
grant execute on function public.defence_learning_submit_attempt(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Row level security
-- ---------------------------------------------------------------------------

alter table public.defence_learning_personas            enable row level security;
alter table public.defence_learning_content             enable row level security;
alter table public.defence_learning_chapters            enable row level security;
alter table public.defence_learning_transcript_sections enable row level security;
alter table public.defence_learning_caption_cues        enable row level security;
alter table public.defence_learning_courses             enable row level security;
alter table public.defence_learning_course_lessons      enable row level security;
alter table public.defence_learning_assessments         enable row level security;
alter table public.defence_learning_assessment_questions enable row level security;
alter table public.defence_learning_attempts            enable row level security;
alter table public.defence_learning_competency_signoffs enable row level security;
alter table public.defence_learning_assignments         enable row level security;
alter table public.defence_learning_progress            enable row level security;
alter table public.defence_learning_progress_events     enable row level security;
alter table public.defence_learning_downloads           enable row level security;
alter table public.defence_learning_questions           enable row level security;
alter table public.defence_learning_question_rate       enable row level security;
alter table public.defence_learning_announcements       enable row level security;
alter table public.defence_learning_announcement_acks  enable row level security;
alter table public.defence_learning_publication_events  enable row level security;
alter table public.defence_learning_audit_events        enable row level security;
alter table public.defence_learning_jobs                enable row level security;

-- Personas: you may read yourself. Unit staff read their own unit; only
-- network-report and admin roles read across units. Writes are admin-only.
drop policy if exists "dl personas self read" on public.defence_learning_personas;
create policy "dl personas self read" on public.defence_learning_personas
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or (
      public.defence_learning_has_capability('reports.view_unit')
      and unit = public.defence_learning_current_unit()
    )
    or public.defence_learning_has_capability('reports.view_network')
  );

drop policy if exists "dl personas admin write" on public.defence_learning_personas;
create policy "dl personas admin write" on public.defence_learning_personas
  for all to authenticated
  using (public.defence_learning_has_capability('admin.configure'))
  with check (public.defence_learning_has_capability('admin.configure'));

-- Content: learners see published, in-scope records only. Pipeline roles see
-- their own pipeline. The policy is the last line of defence behind the
-- server-side query filters, so restricted titles never leak in a header.
drop policy if exists "dl content learner or pipeline read" on public.defence_learning_content;
create policy "dl content learner or pipeline read" on public.defence_learning_content
  for select to authenticated
  using (
    public.defence_learning_can_see_content(id)
    or public.defence_learning_pipeline_visible(id)
    or public.defence_learning_has_capability('admin.configure')
  );

drop policy if exists "dl content publisher insert" on public.defence_learning_content;
create policy "dl content publisher insert" on public.defence_learning_content
  for insert to authenticated
  with check (
    public.defence_learning_has_capability('publish.draft')
    and created_by = public.defence_learning_persona_id()
  );

-- A publisher may edit only its own unpublished records. Reviewers may move a
-- record through review; only a reviewer can publish or withdraw.
drop policy if exists "dl content publisher update" on public.defence_learning_content;
create policy "dl content publisher update" on public.defence_learning_content
  for update to authenticated
  using (
    (public.defence_learning_has_capability('publish.submit') and created_by = public.defence_learning_persona_id())
    or public.defence_learning_has_capability('publish.review')
    or public.defence_learning_has_capability('admin.configure')
  )
  with check (
    (
      public.defence_learning_has_capability('publish.submit')
      and created_by = public.defence_learning_persona_id()
      and status in ('draft','in_review','rejected')
    )
    or public.defence_learning_has_capability('publish.review')
    or public.defence_learning_has_capability('admin.configure')
  );

-- Derived media: transcript, captions and chapters inherit the parent's
-- visibility exactly.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'defence_learning_chapters',
    'defence_learning_transcript_sections',
    'defence_learning_caption_cues'
  ]
  loop
    execute format('drop policy if exists "dl %s parent read" on public.%I', v_table, v_table);
    execute format(
      'create policy "dl %s parent read" on public.%I for select to authenticated using (public.defence_learning_can_see_content(content_id) or public.defence_learning_pipeline_visible(content_id))',
      v_table, v_table
    );
  end loop;
end $$;

drop policy if exists "dl courses read" on public.defence_learning_courses;
create policy "dl courses read" on public.defence_learning_courses
  for select to authenticated using (true);

drop policy if exists "dl course lessons read" on public.defence_learning_course_lessons;
create policy "dl course lessons read" on public.defence_learning_course_lessons
  for select to authenticated
  using (public.defence_learning_can_see_content(content_id) or public.defence_learning_pipeline_visible(content_id));

drop policy if exists "dl assessments read" on public.defence_learning_assessments;
create policy "dl assessments read" on public.defence_learning_assessments
  for select to authenticated
  using (public.defence_learning_can_see_content(content_id) or public.defence_learning_pipeline_visible(content_id));

-- Questions (with answers) are never readable by learners. Instructors and
-- administrators read them; the learner-facing assessment RPC returns prompts
-- without answer_id.
drop policy if exists "dl assessment questions staff read" on public.defence_learning_assessment_questions;
create policy "dl assessment questions staff read" on public.defence_learning_assessment_questions
  for select to authenticated
  using (
    public.defence_learning_has_capability('assessment.manage')
    or public.defence_learning_has_capability('admin.configure')
  );

drop policy if exists "dl attempts self read" on public.defence_learning_attempts;
create policy "dl attempts self read" on public.defence_learning_attempts
  for select to authenticated
  using (
    persona_id = public.defence_learning_persona_id()
    or public.defence_learning_has_capability('reports.view_network')
  );

-- Attempts are written only by defence_learning_submit_attempt(), which
-- grades answers with the server-held key and enforces max_attempts.

drop policy if exists "dl signoffs read" on public.defence_learning_competency_signoffs;
create policy "dl signoffs read" on public.defence_learning_competency_signoffs
  for select to authenticated
  using (
    persona_id = public.defence_learning_persona_id()
    or public.defence_learning_has_capability('competency.signoff')
    or public.defence_learning_has_capability('reports.view_network')
  );

drop policy if exists "dl signoffs instructor write" on public.defence_learning_competency_signoffs;
create policy "dl signoffs instructor write" on public.defence_learning_competency_signoffs
  for insert to authenticated
  with check (
    public.defence_learning_has_capability('competency.signoff')
    and signed_by = public.defence_learning_persona_id()
  );

-- Assignments: unit leadership sees their own unit; the assignee sees
-- assignments addressed to them.
drop policy if exists "dl assignments read" on public.defence_learning_assignments;
create policy "dl assignments read" on public.defence_learning_assignments
  for select to authenticated
  using (
    (target_kind = 'persona' and target_id = public.defence_learning_persona_id()::text)
    or (
      target_kind = 'unit'
      and target_id = public.defence_learning_current_unit()
    )
    or public.defence_learning_has_capability('reports.view_network')
  );

drop policy if exists "dl assignments manager write" on public.defence_learning_assignments;
create policy "dl assignments manager write" on public.defence_learning_assignments
  for all to authenticated
  using (public.defence_learning_has_capability('assignment.manage') or public.defence_learning_has_capability('admin.configure'))
  with check (
    (public.defence_learning_has_capability('assignment.manage') or public.defence_learning_has_capability('admin.configure'))
    and assigned_by = public.defence_learning_persona_id()
  );

-- Progress: learners read and write their own rows. Progress writes go through
-- the RPC above so event identifiers are deduplicated server-side.
drop policy if exists "dl progress self read" on public.defence_learning_progress;
create policy "dl progress self read" on public.defence_learning_progress
  for select to authenticated
  using (persona_id = public.defence_learning_persona_id());

drop policy if exists "dl progress self write" on public.defence_learning_progress;
create policy "dl progress self write" on public.defence_learning_progress
  for insert to authenticated
  with check (persona_id = public.defence_learning_persona_id());

drop policy if exists "dl progress self update" on public.defence_learning_progress;
create policy "dl progress self update" on public.defence_learning_progress
  for update to authenticated
  using (persona_id = public.defence_learning_persona_id())
  with check (persona_id = public.defence_learning_persona_id());

drop policy if exists "dl progress events self read" on public.defence_learning_progress_events;
create policy "dl progress events self read" on public.defence_learning_progress_events
  for select to authenticated
  using (persona_id = public.defence_learning_persona_id());

drop policy if exists "dl downloads self" on public.defence_learning_downloads;
create policy "dl downloads self" on public.defence_learning_downloads
  for all to authenticated
  using (persona_id = public.defence_learning_persona_id())
  with check (
    persona_id = public.defence_learning_persona_id()
    and public.defence_learning_has_capability('download.request')
    and exists (
      select 1 from public.defence_learning_content c
      where c.id = content_id
        and public.defence_learning_can_see_content(c.id)
        and c.download_policy in ('allowed','audio_only')
    )
  );

drop policy if exists "dl questions own read" on public.defence_learning_questions;
create policy "dl questions own read" on public.defence_learning_questions
  for select to authenticated
  using (
    persona_id = public.defence_learning_persona_id()
    or public.defence_learning_has_capability('question.answer')
  );

drop policy if exists "dl questions ask" on public.defence_learning_questions;
create policy "dl questions ask" on public.defence_learning_questions
  for insert to authenticated
  with check (
    persona_id = public.defence_learning_persona_id()
    and public.defence_learning_has_capability('question.ask')
  );

drop policy if exists "dl questions answer" on public.defence_learning_questions;
create policy "dl questions answer" on public.defence_learning_questions
  for update to authenticated
  using (public.defence_learning_has_capability('question.answer'))
  with check (public.defence_learning_has_capability('question.answer'));

drop policy if exists "dl question rate self" on public.defence_learning_question_rate;
create policy "dl question rate self" on public.defence_learning_question_rate
  for all to authenticated
  using (persona_id = public.defence_learning_persona_id())
  with check (persona_id = public.defence_learning_persona_id());

-- Announcements: clearance and audience gated before any title is returned.
drop policy if exists "dl announcements read" on public.defence_learning_announcements;
create policy "dl announcements read" on public.defence_learning_announcements
  for select to authenticated
  using (
    exists (
      select 1 from public.defence_learning_personas p
      where p.auth_user_id = auth.uid() and p.active
        and public.defence_learning_clearance_rank(p.clearance)
              >= public.defence_learning_clearance_rank(classification)
        and (cardinality(audience_branches) = 0 or p.branch = any(audience_branches))
        and (cardinality(audience_units) = 0 or p.unit = any(audience_units))
        and (cardinality(audience_paths) = 0 or p.training_path = any(audience_paths))
    )
    or public.defence_learning_has_capability('publish.publish')
    or public.defence_learning_has_capability('admin.configure')
  );

drop policy if exists "dl announcements publisher write" on public.defence_learning_announcements;
create policy "dl announcements publisher write" on public.defence_learning_announcements
  for all to authenticated
  using (public.defence_learning_has_capability('publish.publish'))
  with check (public.defence_learning_has_capability('publish.publish'));

drop policy if exists "dl acks self" on public.defence_learning_announcement_acks;
create policy "dl acks self" on public.defence_learning_announcement_acks
  for all to authenticated
  using (persona_id = public.defence_learning_persona_id())
  with check (persona_id = public.defence_learning_persona_id());

drop policy if exists "dl publication read" on public.defence_learning_publication_events;
create policy "dl publication read" on public.defence_learning_publication_events
  for select to authenticated
  using (public.defence_learning_pipeline_visible(content_id));

drop policy if exists "dl publication insert" on public.defence_learning_publication_events;
create policy "dl publication insert" on public.defence_learning_publication_events
  for insert to authenticated
  with check (
    public.defence_learning_has_capability('admin.configure')
    or public.defence_learning_has_capability('publish.publish')
    or public.defence_learning_has_capability('publish.submit')
  );

-- Audit: readable only with audit.view; insertable by any authenticated staff
-- because user actions (downloads, exports) are themselves audited. Rows are
-- append-only: update and delete are revoked below.
drop policy if exists "dl audit read" on public.defence_learning_audit_events;
create policy "dl audit read" on public.defence_learning_audit_events
  for select to authenticated
  using (public.defence_learning_has_capability('audit.view'));

drop policy if exists "dl audit append" on public.defence_learning_audit_events;
create policy "dl audit append" on public.defence_learning_audit_events
  for insert to authenticated
  with check (actor_id is null or actor_id = public.defence_learning_persona_id());

revoke update, delete, truncate on public.defence_learning_audit_events from authenticated, anon;
revoke update, delete, truncate on public.defence_learning_publication_events from authenticated, anon;

drop policy if exists "dl jobs publisher read" on public.defence_learning_jobs;
create policy "dl jobs publisher read" on public.defence_learning_jobs
  for select to authenticated
  using (
    created_by = public.defence_learning_persona_id()
    or public.defence_learning_has_capability('publish.review')
    or public.defence_learning_has_capability('admin.configure')
  );

drop policy if exists "dl jobs publisher write" on public.defence_learning_jobs;
create policy "dl jobs publisher write" on public.defence_learning_jobs
  for all to authenticated
  using (
    created_by = public.defence_learning_persona_id()
    or public.defence_learning_has_capability('publish.review')
  )
  with check (
    created_by = public.defence_learning_persona_id()
    or public.defence_learning_has_capability('publish.review')
  );

-- ---------------------------------------------------------------------------
-- 5. Aggregate reports (no free text, no clinical data, no ranking)
-- ---------------------------------------------------------------------------

create or replace function public.defence_learning_unit_report(p_unit text default null)
returns table (
  persona_id     uuid,
  full_name      text,
  unit           text,
  training_path  text,
  assigned       bigint,
  started        bigint,
  completed      bigint,
  overdue        bigint,
  acknowledgements bigint,
  competencies   bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me public.defence_learning_personas%rowtype;
  v_scope text;
begin
  select * into v_me from public.defence_learning_personas
  where auth_user_id = auth.uid() and active limit 1;

  if v_me.id is null then
    return;
  end if;

  if public.defence_learning_has_capability('reports.view_network') then
    v_scope := p_unit;
  elsif public.defence_learning_has_capability('reports.view_unit') then
    -- Unit scope is forced; a caller cannot widen it by passing another unit.
    v_scope := v_me.unit;
  else
    raise exception 'reports capability required';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.unit,
    p.training_path,
    count(a.id) filter (where a.status <> 'completed') as assigned,
    count(a.id) filter (where a.status <> 'completed' and exists (
      select 1 from public.defence_learning_progress pr
      where pr.persona_id = p.id
        and pr.content_id = a.content_id
        and pr.viewed_at is not null
    )) as started,
    count(a.id) filter (where exists (
      select 1 from public.defence_learning_progress pr
      where pr.persona_id = p.id
        and pr.content_id = a.content_id
        and pr.completed_at is not null
    )) as completed,
    count(a.id) filter (where a.due_at < now() and a.status <> 'completed') as overdue,
    count(a.id) filter (where exists (
      select 1 from public.defence_learning_progress pr
      where pr.persona_id = p.id
        and pr.content_id = a.content_id
        and pr.acknowledged_at is not null
    )) as acknowledgements,
    (select count(*) from public.defence_learning_competency_signoffs s
      where s.persona_id = p.id and s.level = 'competent') as competencies
  from public.defence_learning_personas p
  left join public.defence_learning_assignments a
    on (a.target_kind = 'persona' and a.target_id = p.id::text)
    or (a.target_kind = 'unit' and a.target_id = p.unit)
  where p.active
    and (v_scope is null or p.unit = v_scope)
  group by p.id, p.full_name, p.unit, p.training_path
  order by p.unit, p.full_name;
end;
$$;

revoke all on function public.defence_learning_unit_report(text) from public;
grant execute on function public.defence_learning_unit_report(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Storage, signed URLs and lifecycle notes
-- ---------------------------------------------------------------------------
--
-- Media is never public. Objects live under
--   defence-learning/<classification>/<content_id>/<version>/<filename>
-- and are served only through a short-lived signed URL minted by an edge
-- function after the same capability and classification checks used above.
-- Suggested TTL: 120 seconds for view-only media, 900 seconds for downloads.
-- The bucket is private, so no storage.objects select policy is granted to
-- authenticated clients; signed URL creation uses the service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'defence-learning',
  'defence-learning',
  false,
  2147483648,
  array[
    'video/mp4','video/quicktime','audio/mpeg','audio/wav','audio/mp4',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Retention / lifecycle reminders for the operator (documentation only):
--   * withdrawn and superseded content keeps transcript + captions sealed;
--     media objects are archived, not deleted, until the retention window ends.
--   * audit_events are append-only and retained for seven years.
--   * progress_events are pruned after 24 months; progress rolls up survive.
--   * download rows become 'revoked' when a persona's unit or clearance
--     changes. The revoke trigger is intentionally left to the deployment
--     stage because it depends on how persona changes are administered here.
--
-- Rate limiting for questions and the AI tutor is enforced in the edge
-- function via defence_learning_question_rate (for example: 20 questions and
-- 40 tutor calls per persona per rolling hour) in addition to any gateway
-- limits. The table is present so the limits survive function restarts.
