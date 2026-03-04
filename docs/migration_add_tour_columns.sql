-- Migration: Add tour-seen flags to user_profiles
-- Run this in Supabase SQL Editor if your database was created before this migration.

alter table public.user_profiles
  add column if not exists tour_create_seen boolean not null default false,
  add column if not exists tour_post_review_seen boolean not null default false,
  add column if not exists tour_toggle_seen boolean not null default false,
  add column if not exists tour_sidebar_seen boolean not null default false,
  add column if not exists tour_ext_post_review_seen boolean not null default false;
