-- Migration: voice engine v2
-- Run this in the Supabase SQL Editor

alter table public.voice_profiles
  add column if not exists voice_profile_version text default 'v2',
  add column if not exists core_voice_profile jsonb default '{}'::jsonb,
  add column if not exists exemplar_posts jsonb default '[]'::jsonb,
  add column if not exists learned_preferences jsonb default '[]'::jsonb,
  add column if not exists generation_instruction_pack text default null,
  add column if not exists profile_stats jsonb default '{}'::jsonb;

alter table public.generated_posts
  add column if not exists status text not null default 'draft';

alter table public.generated_posts
  drop constraint if exists generated_posts_status_check;

alter table public.generated_posts
  add constraint generated_posts_status_check
  check (status in ('draft', 'approved', 'revised'));

create table if not exists public.post_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  generated_post_id uuid references public.generated_posts(id) on delete cascade not null,
  voice_profile_id uuid references public.voice_profiles(id) on delete set null,
  interaction_type text not null check (interaction_type in ('approve', 'feedback', 'edit')),
  final_text text not null,
  feedback_text text default null,
  original_text text default null,
  revision_count integer not null default 0,
  interaction_signals jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.post_interactions
  add column if not exists interaction_signals jsonb default '[]'::jsonb;

alter table public.post_interactions enable row level security;

drop policy if exists "Users CRUD own post interactions" on public.post_interactions;

create policy "Users CRUD own post interactions"
  on public.post_interactions
  for all
  using (auth.uid() = user_id);
