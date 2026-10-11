-- WATJAI database setup
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Enable Anonymous Sign-Ins first: Authentication > Sign In / Providers > Anonymous.

create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 90),
  description text not null default '' check (char_length(description) <= 180),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  player_name text not null default 'ไม่ระบุชื่อ' check (char_length(player_name) <= 32),
  score integer not null check (score >= 0),
  total integer not null check (total between 1 and 20 and score <= total),
  created_at timestamptz not null default now()
);

create index if not exists quizzes_owner_id_idx on public.quizzes(owner_id);
create index if not exists quizzes_slug_idx on public.quizzes(slug);
create index if not exists quiz_scores_quiz_id_idx on public.quiz_scores(quiz_id);

alter table public.quizzes enable row level security;
alter table public.quiz_scores enable row level security;

revoke all on public.quizzes from anon, authenticated;
revoke all on public.quiz_scores from anon, authenticated;
grant select, insert, update, delete on public.quizzes to authenticated;
grant select, insert on public.quiz_scores to authenticated;

drop policy if exists "Anyone can read published quizzes" on public.quizzes;
create policy "Anyone can read published quizzes"
on public.quizzes for select to authenticated
using (published = true or owner_id = (select auth.uid()));

drop policy if exists "Owners create quizzes" on public.quizzes;
create policy "Owners create quizzes"
on public.quizzes for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners update own quizzes" on public.quizzes;
create policy "Owners update own quizzes"
on public.quizzes for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Owners delete own quizzes" on public.quizzes;
create policy "Owners delete own quizzes"
on public.quizzes for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Submit scores for published quizzes" on public.quiz_scores;
create policy "Submit scores for published quizzes"
on public.quiz_scores for insert to authenticated
with check (
  exists (
    select 1 from public.quizzes q
    where q.id = quiz_id and q.published = true
    and score <= total
    and total = jsonb_array_length(q.questions)
  )
);

drop policy if exists "Only quiz owners can read scores" on public.quiz_scores;
create policy "Only quiz owners can read scores"
on public.quiz_scores for select to authenticated
using (
  exists (
    select 1 from public.quizzes q
    where q.id = quiz_id and q.owner_id = (select auth.uid())
  )
);

-- Scores are not publicly readable. Never add a public SELECT policy for quiz_scores.
-- Important limitation: this browser-based MVP computes scores in the browser.
-- For prizes/high-stakes use, validate answers server-side with an Edge Function.
