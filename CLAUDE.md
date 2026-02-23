# LinkedIn Marketing Agent

## Overview
AI-powered LinkedIn content agent for PE/real estate professionals.
Core moat: tone-mimicking through conversational onboarding + progressive voice learning.

## Tech Stack
- Monorepo: Turborepo + pnpm workspaces
- Web: Next.js 15 (App Router) + React 19
- Extension: WXT framework (Manifest V3) + React
- Backend: Supabase (PostgreSQL + Auth) via @supabase/supabase-js + @supabase/ssr
- API: Next.js Route Handlers (no tRPC — hackathon simplification)
- UI: shadcn/ui + Tailwind CSS (web only); hand-written CSS in extension Shadow DOM
- AI: Vercel AI SDK + @ai-sdk/anthropic
- LLM: claude-sonnet-4-6 (generation), claude-haiku-4-5-20251001 (analysis)

## Structure
apps/web — Next.js dashboard + API backend (onboarding, post creation, all Route Handlers)
apps/extension — WXT Chrome extension (LinkedIn sidebar, popup, background auth)
packages/shared — Types, constants, Supabase client factory

## Conventions
- Files: kebab-case (voice-profile.ts)
- Components: PascalCase (VoiceProfile.tsx)
- Always use TypeScript strict mode
- API routes use Next.js Route Handlers with CORS headers (extension fetches cross-origin)
- Extension content scripts use Shadow DOM (WXT createShadowRootUi) with hand-written CSS
- Auth: dual-mode — cookie-based (web) + Bearer token (extension) via getAuthUser() helper
