# LinkedIn Marketing Agent

AI-powered LinkedIn content creation for PE and real estate professionals. The app learns your writing voice through a conversational onboarding flow, then generates post drafts that sound like you — accessible from a sidebar directly inside LinkedIn.

## What it does

- **Voice onboarding** — chat-based flow that analyzes your writing style and tone
- **Post generation** — describe a topic, get a full draft in your voice powered by Claude
- **LinkedIn sidebar** — Chrome extension injects a panel directly into LinkedIn so you never leave the page
- **Review & approve** — edit drafts, regenerate, and approve before publishing

## Stack

- **Web app:** Next.js 15 (App Router) + Supabase + Vercel AI SDK
- **Extension:** WXT (Manifest V3) + React, injected into LinkedIn via Shadow DOM
- **AI:** Anthropic Claude (claude-sonnet-4-6 for generation, claude-haiku-4-5 for onboarding)
- **Auth:** Google OAuth via Supabase — shared between web and extension via Bearer tokens
- **Monorepo:** Turborepo + pnpm workspaces

## Running locally

### Prerequisites

- Node.js 18+
- pnpm 9+ (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key
ANTHROPIC_API_KEY=              # Anthropic API key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up the database

Run the schema in your Supabase project:

1. Open your Supabase project → **SQL Editor**
2. Paste and run the contents of `docs/schema.sql`

### 4. Configure Google OAuth

1. In [Supabase Dashboard](https://supabase.com) → **Authentication → Providers → Google**, add your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Add these redirect URLs in your Google Cloud Console OAuth credentials:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/extension-done`

### 5. Start the web app

```bash
pnpm dev
```

The app runs at `http://localhost:3000`.

### 6. Run the Chrome extension (optional)

In a separate terminal:

```bash
cd apps/extension
pnpm dev
```

Then load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `apps/extension/.output/chrome-mv3`

The extension will connect to `localhost:3000` by default.

## Building for production

```bash
# Web app (deploy to Vercel)
pnpm build

# Chrome extension ZIP (for Chrome Web Store)
cd apps/extension
pnpm run zip
```
