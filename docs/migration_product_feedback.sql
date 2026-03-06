-- Migration: product feedback collection
-- Run this in Supabase SQL Editor

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  onboarding_rating text not null check (onboarding_rating in ('bad', 'okay', 'good')),
  generated_posts_rating text not null check (generated_posts_rating in ('bad', 'okay', 'good')),
  would_use_if_resolved_rating text not null check (would_use_if_resolved_rating in ('not_really', 'maybe', 'absolutely')),
  notes text,
  source text not null default 'web_create_dropdown',
  created_at timestamptz not null default now()
);

alter table public.product_feedback enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_feedback'
      and policyname = 'Users can insert own product feedback'
  ) then
    create policy "Users can insert own product feedback"
      on public.product_feedback
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;
