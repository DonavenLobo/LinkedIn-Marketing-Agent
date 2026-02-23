# LinkedIn Marketing Agent MVP: complete technical instructions for Claude Code

**This document is a comprehensive technical blueprint for building an AI-powered LinkedIn Marketing Agent.** The product targets SMB Private Equity firms, real estate owners, and capital raisers who need authentic LinkedIn content that sounds like them — not generic AI slop. The core moat is tone-mimicking through conversational onboarding and ongoing chat refinement. The MVP consists of three interconnected systems: a Chrome extension overlaying LinkedIn, a Next.js web dashboard, and an AI backend for voice profiling and content generation. Below are complete instructions across architecture, implementation, and strategy for building this product.

---

## 1. Tech stack and monorepo architecture

The recommended stack optimizes for speed-to-market, code sharing between the Chrome extension and web app, and strong AI integration capabilities. **Every technology choice below was selected for a 2-developer team building an MVP in approximately 10 weeks.**

### Core technology decisions

| Layer | Technology | Why |
|-------|-----------|-----|
| Monorepo | **Turborepo + pnpm workspaces** | Incremental builds, task parallelization, Vercel remote caching, lightweight setup |
| Web Dashboard | **Next.js 15+ (App Router)** | Largest React ecosystem, Server Components reduce API boilerplate, excellent Supabase integration |
| Chrome Extension | **WXT framework** | Actively maintained (Plasmo has community maintenance concerns), Vite-powered, built-in Shadow DOM UI creation, framework-agnostic |
| Backend/BaaS | **Supabase** | PostgreSQL with pgvector for embeddings, built-in auth, Edge Functions for AI orchestration, Realtime subscriptions, Row-Level Security |
| ORM | **Prisma** (via Supabase PostgreSQL) | Type-safe queries, excellent migration story, schema-as-documentation |
| API Layer | **tRPC + Zod** | End-to-end type safety across extension and web app, perfect for monorepo, Zod schemas shared between validation and forms |
| UI Components | **shadcn/ui + Tailwind CSS** | Copy-paste components, full customization, works in both web and extension contexts |
| Chat UI | **Vercel AI SDK v6 + AI Elements** | 20+ production-ready chat components, streaming support, `useChat` hook, built on shadcn/ui |
| LLM Primary | **Claude Sonnet 4** | Best natural voice and style instruction-following at ~$3/$15 per 1M tokens |
| LLM Budget | **Claude Haiku** or **Gemini 2.5 Flash** | Analysis tasks, initial drafts, at $0.25-1.25 per 1M tokens |
| Auth | **Supabase Auth** | Shared sessions between extension and web app, OAuth support, Chrome extension patterns documented |
| Hosting | **Vercel** (web) + **Supabase** (backend/DB) | Zero-config deployment, edge functions, scales automatically |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | Modern, fast, Playwright supports Chrome extension testing natively |

### Monorepo file structure

```
linkedin-agent/
├── apps/
│   ├── web/                           # Next.js 15+ App Router
│   │   ├── src/app/
│   │   │   ├── (auth)/               # Login, signup pages
│   │   │   ├── (dashboard)/          # Main app layout
│   │   │   │   ├── create/           # Chat-based post creation
│   │   │   │   ├── calendar/         # Content calendar
│   │   │   │   ├── history/          # Post history & analytics
│   │   │   │   └── settings/         # Voice profile management
│   │   │   ├── onboarding/           # Conversational onboarding flow
│   │   │   └── api/trpc/[trpc]/      # tRPC API handler
│   │   ├── src/components/           # Web-specific components
│   │   ├── src/trpc/                 # tRPC client config
│   │   └── package.json
│   └── extension/                    # WXT Chrome Extension
│       ├── entrypoints/
│       │   ├── background.ts         # MV3 service worker
│       │   ├── popup/                # Extension popup (React)
│       │   │   ├── index.html
│       │   │   └── App.tsx
│       │   ├── linkedin-sidebar.content.tsx   # Sidebar UI injected into LinkedIn
│       │   └── linkedin-composer.content.tsx   # Composer enhancement
│       ├── wxt.config.ts
│       └── package.json
├── packages/
│   ├── shared/                       # Shared between all apps
│   │   ├── src/types/                # TypeScript types (VoiceProfile, Post, etc.)
│   │   ├── src/schemas/              # Zod validation schemas
│   │   ├── src/constants/            # Post types, tone dimensions, etc.
│   │   └── src/utils/                # Shared utility functions
│   ├── ui/                           # Shared React components
│   │   ├── src/components/
│   │   │   ├── LinkedInPostPreview/  # Realistic LinkedIn post mockup
│   │   │   ├── ChatInterface/        # Chat bubbles, streaming, actions
│   │   │   ├── VoiceProfileCard/     # Voice profile visualization
│   │   │   └── ContentCalendar/      # Calendar grid component
│   │   └── src/styles/
│   ├── ai/                           # AI service layer
│   │   ├── src/
│   │   │   ├── prompt-builder.ts     # Assembles generation prompts
│   │   │   ├── voice-analyzer.ts     # Extracts voice profile from samples
│   │   │   ├── content-generator.ts  # Generates posts via LLM
│   │   │   ├── style-validator.ts    # Validates output matches voice
│   │   │   └── templates/            # Prompt templates per post type
│   │   └── package.json
│   └── db/                           # Prisma schema + client
│       ├── prisma/schema.prisma
│       └── package.json
├── supabase/
│   ├── migrations/                   # Database migrations
│   └── functions/                    # Edge Functions (AI orchestration)
├── turbo.json
├── pnpm-workspace.yaml
├── CLAUDE.md                         # Context file for AI coding assistants
└── package.json
```

### Database schema

Design the schema around four core entities: users, voice profiles, generated posts, and calendar entries. Use PostgreSQL JSONB columns for flexible metadata while maintaining relational integrity for core data.

```prisma
model User {
  id              String            @id @default(cuid())
  email           String            @unique
  name            String?
  avatarUrl       String?
  linkedinUrl     String?
  subscription    SubscriptionTier  @default(FREE)
  onboardingComplete Boolean        @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  voiceProfiles   VoiceProfile[]
  generatedPosts  GeneratedPost[]
  calendarEntries CalendarEntry[]
  feedback        Feedback[]
}

model VoiceProfile {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  name            String    @default("Default")
  isActive        Boolean   @default(true)
  toneAttributes  Json      // Structured voice profile (see Section 2)
  vocabularyList  String[]  // Signature phrases and key terms
  avoidList       String[]  // Words/phrases to never use
  samplePosts     String[]  // Raw sample text for few-shot prompting
  systemPrompt    String    // LLM-generated system prompt for this voice
  confidenceScore Float     @default(0.0) // 0-1, increases with more data
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  generatedPosts  GeneratedPost[]
}

model GeneratedPost {
  id              String     @id @default(cuid())
  userId          String
  user            User       @relation(fields: [userId], references: [id])
  voiceProfileId  String
  voiceProfile    VoiceProfile @relation(fields: [voiceProfileId], references: [id])
  promptType      PostType
  userInput       String     // User's original brief/bullet points
  generatedText   String     // AI output
  editedText      String?    // User's final edited version (for learning)
  postFormat      PostFormat @default(TEXT)
  status          PostStatus @default(DRAFT)
  publishedAt     DateTime?
  impressions     Int?
  likes           Int?
  comments        Int?
  modelUsed       String
  tokensUsed      Int
  generationTimeMs Int
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  feedback        Feedback[]
}

model CalendarEntry {
  id              String         @id @default(cuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id])
  postId          String?
  scheduledDate   DateTime
  suggestedTopic  String?
  contentPillar   String?        // Market Intelligence, Deal Storytelling, etc.
  status          CalendarStatus @default(PLANNED)
  createdAt       DateTime       @default(now())
}

model Feedback {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id])
  postId          String
  post            GeneratedPost @relation(fields: [postId], references: [id])
  toneAccuracy    Int          // 1-5 scale
  feedbackType    FeedbackType
  comment         String?
  createdAt       DateTime     @default(now())
}

enum PostType {
  THOUGHT_LEADERSHIP
  DEAL_ANNOUNCEMENT
  MARKET_COMMENTARY
  CASE_STUDY
  PERSONAL_STORY
  INDUSTRY_NEWS
  EDUCATIONAL
  NETWORKING
}

enum PostFormat { TEXT, TEXT_IMAGE, CAROUSEL, POLL, INFOGRAPHIC }
enum PostStatus { DRAFT, SCHEDULED, PUBLISHED, ARCHIVED }
enum CalendarStatus { PLANNED, DRAFT_READY, SCHEDULED, PUBLISHED, SKIPPED }
enum SubscriptionTier { FREE, PRO, TEAM }
enum FeedbackType { SOUNDS_LIKE_ME, TOO_FORMAL, TOO_CASUAL, WRONG_JARGON, TOO_GENERIC, PERFECT }
```

### Authentication between Chrome extension and web app

Use Supabase Auth with a shared OAuth flow. The proven pattern works as follows:

1. User clicks "Login" in the Chrome extension popup.
2. Extension calls `supabase.auth.signInWithOAuth({ provider: "google" })` to generate an auth URL.
3. Background service worker opens a new tab with the Supabase auth URL.
4. User completes OAuth → redirected to the web app with tokens in the URL hash.
5. Background service worker listens via `chrome.tabs.onUpdated`, captures `access_token` and `refresh_token` from the URL.
6. Tokens are stored in `chrome.storage.sync` and used for all subsequent API calls.
7. Both the web app and extension use the same Supabase client with shared tokens.

```typescript
// background.ts - Token capture from OAuth redirect
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.status === "complete" && tab.url) {
    const url = new URL(tab.url);
    if (url.origin === "https://yourapp.com") {
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await chrome.storage.sync.set({ accessToken, refreshToken });
        await chrome.tabs.remove(tabId);
      }
    }
  }
});
```

Add the extension's redirect URL (`https://<extension-id>.chromiumapp.org`) to Supabase's allowed redirect URLs. Use `chrome.storage.sync` for cross-device token persistence.

---

## 2. AI/LLM architecture for tone mimicking (the core moat)

This is the most important section. **Research from 2025 academic papers shows that prompting strategy is the dominant factor in style imitation — more important than the underlying model.** Zero-shot prompting completely fails at style mimicry (<7% accuracy), but few-shot prompting with 2-5 samples can reach 67-99% style verification accuracy.

### The voice profile system

The tone mimicking architecture has two stages: **Voice Extraction** (analyze inputs → structured profile) and **Voice Application** (profile + examples → generation). Store the voice profile as a structured JSON document that captures these dimensions:

```typescript
interface VoiceProfile {
  // Tone dimensions (0.0 to 1.0 scales)
  formality: number;          // 0=very casual, 1=very formal
  humor: number;              // 0=serious, 1=frequent humor
  confidence: number;         // 0=humble/hedging, 1=bold/assertive
  analyticalVsEmotional: number; // 0=data-driven, 1=emotionally expressive
  
  // Structural patterns
  sentenceStyle: {
    avgLength: string;        // "short (5-10 words)" | "medium (10-20)" | "long (20+)"
    variation: string;        // "high" | "medium" | "low"
    usesFragments: boolean;
    questionFrequency: string; // "frequent" | "occasional" | "rare"
  };
  
  // Voice markers
  perspective: string;        // "first-person" | "third-person" | "mixed"
  signaturePhrases: string[]; // ["Here's the thing:", "Let me be real:"]
  avoidPhrases: string[];     // ["synergy", "leverage", "circle back"]
  industryJargon: string[];   // ["cap rate", "EBITDA", "deal flow", "LP/GP"]
  
  // Formatting preferences
  formatting: {
    usesEmojis: boolean;
    emojiFrequency: string;   // "none" | "sparse" | "moderate" | "heavy"
    lineBreakStyle: string;   // "dense paragraphs" | "frequent breaks" | "single-sentence paragraphs"
    usesHashtags: boolean;
    hashtagCount: number;     // 0-5
    usesBoldText: boolean;
    usesLists: boolean;
  };
  
  // Content patterns
  contentPatterns: {
    openingStyle: string;     // "bold statement" | "question" | "personal anecdote" | "data point"
    closingStyle: string;     // "question for audience" | "call to action" | "reflective statement"
    storytellingTendency: string; // "high" | "medium" | "low"
    dataUsage: string;        // "frequent statistics" | "occasional" | "rarely uses data"
  };
  
  // Personality
  personalityTraits: string[]; // ["direct", "empathetic", "self-deprecating", "authoritative"]
  humorStyle: string;          // "dry wit" | "self-deprecating" | "none" | "observational"
  
  // Metadata
  confidenceScore: number;     // 0-1, based on how much training data we have
  lastUpdated: string;
  dataSourceCount: number;     // Number of samples used to build profile
}
```

### Extracting voice from multiple input types

**From onboarding conversation (30% weight):** The onboarding chat itself is a writing sample. Analyze the user's responses for vocabulary level, sentence structure, use of contractions, formality, and emotional tone. Cross-reference stated preferences ("I'm casual") with actual writing behavior in their responses.

**From existing LinkedIn posts (50% weight — highest signal):** Run structural analysis on pasted posts: average post length, paragraph structure, emoji frequency, hashtag patterns, opening hook types, CTA patterns. Then run tone analysis via LLM to classify formality, humor, confidence, and other dimensions. Extract function word frequencies and punctuation patterns (em-dashes, semicolons, ellipses) — these are strong author identifiers per stylometric research.

**From call transcripts (20% weight):** After transcription (via Deepgram or Whisper), extract signature phrases, vocabulary preferences, storytelling patterns, and technical jargon usage. Speaking style reveals personality even though it differs from writing style.

**Combine signals using this fusion approach:**
1. Written samples carry highest weight because they're closest to the output medium.
2. When signals conflict (e.g., user says "casual" but writes formally), prioritize actual writing samples.
3. Generate the initial voice profile via LLM analysis of all inputs combined.
4. Present the profile to the user for validation and adjustment.
5. Track confidence per dimension — flag low-confidence dimensions for user verification.

### The prompt pipeline for content generation

This is the complete generation architecture. **Every generation request follows this exact pipeline:**

```
┌─────────────────────────────────────────────────┐
│  1. USER INPUT                                   │
│     Topic/idea + post type + target audience      │
├─────────────────────────────────────────────────┤
│  2. EXAMPLE RETRIEVAL (RAG via pgvector)         │
│     Vector search user's post corpus              │
│     Select top 3-5 by topic similarity            │
│     Re-rank by diversity + engagement level       │
├─────────────────────────────────────────────────┤
│  3. PROMPT ASSEMBLY                              │
│     System: Role + voice profile + style rules    │
│     Few-shot: 3-5 user's actual posts             │
│     Instruction: Topic + format + constraints     │
├─────────────────────────────────────────────────┤
│  4. GENERATION (Claude Sonnet 4, temp=0.7)       │
│     Generate 2-3 variations                       │
├─────────────────────────────────────────────────┤
│  5. VALIDATION                                   │
│     Style embedding similarity check              │
│     Structural compliance (length, format, emoji) │
├─────────────────────────────────────────────────┤
│  6. PRESENT TO USER                              │
│     LinkedIn post preview + quick action buttons  │
│     Track all edits for voice profile refinement  │
└─────────────────────────────────────────────────┘
```

**System prompt template:**

```
You are a LinkedIn ghostwriter for {user_name}. Your ONLY job is to write posts that sound EXACTLY like {user_name} wrote them personally. Never sound like a generic AI.

## Voice Profile
- Tone: {tone_description}
- Formality: {formality_level}/10
- Perspective: {perspective}
- Sentence style: {sentence_description}
- Signature phrases (USE these naturally): {phrases_list}
- NEVER use: {avoid_list}

## Style Rules
- ALWAYS: {always_rules}
- NEVER: {never_rules}
- Opening style: {opening_preference}
- Closing style: {closing_preference}
- Formatting: {formatting_preferences}

## Examples of {user_name}'s actual writing:

Example 1:
{few_shot_example_1}

Example 2:
{few_shot_example_2}

Example 3:
{few_shot_example_3}

Now write a LinkedIn post about: {topic}
Post type: {post_type}
Target audience: {audience}
Approximate length: {length} characters
Match the voice, tone, and style of the examples above EXACTLY.
Do not add generic LinkedIn platitudes or AI-sounding phrases.
```

### Cold start problem solutions

When a new user has minimal writing samples, use this tiered approach:

- **Tier 1 (zero samples):** Present 4-6 "style archetypes" — "The Storyteller," "The Data Analyst," "The Provocateur," "The Trusted Advisor" — with example outputs for each. User picks closest match. Combine with onboarding conversation analysis.
- **Tier 2 (1-3 samples):** Extract what's possible, fill gaps with archetype defaults, mark dimensions as "low confidence."
- **Tier 3 (5-10 samples):** Full voice profile generation. Use RAG for example selection.
- **Tier 4 (20+ samples):** High-confidence profile with nuanced dimensions. Enable style validation.

**Progressive improvement:** Every post the user edits before publishing becomes training data. Compute diffs between AI output and user's edited version. If users consistently shorten sentences, add emojis, or remove certain phrases, automatically update the voice profile.

### LLM cost analysis

At MVP scale, costs are very manageable:

| Approach | Per-Post Cost | 100 Posts/Month |
|----------|--------------|-----------------|
| Claude Sonnet 4 (primary) | ~$0.02-0.03 | $2-3 |
| Claude Haiku (analysis) | ~$0.005 | $0.50 |
| Gemini 2.5 Flash (budget) | ~$0.003-0.005 | $0.30-0.50 |

**Use prompt caching** — both Anthropic and OpenAI offer it. The system prompt + voice profile is identical for every request per user, qualifying for a **90% discount** on that token portion. At 1,000 active users generating 10 posts/week, total LLM cost is approximately **$30-90/week** depending on model mix.

---

## 3. Chrome extension architecture for LinkedIn integration

### Manifest V3 configuration and WXT setup

WXT is the recommended Chrome extension framework due to active maintenance, Vite-powered builds, built-in Shadow DOM UI creation, and framework-agnostic design. Configure it as follows:

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'LinkedIn Marketing Agent',
    permissions: ['tabs', 'storage', 'activeTab'],
    host_permissions: ['https://www.linkedin.com/*', 'https://yourapp.supabase.co/*'],
  },
});
```

**Critical Manifest V3 constraints:**
- Service workers are ephemeral — store ALL state in `chrome.storage`, never in memory variables.
- No remotely hosted code — all JavaScript must be bundled. LLM calls go through your backend API.
- Content Security Policy is strict — no `eval()` or inline scripts.

### Injecting a sidebar into LinkedIn using Shadow DOM

Shadow DOM isolation is mandatory. LinkedIn has complex, frequently-changing CSS. Without Shadow DOM, LinkedIn's styles will break your UI and vice versa.

```typescript
// entrypoints/linkedin-sidebar.content.tsx
import { createShadowRootUi } from 'wxt/client';

export default defineContentScript({
  matches: ['https://www.linkedin.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = createShadowRootUi(ctx, {
      name: 'linkedin-agent-sidebar',
      position: 'inline',
      anchor: 'body',
      onMount: (container, shadow, host) => {
        host.style.cssText = `
          position: fixed; right: 0; top: 0;
          width: 380px; height: 100vh;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        const root = createRoot(container);
        root.render(<SidebarApp />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
  },
});
```

**Use Tailwind CSS in Shadow DOM** by importing CSS as inline strings (`import styles from './styles.css?inline'`) and converting `rem` units to `px` to avoid dependency on the host page's root font-size. WXT's `cssInjectionMode: 'ui'` handles injection automatically.

### Reading LinkedIn page context safely

Use semantic selectors (ARIA attributes, data attributes, DOM structure) rather than CSS class names, which LinkedIn changes frequently. Use `MutationObserver` to handle LinkedIn's SPA navigation:

```typescript
// Detecting page type
ctx.addEventListener(window, 'wxt:locationchange', (event) => {
  if (event.newUrl.includes('/feed')) handleFeedPage();
  if (event.newUrl.includes('/in/')) handleProfilePage();
});

// Reading profile context (use ARIA/semantic selectors, not class names)
function getProfileInfo() {
  return {
    name: document.querySelector('[data-anonymize="person-name"]')?.textContent?.trim()
      || document.querySelector('.text-heading-xlarge')?.textContent?.trim(),
    headline: document.querySelector('.text-body-medium')?.textContent?.trim(),
  };
}
```

**Abstract all selectors into a single `selectors.ts` file.** When LinkedIn changes their DOM, you update one file. Build graceful degradation: if the content script can't find the composer, fall back to a clipboard-copy workflow instead of crashing.

### Communication architecture between all components

```
Extension Popup ←→ Background Service Worker ←→ Content Script (LinkedIn)
                          ↕
                    Supabase Backend (shared with web app)
                          ↕
                    Web Dashboard (Next.js)
```

- **Content Script → Background:** `chrome.runtime.sendMessage()` for generation requests.
- **Background → External API:** `fetch()` with auth tokens from `chrome.storage.sync`.
- **Popup → Content Script:** `chrome.tabs.sendMessage()` to the active LinkedIn tab.
- **Real-time sync:** Both extension and web app subscribe to Supabase Realtime. Drafts saved in extension appear instantly on the web dashboard calendar.

### LinkedIn Terms of Service compliance strategy

**LinkedIn explicitly prohibits** extensions that scrape data, automate actions, or modify LinkedIn's UI. However, content creation tools like AuthoredUp (4.8 stars, Chrome Web Store "Follows recommended practices" badge) operate successfully by following these rules:

- **Frame as "content creation assistant"** — help users write better, never automate actions.
- **AI generates drafts that users review and manually post.**
- **Read only the user's own content** (what they paste in), never scrape other profiles or the feed.
- **Never automate** sending connections, messages, likes, comments, or posting.
- **Use Shadow DOM** for injected UI to minimize LinkedIn DOM footprint and detection.
- **Only activate when the user explicitly triggers the extension** — no background polling.
- **No LinkedIn page data sent to servers.** Voice analysis uses only user-provided samples.

---

## 4. Conversational onboarding that captures voice

### The 5-8 question interview flow

Design the onboarding as a **Typeform-style one-question-at-a-time chat** that takes 3-5 minutes. Typeform's conversational format achieves **47.3% average completion rate** — more than double industry standard. Every extra minute of onboarding lowers conversion by approximately 3%.

The critical insight is that **the conversation itself is a writing sample**. Analyze the user's free-text responses for vocabulary complexity, sentence structure, formality, and personality markers while they answer questions.

**Recommended question flow:**

1. **Warm welcome:** "Hey! I'm [Agent Name]. I help professionals create LinkedIn content that sounds exactly like them. What should I call you?"
2. **Professional identity:** "Tell me about what you do, [Name]. What's your role and industry?" *(Open-ended — captures natural vocabulary and sentence style.)*
3. **LinkedIn goals:** "What are you hoping to achieve on LinkedIn? Growing your network, establishing thought leadership, generating leads, or something else?"
4. **Target audience:** "Who are you trying to reach? Describe your ideal reader on LinkedIn."
5. **Tone selection (interactive):** "Pick the words that best describe how you want to come across:" [Authoritative / Approachable / Casual / Formal / Witty / Thoughtful / Bold / Warm] — multi-select.
6. **Writing sample (critical):** "Describe your biggest professional win this year in a few sentences. Or paste a LinkedIn post you've written that you really liked." *(This is the primary voice analysis input.)*
7. **Content preferences:** "What types of content do you want to create? Stories, tips, hot takes, case studies, industry analysis?"
8. **Optional existing content:** "Want to paste a URL to your LinkedIn profile or a blog post? I'll analyze your existing style." *(Skip option available.)*

**Design principles:** Use dynamic responses acknowledging what the user said before asking the next question ("Nice — private equity is a great space for thought leadership on LinkedIn."). Show a subtle progress bar, not explicit "Step X of Y." Allow skipping non-essential questions. Use the bot's personality to set expectations for the content it will create.

### Progressive profile building over time

After onboarding, continue learning through:

- **Post-generation feedback:** Thumbs up/down + "What would you change?" on every generated post.
- **Edit tracking:** Compute diffs between AI output and user's edited version. If they consistently make the same changes, auto-update the profile.
- **Periodic voice check-ins** (every 2-4 weeks): "Based on your activity, here's how I understand your voice: [Professional yet approachable, uses storytelling, favors short paragraphs]. Is this right?"
- **A/B comparisons:** "Which version sounds more like you? A or B?" — feeds directly into preference learning.
- **Performance feedback:** "Your post about [topic] got 3x your average engagement. Want me to create more content in this style?"

---

## 5. Chat-based post generation interface

### Layout architecture: left panel chat + right panel preview

Research from UX Collective's 2025 analysis identifies seven AI UI layout patterns. **Pattern #5 — left-panel chat + right-side content workspace — is recommended** for this product. The chat panel handles conversation; the right panel shows a live LinkedIn post preview that updates in real time.

```
┌─────────────────────────────────────────────────────┐
│  TopNav: Logo | Create | Calendar | History | Settings │
├────────────────────┬────────────────────────────────┤
│  Chat Panel (40%)  │  Preview Panel (60%)           │
│                    │                                 │
│  💬 What would you │  ┌─────────────────────────┐   │
│  like to post      │  │ 🔵 John Smith            │   │
│  about today?      │  │ Managing Partner at XYZ  │   │
│                    │  │ 2h • 🌐                  │   │
│  User: I want to   │  │                          │   │
│  share our Q3      │  │ [Generated post text     │   │
│  fund performance  │  │  appears here with live  │   │
│                    │  │  streaming...]            │   │
│  🤖 Here's a       │  │                          │   │
│  draft in your     │  │ 👍 12  💬 3  🔄 1        │   │
│  voice...          │  └─────────────────────────┘   │
│                    │                                 │
│  Quick Actions:    │  [Version A] [B] [C]           │
│  [Shorter] [Casual]│  [📋 Copy] [📅 Schedule] [✏️]  │
│  [Add hook] [CTA]  │  Format: [Text][Carousel][Poll]│
└────────────────────┴────────────────────────────────┘
```

### Iterative refinement flow

Support three levels of refinement, per UX research:

1. **Quick actions** (overall): Buttons below each draft — "Make shorter," "More casual," "Stronger hook," "Add CTA," "More data." These modify the entire post without a new prompt.
2. **Inline editing**: Users can select specific sentences to refine, keeping the rest intact.
3. **Version comparison**: Generate 2-3 variations as swipeable cards with tabs. Allow "I like the opening of A but the ending of B" — merge capability.

### LinkedIn post preview component

Build a `LinkedInPostPreview` component that matches LinkedIn's exact visual design:

```tsx
<LinkedInPostPreview>
  <PostHeader
    avatar={userAvatar}
    name={userName}
    headline={userHeadline}
    timestamp="Just now"
  />
  <PostBody
    text={generatedText}
    truncateAt={210}      // LinkedIn's mobile "see more" threshold
    showSeeMore={true}
  />
  <PostMedia type="carousel" slides={carouselSlides} />
  <PostEngagement likes={0} comments={0} reposts={0} />
  <PostActions />
</LinkedInPostPreview>
```

Always render the preview in "LinkedIn style" (white background) even if the app is in dark mode. Support text, image, carousel (slide navigation), and poll preview modes.

### Recommended component stack

Use **Vercel AI SDK v6 + AI Elements** for the chat interface. This provides 20+ production-ready React components built on shadcn/ui: Message, Conversation, PromptInput, Reasoning, streaming markdown (MessageResponse). Tight integration with the `useChat` hook handles streaming, state management, and tool calls. The shadcn/ui foundation means full customization with no CSS override battles.

---

## 6. LinkedIn content generation best practices

### What the algorithm rewards in 2025

**Average LinkedIn reach is down 34% in 2025** (views down 50%, engagement down 25%). The algorithm now uses a "Nexus" system with consumption rate tracking and expertise-driven ranking. Key algorithm facts the AI agent should encode:

- **First 60 minutes are critical.** Posts with author responses within 30 minutes receive **64% more comments and 2.3× more views.**
- **Document/carousel posts are the #1 format.** They earn 278% more engagement than videos, 303% more than images, 596% more than text-only.
- **Comments over 15 words carry 2.5× more weight** than shorter interactions.
- **3-5 hashtags maximum** — more triggers penalties. LinkedIn now prioritizes keywords over hashtags for SEO.
- **External links reduce reach by ~30%.** Post without link first, add in first comment.
- **Content sequencing** (thematically linked posts in progression) drives **62% more cumulative engagement.**
- **Post length sweet spot: 800-1,000 characters.** Posts over 1,500 characters work for deep thought leadership.

### Post templates the agent should support

**Text-only (thought leadership):**
```
[Bold hook — 1-2 lines, under 140 chars before fold]

[Context/story — 3-5 short paragraphs with line breaks]

[Key insight — numbered list or bullets]

[CTA — question to spark comments]
```

**Carousel (PDF upload — highest engagement format):**
```
Slide 1: Bold hook headline + "Swipe →"
Slides 2-4: Problem/context/journey
Slides 5-7: Solution/framework/data
Slide 8: Key takeaway
Slide 9: CTA ("Comment your biggest challenge")
```

**Case study:**
```
[Hook: The result/metric]
Challenge: → [Pain point]
What we did: → [Strategy 1-3]
Result: → [Metric improvement + business impact]
Key takeaway: [Transferable lesson]
[Question for audience]
```

### Content strategy for PE/real estate audiences

Build five content pillars into the content calendar rotation:

| Pillar | Frequency | Format | Example |
|--------|-----------|--------|---------|
| Market Intelligence | 1×/week | Text or carousel | Industry trends, deal flow data, market analysis |
| Deal Storytelling | 1×/week | Case study, carousel | Portfolio wins, value creation stories |
| Thought Leadership | 1×/week | Text (long-form) | Contrarian views, frameworks |
| Social Proof | 1×/week | Image + text | Team spotlights, LP relationships |
| Educational Value | 1×/week | Carousel, infographic | "How we evaluate deals," checklists |

**Best posting schedule:** Tuesday-Thursday mornings (8-10 AM user's timezone), **3-5 posts per week.** Skip or go light on Monday; only morning posts work on Friday. Personal accounts generate 8× more engagement than company pages.

### Programmatic visual content generation

For carousel PDFs, use **Puppeteer + HTML/CSS templates** as the primary approach:

```javascript
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350 }); // LinkedIn portrait
await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

// Generate individual slide images
await page.screenshot({ path: 'slide.png', type: 'png' });

// Or generate multi-page PDF for carousel
const pdf = await page.pdf({
  width: '1080px', height: '1350px',
  printBackground: true
});
```

Create branded HTML templates for each slide type (title, content, data, CTA). Use **pdf-lib** to merge individual slides into multi-page PDFs. This gives full design control, consistent branding, and zero API costs. For premium features or complex designs, consider **Bannerbear** ($49/mo, 1,000 renders) or **Orshot** ($30/mo, 3,000 renders) — both support multi-page PDF/carousel generation via API.

---

## 7. Content calendar and scheduling system

### LinkedIn API capabilities for posting

The **Posts API** (`POST https://api.linkedin.com/rest/posts`) supports all content types needed:

| Content Type | Supported | Notes |
|-------------|-----------|-------|
| Text only | ✅ | Max 3,000 characters |
| Single image | ✅ | Upload via Images API first |
| Document/carousel PDF | ✅ | Upload via Documents API first |
| Video | ✅ | Upload via Videos API first |
| Multi-image | ✅ | Organic only |
| Poll | ✅ | Organic only |

**Authentication:** OAuth 2.0 three-legged flow. Required scopes: `w_member_social` (post as member). Requires a LinkedIn Developer App with company page verification. Access tokens expire and need refresh token flow.

**Carousel posting flow:** Upload PDF via Documents API → receive Document URN → create post via Posts API with document reference → appears as swipeable carousel in feed.

### Fallback when API access is limited

For V1, implement a **copy-to-clipboard workflow** as the primary posting method:

1. AI generates post text + visual assets.
2. "Copy to clipboard" button copies formatted text.
3. "Download carousel PDF" button for document posts.
4. Deep link opens LinkedIn's post composer.
5. User pastes and uploads — approximately 30 seconds to post.

Build LinkedIn API direct posting as a V2 feature once the OAuth partner application is approved.

### Calendar UI implementation

Build the calendar with these essential components:

- **Monthly/weekly grid view** showing scheduled posts with thumbnails, post type icons, and status indicators (draft/scheduled/published).
- **Drag-and-drop rescheduling** between days and time slots.
- **Content queue** sidebar: unscheduled drafts draggable onto calendar.
- **Color coding by content pillar** to visualize distribution balance.
- **Performance overlay:** Engagement metrics shown on published post cards.
- **AI topic suggestions:** Weekly batch of 5-10 suggested topics with draft hooks, recommended format, and content pillar classification.

### Optimal posting time suggestion system

Start with defaults (Tuesday-Thursday, 8-10 AM in user's timezone). After 20+ published posts, analyze which days and times produce the best engagement for that specific account. Surface recommendations in the calendar: "Based on your audience, Wednesday at 9:15 AM gets 40% more engagement than your current Thursday slot."

---

## 8. Competitive landscape and positioning

### The market gap this product fills

The LinkedIn marketing tool market has **no clear leader** despite dozens of products. This fragmentation exists because every tool does 1-2 things well but none does everything. The core pain points across all competitors are:

- **AI content sounds generic and robotic** — users spend significant time editing.
- **Account safety fears** — many tools risk LinkedIn suspension through automation.
- **No true voice learning** — "Brand Voice" features are superficial (paste text, get a description).
- **Tool fragmentation** — users cobble together 2-3+ tools ($50-200+/month combined).
- **No strategic guidance** — tools generate posts but don't advise on content strategy.
- **No vertical specialization** — every tool targets "everyone on LinkedIn."

### Pricing comparison across the landscape

| Tool | Entry Price | Mid Tier | Key Strength |
|------|-----------|----------|-------------|
| Taplio | $39/mo | $65/mo | Most comprehensive all-in-one, viral post library |
| AuthoredUp | $19.95/mo | — | Best text editor, GDPR compliant |
| Supergrow | $19/mo | $39/mo | Best value, voice mimicking attempt |
| MarketOwl | $39/mo | $329/mo | Fully autonomous publishing |
| Yooz.ai | Free | Emerging paid | LinkedIn API compliant, chat interface |
| Jasper AI | $49/mo | $59/mo | Strongest brand voice engine |
| Buffer | Free | $6/channel/mo | Simplest scheduling |
| Hootsuite | $99/mo | $249/mo | Enterprise analytics |

### Recommended positioning and pricing

**Position as:** "The AI Marketing Partner for capital raisers" — not another post generator, but a strategist that understands PE, real estate, and investor acquisition. The tagline framework: "Other tools ask what you want to write. We ask who you are."

**Pricing recommendation:**

- **Free:** 3-5 AI-generated posts/month, basic scheduling, conversational onboarding (captures voice data from free users too).
- **Pro ($49-79/mo):** Unlimited posts, carousel generation, content calendar, analytics, advanced voice training.
- **Team ($99-199/mo per seat):** Multiple voice profiles, approval workflows, firm-wide calendar, team collaboration.

PE/real estate professionals have higher willingness to pay than typical solopreneurs. Frame pricing around ROI: "$79/month to generate qualified investor conversations" resonates better than feature-based pricing.

### Growth loops

- **"Created with [ProductName]"** watermark on carousel footers (removable on paid plans). This is a proven growth loop used by Canva, Notion, and Calendly.
- **Free "PE LinkedIn Scorecard"** tool that scores any firm's LinkedIn presence → leads to product signup.
- **Referral program:** "Give 1 month free, get 1 month free."
- **Content sharing within firms** creates multi-seat adoption (managing partner → associates).

---

## 9. MVP scope and phased build plan

### V1 (Weeks 1-10): minimum viable tone-mimicking product

**What's in V1:**
- Conversational onboarding (5-8 questions) that builds initial voice profile.
- Paste-your-posts import (3+ samples minimum) for voice analysis.
- Chat-based post generation with 2-3 draft variations in user's voice.
- LinkedIn post preview component (text format).
- Basic content calendar (list/grid view, no drag-and-drop).
- Chrome extension with sidebar for quick generation + clipboard copy.
- Post history with feedback collection (thumbs up/down, tone accuracy rating).
- Authentication (Google OAuth via Supabase, shared between extension and web app).
- Free tier with 5 posts/month limit.

**What's intentionally manual in V1:**
- Posting is copy-to-clipboard, not API-automated.
- Voice profile curation requires some user adjustment.
- No visual content generation (text posts only).
- No analytics beyond basic post history.

### V2 (Months 4-7): feedback-driven iteration

- Automated voice learning from edit tracking and feedback signals.
- LinkedIn API posting (OAuth direct publish).
- Carousel/image generation via Puppeteer + HTML templates.
- Content calendar with drag-and-drop and AI topic suggestions.
- Basic analytics (engagement tracking for published posts).
- Chrome extension inline suggestions while browsing feed.
- Progressive voice profile refinement with periodic check-ins.

### V3 (Months 8-14): full vision

- Multi-platform support (Twitter/X, newsletter drafts).
- Team/agency features with multiple voice profiles and approval workflows.
- Advanced analytics with ROI tracking (profile views → connections → conversations).
- AI comment management (reply suggestions).
- CRM integration (HubSpot/Salesforce pipeline connection).
- Industry module expansion beyond real estate/PE.

### Build timeline for a 2-developer team

| Phase | Duration | Focus |
|-------|---------|-------|
| Foundation | Weeks 1-3 | Monorepo setup, auth, database, basic web shell |
| AI Engine | Weeks 3-5 | Voice analysis, prompt pipeline, generation service |
| Web Dashboard | Weeks 5-7 | Onboarding flow, chat creation UI, post preview, calendar |
| Chrome Extension | Weeks 7-9 | Sidebar injection, composer integration, extension ↔ API |
| Polish & Launch | Weeks 9-10 | Testing, Chrome Web Store submission, landing page |

**Key risk: prompt engineering for tone accuracy will require iteration.** Budget extra time in weeks 3-5. The voice profile quality determines everything — it's the core differentiator.

### Using Claude Code effectively during development

Create a `CLAUDE.md` file at the repo root containing: tech stack decisions, folder structure, naming conventions, testing approach, style rules, and "do not touch" zones. This dramatically improves output quality.

- **Use for:** Monorepo scaffolding, Prisma schema generation, tRPC boilerplate, component templates, test files, prompt template iteration. Saves 40-60% time on these tasks.
- **One objective per session:** "Add the voice profile creation tRPC router with Zod validation" — not "Build the whole voice feature."
- **Always review output.** AI-generated code without review creates tech debt.
- **Weakest at:** Novel architecture decisions, complex state management, nuanced UX flows. Handle these yourself.

---

## 10. Testing and risk mitigation

### Testing AI content quality

Build an automated evaluation pipeline that runs every generated post through a separate LLM call scoring it against the voice profile. Track these metrics:

- **Tone accuracy score:** Average from in-app user feedback (target: 3.5+/5).
- **Edit distance:** How much users modify generated text before publishing. Less editing = better voice match.
- **Generation-to-publish ratio:** What percentage of generated posts do users actually post?
- **Style embedding similarity:** Cosine distance between generated text embedding and centroid of user's corpus.

### Chrome extension testing with Playwright

```typescript
// Load extension for E2E testing
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});
```

**Mock LinkedIn DOM:** Create saved snapshots of LinkedIn page HTML as test fixtures. Test selector resilience — verify that selectors use stable attributes (ARIA roles, semantic HTML) rather than class names. Use visual regression testing with Playwright screenshots to detect when overlays break.

### Critical technical risks and mitigations

**LinkedIn DOM changes (HIGH probability):** Abstract all selectors into a single `selectors.ts` file. Build automated daily monitoring that verifies key LinkedIn elements exist. Implement graceful degradation to clipboard-copy workflow when DOM detection fails.

**LinkedIn API access limitations (HIGH probability):** V1 deliberately avoids the LinkedIn API entirely. The extension is a UI overlay and writing assistant, not an automation tool. Build clipboard-copy as the primary workflow; add API posting in V2 only after partner approval.

**LLM costs scaling (MEDIUM probability):** Use tiered model routing — cheap models for drafts, expensive models for final polish. Implement prompt caching (90% discount on repeated system prompts). Rate limit free tier to 5 posts/week.

**Chrome Web Store rejection (MEDIUM probability):** Request minimal permissions (`activeTab`, `storage` only). Frame clearly as "AI writing assistant," not "LinkedIn automation." Include explicit privacy policy. Plan for 1-2 rejection rounds with 1-2 week buffer.

**Tone accuracy cold start (HIGH probability):** Require minimum 3-5 writing samples. Provide industry-specific base voice templates ("PE Partner," "Real Estate Developer"). Set expectations explicitly: "Your voice profile improves with every post you rate."

### Early user feedback strategy

Run a closed beta with 10-20 PE/real estate professionals recruited directly from LinkedIn (eat your own dog food). Onboard in cohorts of 5 with 15-minute voice profile setup calls. Weekly 15-minute feedback calls for the first 4 weeks. Dedicated Slack channel for beta testers. **Track return rate within 7 days as the single most important metric** — it indicates whether the voice matching is good enough to bring users back.

---

## Conclusion: what makes this product win

The LinkedIn marketing tool market is fragmented because no product has solved the core problem: **making AI-generated content sound authentically like a specific person, not like AI.** Every competitor either produces generic content (Taplio, Supergrow) or offers shallow "brand voice" features that analyze text samples without truly understanding the person behind them (Jasper).

This product's moat is the **conversational approach to voice capture.** Rather than passive text analysis, a guided interview understands how the user thinks, their communication preferences, values, humor, and industry expertise. Combined with few-shot prompting using RAG-selected examples and continuous learning from edit tracking, this creates a compounding advantage — every interaction makes the voice profile more accurate.

The vertical focus on PE, real estate, and capital raisers creates a second moat: **industry-specific content intelligence** that horizontal tools cannot match. Pre-built content pillars (market intelligence, deal storytelling, thought leadership), specialized terminology handling, and awareness of fundraising cycles make the output immediately more useful than generic LinkedIn content tools.

The technical architecture — WXT Chrome extension with Shadow DOM injection, Next.js web dashboard, Supabase backend with pgvector for style embeddings, Claude Sonnet for generation — is designed for a 10-week MVP build with a 2-person team. The safety-first approach (no LinkedIn automation, API-compliant, clipboard-copy workflow) eliminates the account safety fears that plague competitors like Taplio and Dux-Soup.

Build the voice profile system first. Everything else is secondary.