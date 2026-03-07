-- LinkedIn Marketing Agent — Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New Query)

-- ============================================
-- TABLES
-- ============================================

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  linkedin_headline text,
  avatar_url text,
  onboarding_complete boolean default false,
  brand_guidelines text default null,
  tour_create_seen boolean not null default false,
  tour_post_review_seen boolean not null default false,
  tour_toggle_seen boolean not null default false,
  tour_sidebar_seen boolean not null default false,
  tour_ext_post_review_seen boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default 'Default',
  is_active boolean default true,
  tone_description text,
  formality text check (formality in ('casual', 'balanced', 'formal')),
  personality_traits text[] default '{}',
  signature_phrases text[] default '{}',
  avoid_phrases text[] default '{}',
  formatting_preferences jsonb default '{}',
  sample_posts text[] default '{}',
  system_prompt text,
  voice_profile_version text default 'v2',
  core_voice_profile jsonb default '{}'::jsonb,
  exemplar_posts jsonb default '[]'::jsonb,
  learned_preferences jsonb default '[]'::jsonb,
  generation_instruction_pack text,
  profile_stats jsonb default '{}'::jsonb,
  onboarding_answers jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.generated_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  voice_profile_id uuid references public.voice_profiles(id) on delete set null,
  user_input text not null,
  generated_text text not null,
  model_used text,
  tokens_used integer,
  status text not null default 'draft' check (status in ('draft', 'approved', 'revised')),
  created_at timestamptz default now()
);

create table public.post_interactions (
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

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.user_profiles enable row level security;
alter table public.voice_profiles enable row level security;
alter table public.generated_posts enable row level security;
alter table public.post_interactions enable row level security;
alter table public.onboarding_sessions enable row level security;

create policy "Users CRUD own profile" on public.user_profiles
  for all using (auth.uid() = id);

create policy "Users CRUD own voice profiles" on public.voice_profiles
  for all using (auth.uid() = user_id);

create policy "Users CRUD own posts" on public.generated_posts
  for all using (auth.uid() = user_id);

create policy "Users CRUD own post interactions" on public.post_interactions
  for all using (auth.uid() = user_id);

create policy "Users CRUD own sessions" on public.onboarding_sessions
  for all using (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
