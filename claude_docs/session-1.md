# Session 1 — Initial Implementation (Feb 23, 2026)

## What Was Done

Built the complete MVP scaffold across all 6 phases of the hackathon implementation plan. Both `apps/web` (Next.js) and `apps/extension` (WXT Chrome extension) build successfully.

---

## Architecture Overview

```
linkedin-agent/
├── apps/web/                  # Next.js 15 — dashboard + API backend
├── apps/extension/            # WXT Chrome extension (Manifest V3)
├── packages/shared/           # Types, constants, Supabase client factory
├── turbo.json                 # Turborepo config
├── pnpm-workspace.yaml        # pnpm workspaces
└── package.json               # Root workspace
```

### How the pieces connect:
- Web app serves API routes consumed by both the web UI and the Chrome extension
- Extension fetches `http://localhost:3000/api/*` with Bearer token auth
- Web app uses cookie-based auth via `@supabase/ssr`
- All API routes include CORS headers for cross-origin extension requests

---

## Files Created (by area)

### Root Monorepo
| File | Purpose |
|------|---------|
| `package.json` | Root workspace, Turborepo + TypeScript |
| `pnpm-workspace.yaml` | Defines `apps/*` + `packages/*` workspaces |
| `turbo.json` | dev/build/lint task pipeline |
| `.gitignore` | node_modules, .next, .wxt, dist, .output, env files |

### packages/shared
| File | Purpose |
|------|---------|
| `src/types.ts` | DB row types (UserProfile, VoiceProfile, GeneratedPost), API types, Database type |
| `src/constants.ts` | APP_NAME, ONBOARDING_GOALS, TONE_WORDS, FORMALITY_OPTIONS |
| `src/supabase.ts` | `createSupabaseClient()` factory |
| `src/index.ts` | Barrel re-exports |

### apps/web — Pages & Layouts
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Landing page with hero, "how it works", CTA |
| `src/app/layout.tsx` | Root layout with metadata |
| `src/app/globals.css` | Tailwind v4 import + CSS variables |
| `src/app/auth/login/page.tsx` | "Sign in with Google" button (client component) |
| `src/app/auth/callback/route.ts` | OAuth code exchange → redirect to /onboarding or /create |
| `src/app/auth/extension-done/page.tsx` | Token handoff page for extension auth capture |
| `src/app/onboarding/page.tsx` | Server component — auth check → renders OnboardingChat |
| `src/app/onboarding/layout.tsx` | Minimal gradient layout |
| `src/app/(dashboard)/layout.tsx` | Dashboard shell with top nav |
| `src/app/(dashboard)/create/page.tsx` | Post creation — topic input, streaming preview, copy |

### apps/web — API Routes
| File | Purpose |
|------|---------|
| `src/app/api/generate/route.ts` | **Core endpoint** — streams posts via `claude-sonnet-4-6`, saves to DB |
| `src/app/api/onboarding/analyze/route.ts` | Voice analysis via `claude-haiku-4-5-20251001`, creates voice profile |
| `src/app/api/me/route.ts` | Returns user profile + voice profile status |

### apps/web — Lib
| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | `getAuthUser()` dual-mode helper (cookie + Bearer), CORS headers |
| `src/lib/supabase/server.ts` | Server-side Supabase client (cookie-based via @supabase/ssr) |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/supabase/middleware.ts` | Session refresh + auth redirect logic |
| `src/lib/ai/prompts.ts` | `buildSystemPrompt()` + `buildUserPrompt()` — modular prompt builder |
| `src/lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `src/middleware.ts` | Next.js middleware — calls updateSession, protects routes |

### apps/web — Components
| File | Purpose |
|------|---------|
| `src/components/onboarding/onboarding-chat.tsx` | 7-step state machine chat UI |
| `src/components/onboarding/message-bubble.tsx` | Chat bubble with markdown bold support |
| `src/components/onboarding/typing-indicator.tsx` | Animated typing dots |
| `src/components/create/linkedin-preview.tsx` | LinkedIn-style post preview card |
| `src/components/create/post-actions.tsx` | Copy to clipboard + regenerate buttons |

### apps/extension
| File | Purpose |
|------|---------|
| `wxt.config.ts` | WXT config — React module, permissions, host_permissions |
| `entrypoints/popup/App.tsx` | Popup UI — login state check, "Get Started" button |
| `entrypoints/popup/index.html` | Popup HTML shell |
| `entrypoints/popup/main.tsx` | React entry point for popup |
| `entrypoints/background.ts` | Service worker — listens for auth callback, stores tokens |
| `entrypoints/linkedin-sidebar.content.tsx` | Content script — Shadow DOM sidebar injection on linkedin.com |
| `assets/sidebar.css` | Hand-written CSS for sidebar (NOT in entrypoints — causes WXT naming conflict) |
| `components/sidebar/SidebarApp.tsx` | Main sidebar — auth gate, topic input, streaming preview |
| `components/sidebar/AuthGate.tsx` | Unauthenticated state — "Get Started" link |
| `components/sidebar/GenerateForm.tsx` | Topic input form |
| `components/sidebar/PostPreview.tsx` | LinkedIn preview + copy button |
| `lib/auth.ts` | Token management (chrome.storage.local) |
| `lib/api.ts` | `apiFetch()` wrapper + `streamGenerate()` async generator (parses Data Stream Protocol) |

### Database
| File | Purpose |
|------|---------|
| `docs/schema.sql` | Full SQL schema — tables, RLS policies, auto-create trigger |

---

## Database Schema (NOT YET RUN)

The SQL in `docs/schema.sql` needs to be run in the Supabase SQL Editor. It creates:

- **`user_profiles`** — id (refs auth.users), display_name, avatar_url, onboarding_complete
- **`voice_profiles`** — tone_description, formality, personality_traits, signature_phrases, avoid_phrases, formatting_preferences, sample_posts, system_prompt, onboarding_answers
- **`generated_posts`** — user_input, generated_text, model_used, tokens_used
- **RLS policies** — users can only CRUD their own data
- **Trigger** — auto-creates user_profile on signup from auth.users metadata

---

## Key Technical Decisions & Gotchas

### 1. Supabase Generics Issue
The `Database` type in `packages/shared/src/types.ts` doesn't match what the latest `@supabase/supabase-js` v2 expects (missing `PostgrestVersion` metadata field). **Workaround**: Dropped the `Database` generic from `createServerClient` and `createClient` calls in the web app. Queries work at runtime, just no compile-time table type checking. The types in `packages/shared` are still useful for manual casting (e.g., `as VoiceProfile`).

### 2. WXT Entrypoint Naming
WXT treats every file in `entrypoints/` as a separate entrypoint. The sidebar CSS file was originally at `entrypoints/linkedin-sidebar.css` which conflicted with `entrypoints/linkedin-sidebar.content.tsx`. **Fix**: Moved CSS to `assets/sidebar.css` and imported via `?inline`.

### 3. Auth Dual-Mode
`getAuthUser()` in `src/lib/auth.ts` supports both:
- **Cookie auth** (web app) — uses `createSupabaseServer()` from @supabase/ssr
- **Bearer token auth** (extension) — uses plain `createClient()` + `getUser(token)`

The return type is cast to `SupabaseClient` to unify both branches.

### 4. Extension Auth Flow
1. Extension popup opens `http://localhost:3000/auth/login?from=extension`
2. Google OAuth completes → redirects to `/auth/extension-done`
3. Page extracts session tokens and puts them in URL params
4. Background script detects URL via `chrome.tabs.onUpdated`, stores tokens in `chrome.storage.local`, closes tab

### 5. Streaming in Extension
Can't use `useChat` hook cross-origin. Instead, `lib/api.ts` has `streamGenerate()` — an async generator that:
- Fetches `/api/generate` with Bearer token
- Reads the response body as a stream
- Parses Vercel AI SDK Data Stream Protocol (lines prefixed `0:` contain JSON text chunks)

### 6. Model Usage
- **`claude-sonnet-4-6`** — Post generation (`/api/generate`)
- **`claude-haiku-4-5-20251001`** — Voice analysis during onboarding (`/api/onboarding/analyze`)

---

## What's NOT Done Yet

### Must do before demo:
1. **Run database schema** — `docs/schema.sql` in Supabase SQL Editor
2. **Configure Supabase Auth** — enable Google provider in dashboard, add redirect URL
3. **Extension icons** — placeholder PNGs are empty (0 bytes), need real icons
4. **Zod v3 peer dep** — installed but AI SDK warns about v4 being present (cosmetic)

### Planned iterations:
- **Prompt engineering** — the `buildSystemPrompt()` in `src/lib/ai/prompts.ts` is modular and ready for a "case folder" approach where curated voice/tone examples are fed to the writer
- **Create page uses `useCompletion`** — may need to switch to manual streaming like the extension if there are issues with the hook + body params
- **No tests** — hackathon decision, not needed for demo
- **No deployment** — runs on localhost only

---

## How to Run

```bash
# From repo root
pnpm install
pnpm dev          # Starts Next.js on :3000 + WXT extension build

# Load extension
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select apps/extension/.output/chrome-mv3
```

### Environment Variables
`.env.local` exists at repo root and `apps/web/.env.local` (copied). Contains:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` + `DIRECT_URL`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## Demo Flow (end-to-end)

1. Install Chrome extension → popup shows "Get Started"
2. Opens web app → Google OAuth login
3. Conversational onboarding (7 questions capturing voice)
4. AI analyzes responses → creates voice profile
5. Navigate to linkedin.com → sidebar appears
6. Enter a topic → AI streams a post in user's voice
7. LinkedIn-style preview renders in real-time
8. "Copy to Clipboard" → paste into LinkedIn composer
