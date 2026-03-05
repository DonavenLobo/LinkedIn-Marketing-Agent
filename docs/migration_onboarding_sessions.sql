-- Migration: onboarding_sessions table
-- Run this in the Supabase SQL Editor

create table public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  mode text not null default 'voice' check (mode in ('voice','text')),
  transcript jsonb default '[]'::jsonb,
  turn_count integer default 0,
  linkedin_import jsonb default null,
  tool_data jsonb default null,
  writing_samples text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.onboarding_sessions enable row level security;

create policy "Users CRUD own sessions"
  on public.onboarding_sessions
  for all
  using (auth.uid() = user_id);

-- Add LinkedIn import data column to user_profiles
alter table public.user_profiles
  add column if not exists linkedin_import_data jsonb default null;
