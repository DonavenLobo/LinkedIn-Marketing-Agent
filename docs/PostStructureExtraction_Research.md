# Post Structure Extraction: Implementation Blueprint for the LinkedIn Marketing Agent

**How to let users borrow post strategies from influencers while keeping their own authentic voice — a complete technical, UX, and prompt engineering guide.**

---

## The core concept and why it matters

Your product already solves the hardest problem in AI-generated LinkedIn content: making it sound like the user, not like a chatbot. The voice profile system — conversational onboarding, dual-signal extraction, progressive learning through edit tracking — gives you a genuine moat. But voice alone isn't enough. Users also need *structural strategy*: the narrative architecture that makes a post compelling, the pacing that creates tension and resolution, the hook-to-CTA arc that drives engagement.

The insight behind this feature is that **voice and structure are separable**. A post's structure is its skeleton — the sequence of rhetorical moves (hook → pain points → pivot → solution → reframe → CTA). Voice is the flesh — vocabulary, cadence, formality, humor, jargon. You can lift the skeleton from a Justin Welsh post and dress it in a PE managing partner's voice, and the result will read authentically because the *identity markers* come from the user while the *persuasive architecture* comes from the proven template.

This separation is well-supported by how LLMs process style. Research consistently shows that when given explicit structural instructions alongside few-shot voice examples, models can follow a structural blueprint while maintaining tonal consistency with the examples. The key is giving the model clear, independent signals for each dimension rather than muddling them together.

**No major LinkedIn tool currently does this well.** Taplio offers a viral post database for "inspiration" and can generate posts that mimic a creator's tone *and* topics — but it doesn't cleanly separate structure from voice. AuthoredUp provides 200+ hook/CTA templates, but these are isolated fragments, not full narrative architectures. Letterdrop comes closest with "customizable post templates from your team or industry leaders," but the templates are pre-built by Letterdrop, not extracted dynamically from posts the user selects. The feature you're building occupies a genuinely open space.

---

## What "post structure" actually means — a decomposition framework

Before you can extract structure from a post, you need a clear ontology of what constitutes "structure" versus "voice." This framework drives both the extraction prompt and the database schema.

### Structural elements (what to extract)

**1. Narrative arc type** — The macro-level rhetorical pattern:
- Problem → Agitate → Solve (PAS)
- Contrarian hook → Evidence → Reframe
- Story → Lesson → Application
- Data shock → Context → Insight → Action
- Listicle → Framework → CTA
- Before/After → Transformation → How
- Question → Exploration → Answer

**2. Hook strategy** — How the post opens (first 1-2 lines before the "see more" fold):
- Alarming statistic ("265,000 tech workers were laid off in 2025")
- Contrarian statement ("The best engineers don't write the most code")
- Personal vulnerability ("I got fired. Best thing that ever happened.")
- Direct address question ("Have you noticed how quiet LinkedIn gets in December?")
- Bold prediction ("In 3 years, 80% of junior dev roles won't exist")

**3. Pacing and rhythm** — Sentence-level cadence patterns:
- Short-burst staccato (1-5 word sentences creating urgency)
- Flowing narrative paragraphs
- Mixed: short punchy opener → longer context → short punchy close
- List-embedded (prose with strategic bullet-point insertions)

**4. Transition mechanics** — How the post pivots between sections:
- Explicit pivots ("At the same time:", "Here's the disconnect", "But here's the thing")
- White-space pivots (new section implied by line breaks)
- Question pivots ("So what does this actually mean?")
- Contrast pivots ("On one hand... On the other...")

**5. Evidence/support pattern** — How claims are substantiated:
- Statistics-led (data first, interpretation second)
- Anecdote-led (story first, data supports)
- Authority-led (expert/company names as proof)
- Framework-led (original framework or mental model)
- Bullet-point breakdown

**6. Closing strategy** — How the post ends:
- Audience question ("What's your experience with this?")
- Empowering reframe ("If you can do that? You're exactly who companies are searching for.")
- Action-oriented CTA ("DM me 'playbook' for the full framework")
- Reflective statement ("The future isn't about X. It's about Y.")
- Community prompt ("Tag someone who needs to hear this")

**7. Formatting pattern** — Visual structure choices:
- Line break frequency (every sentence, every 2-3 sentences, paragraph-style)
- Bullet/numbered list placement and density
- Emoji usage and placement
- Bold text usage
- Length (short: <500 chars, medium: 500-1000, long: 1000+)

### Voice elements (what NOT to extract — these come from the user's profile)

- Vocabulary and word choice
- Formality level
- Humor style
- Industry jargon
- Signature phrases
- Pronoun patterns
- Sentence complexity
- Personality and attitude

This distinction is critical for your extraction prompt. The model needs to be explicitly told to capture the structural elements and discard the voice elements.

---

## The extraction prompt — separating skeleton from flesh

This is the most technically important piece. You need a prompt that, given 1-5 LinkedIn posts, reliably extracts the structural pattern as a reusable template while explicitly stripping out the original author's voice characteristics.

### Structure extraction prompt

```
You are a LinkedIn content strategist who specializes in analyzing post 
architecture. Your job is to extract the STRUCTURAL SKELETON of LinkedIn 
posts — the narrative framework, rhetorical moves, and formatting patterns 
— while completely ignoring the author's voice, tone, vocabulary, and 
personality.

Think of it like this: you're creating an architectural blueprint of a 
house. The blueprint shows the room layout, flow, and structure. It says 
nothing about the furniture, paint colors, or decorations. Those will be 
chosen by someone else.

## ANALYZE THESE POSTS:

<posts>
{user_selected_posts}
</posts>

## EXTRACTION INSTRUCTIONS:

For each post, then synthesized across all posts, extract:

### Step 1: Identify the Narrative Arc
What is the macro-level rhetorical pattern? Describe it as a sequence 
of moves, e.g.:
"Alarming statistic → Emotional pain points (staccato) → Contrasting 
positive data (pivot) → Identify the gap → Introduce solution → 
Specific details (bullets) → Empowering reframe → Direct close"

### Step 2: Analyze the Hook Strategy  
How does the post open? What makes it stop the scroll? Describe the 
TYPE of hook, not the specific content. 
e.g., "Opens with a specific, large number tied to a negative trend" 
NOT "Opens with 265,000 tech workers laid off"

### Step 3: Map the Pacing Pattern
How do sentence lengths vary across the post? Where does it use 
short punchy lines vs. longer explanatory sentences? Describe the 
rhythm, not the words.

### Step 4: Catalog Transition Techniques
How does the post move between sections? What pivot phrases or 
structural devices create turns in the narrative?
Use GENERIC descriptions: "explicit contrast pivot" not "At the same time:"

### Step 5: Identify the Evidence Pattern
How does the post support its claims? Data, stories, frameworks, 
authority, lists?

### Step 6: Analyze the Closing Strategy
How does the post end? What action or emotion does it leave the 
reader with?

### Step 7: Note Formatting Patterns
Line break frequency, bullet usage, length, visual structure.

## OUTPUT FORMAT:

Return a JSON object with this structure:

{
  "narrative_arc": {
    "type": "string — named pattern (e.g., 'Shock-and-Reframe', 'Problem-Agitate-Solve')",
    "sequence": ["array of rhetorical moves in order"],
    "description": "2-3 sentence plain-English description of the arc"
  },
  "hook": {
    "type": "string — category of hook",
    "technique": "string — what makes it effective, generically described",
    "length_guideline": "string — approximate character count or sentence count"
  },
  "pacing": {
    "pattern": "string — description of rhythm pattern",
    "sentence_length_map": ["short", "short", "short", "medium", "long", "short"],
    "staccato_sections": "string — where short punchy lines cluster",
    "breathing_room": "string — where longer sentences provide context"
  },
  "transitions": [
    {
      "position": "string — where in the arc this transition occurs",
      "type": "string — contrast/question/declaration/whitespace",
      "function": "string — what this transition accomplishes"
    }
  ],
  "evidence_pattern": {
    "primary_type": "string",
    "placement": "string — where in the arc evidence appears",
    "density": "string — how much evidence vs. assertion"
  },
  "closing": {
    "type": "string — category of close",
    "technique": "string — what makes it effective",
    "emotional_target": "string — what feeling the reader should leave with"
  },
  "formatting": {
    "line_break_frequency": "string",
    "uses_bullets": "boolean",
    "bullet_placement": "string — where in the arc bullets appear (if used)",
    "approx_length": "string — short/medium/long with character range",
    "uses_emoji": "boolean",
    "uses_bold": "boolean"
  },
  "reusable_template": "string — A complete structural template with 
    [PLACEHOLDER] markers that any topic could be inserted into. 
    Each placeholder describes what TYPE of content goes there, not 
    what specific content. Example: '[ALARMING STATISTIC about the 
    industry problem]\\n[EMOTIONAL CONSEQUENCE — short, punchy]\\n
    [SECOND CONSEQUENCE]\\n...'"
}

## CRITICAL RULES:
- NEVER include any of the original post's actual words, phrases, or 
  specific content in the template
- Describe structure in GENERIC terms that could apply to any industry 
  or topic
- The reusable_template should use [BRACKETED PLACEHOLDERS] that 
  describe the TYPE of content, not examples
- If analyzing multiple posts, synthesize the COMMON structural 
  patterns across them, noting where they diverge
```

### Why this prompt design works

The metaphor of "architectural blueprint vs. furniture" at the top is deliberate — it primes the model to separate concerns. The step-by-step analysis forces systematic extraction rather than surface-level pattern matching. The explicit "CRITICAL RULES" section prevents the most common failure mode: the model reproducing the original content instead of abstracting the structure. The JSON output format ensures the result can be stored and reused programmatically.

When multiple posts are provided (the 1-5 range), the prompt synthesizes commonalities. If a user selects 3 posts from the same creator, the extraction becomes more reliable because patterns reinforce each other. If they select posts from different creators, the system can identify which structural elements are shared versus unique, letting the user choose.

---

## The generation prompt — applying structure to voice

Once you have the extracted structure and the user's voice profile, the generation prompt merges them. This is the second critical prompt in the pipeline.

```
You are a LinkedIn ghostwriter for {user_name}. Your ONLY job is to 
write posts that sound EXACTLY like {user_name} wrote them personally.

## VOICE PROFILE (follow this for HOW the post sounds):
{voice_profile_json}

## EXAMPLES OF {user_name}'s ACTUAL WRITING (match this voice):
{few_shot_examples}

## POST STRUCTURE TO FOLLOW (follow this for HOW the post is organized):
{extracted_structure_json}

## REUSABLE TEMPLATE:
{reusable_template_with_placeholders}

## TOPIC AND CONTEXT:
{user_topic_and_context}

## INSTRUCTIONS:
Write a LinkedIn post about the topic above that:
1. FOLLOWS the structural template exactly — same narrative arc, 
   same pacing pattern, same transition types, same hook type, 
   same closing strategy
2. SOUNDS like the voice profile and writing examples — same 
   vocabulary level, formality, humor style, sentence complexity, 
   signature phrases, industry jargon
3. Uses the user's ACTUAL industry knowledge and terminology, not 
   the original post's industry references
4. Fills every [PLACEHOLDER] in the template with content relevant 
   to the user's topic and industry

The structure is the SKELETON. The voice is the FLESH. The topic is 
the SUBJECT MATTER. Keep all three clearly separated in your mind.

Do NOT:
- Use any words, phrases, or specific examples from the original 
  post(s) the structure was extracted from
- Sound like a generic AI
- Add LinkedIn platitudes or filler phrases
- Deviate from the structural template's narrative arc

Generate {variation_count} variations.
```

### The key architectural insight

Notice how the generation prompt receives three completely independent inputs: voice profile + few-shot examples (from the user's data), structural template (from the extracted structure), and topic context (from the current request). This separation is what makes the system work. The model doesn't need to untangle voice from structure — you've already done that in the extraction step.

---

## Smart context gathering — knowing when to write vs. when to ask

This is one of the most important UX decisions in the feature. When a user provides their topic, the system needs to decide: "Do I have enough context to write this post now, or do I need to ask follow-up questions first?"

### The context sufficiency algorithm

Build a scoring system that evaluates the user's topic input against the structural template's requirements:

```typescript
interface ContextSufficiencyCheck {
  // What the structural template needs
  templateRequirements: {
    needsStatistic: boolean;       // Template has [ALARMING STATISTIC] placeholder
    needsStory: boolean;           // Template has [PERSONAL ANECDOTE] placeholder
    needsSpecificExamples: boolean; // Template has [SPECIFIC EXAMPLES] or [BULLET DETAILS]
    needsContrastingData: boolean;  // Template has [CONTRASTING DATA POINT]
    needsExpertise: boolean;        // Template has [SPECIFIC INSIGHT] or [FRAMEWORK]
    needsAudienceTarget: boolean;   // Template has [WHO THIS IS FOR]
  };
  
  // What the user provided
  userContextSignals: {
    hasSpecificNumbers: boolean;    // User mentioned statistics or data
    hasPersonalExperience: boolean; // User referenced their own story
    hasSpecificExamples: boolean;   // User provided concrete examples
    hasTargetAudience: boolean;     // User mentioned who the post is for
    hasClearStance: boolean;        // User has a clear opinion or angle
    topicDepth: 'shallow' | 'moderate' | 'deep';
    wordCount: number;
  };
}
```

### Decision logic

Rather than building this as a rigid rule engine, use the LLM itself to make the sufficiency assessment. This is more robust and handles edge cases naturally:

```
You are a content strategist evaluating whether you have enough 
context to write a LinkedIn post.

The user wants to write about: "{user_topic_input}"

The post will follow this structural template:
{reusable_template}

The template requires these types of content:
{template_requirements_summary}

ASSESS whether the user has provided enough specific information to 
fill every [PLACEHOLDER] in the template with compelling, specific 
content (not vague generalities).

If YES — you have enough context:
Return: { "ready": true, "confidence": "high" }

If PARTIALLY — you have most of what you need but some gaps:
Return: { 
  "ready": false, 
  "confidence": "medium",
  "missing": ["array of what's missing"],
  "questions": ["1-3 targeted follow-up questions to fill gaps"]
}

If NO — the topic is too vague to fill the template:
Return: { 
  "ready": false, 
  "confidence": "low",
  "missing": ["array of what's missing"],
  "questions": ["2-4 follow-up questions, starting with the most critical"]
}

RULES FOR FOLLOW-UP QUESTIONS:
- Ask the MINIMUM number of questions needed. Fewer is better.
- Each question should unlock a specific section of the template.
- Questions should be conversational, not interrogative.
- Frame questions to elicit specific details, not general opinions.
- Never ask more than 4 questions total.

GOOD question: "What specific metric or trend sparked this idea? 
A concrete number makes the hook land."
BAD question: "Can you tell me more about your topic?"

GOOD question: "What's the one thing most people get wrong about 
this? That becomes your contrarian angle."
BAD question: "What's your opinion on this subject?"
```

### The UX flow for context gathering

When the system determines follow-up questions are needed, present them as a natural chat continuation — not a form. The chat-based interface you've already designed for post generation is perfect for this. The interaction should feel like a creative collaborator probing for the good stuff, not a survey.

**Example flow:**

> **User:** "I want to write about how LP due diligence is changing in the current market"
> 
> **Agent:** "Great topic — I can work with the structure you selected. A couple quick things to make this really land:"
> 
> "What specific change are you seeing? Like a data point or trend that would make someone stop scrolling — 'the average DD process now takes X months' or 'Y% of LPs are now requiring Z.'"
> 
> "And what's your take on it — is this a good thing, a problem, or a misunderstood opportunity? Your angle is what separates this from a generic industry post."

This is 2 focused questions, not 5. The user responds with specifics, and the system generates immediately. If the user's initial input was already rich ("I want to write about how LP due diligence has shifted from 45-day cycles to 90+ days in 2025, and why GPs who adapt their data rooms early are winning allocations"), the system should recognize this has enough detail and generate without follow-up questions.

---

## Database schema additions

Add these models to your existing Prisma schema to support post structures:

```prisma
model PostStructure {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  name              String    // User-given name: "Justin Welsh Style", "Data Shock Format"
  sourcePostTexts   String[]  // Raw text of the 1-5 source posts (for re-analysis)
  sourcePostMeta    Json?     // Optional: { author, url, engagement_count, date_saved }
  
  // Extracted structure (the core data)
  narrativeArc      Json      // { type, sequence[], description }
  hookStrategy      Json      // { type, technique, length_guideline }
  pacingPattern     Json      // { pattern, sentence_length_map[], ... }
  transitions       Json      // [{ position, type, function }]
  evidencePattern   Json      // { primary_type, placement, density }
  closingStrategy   Json      // { type, technique, emotional_target }
  formattingRules   Json      // { line_break_frequency, uses_bullets, ... }
  reusableTemplate  String    // The [PLACEHOLDER]-based template string
  
  // Metadata
  isDefault         Boolean   @default(false) // System-provided templates
  usageCount        Int       @default(0)     // How many times used for generation
  lastUsedAt        DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  generatedPosts    GeneratedPost[]
}
```

Update `GeneratedPost` to reference the structure used:

```prisma
model GeneratedPost {
  // ... existing fields ...
  structureId     String?
  structure       PostStructure? @relation(fields: [structureId], references: [id])
}
```

### Why store both the structured JSON and the raw template string

The structured JSON fields (`narrativeArc`, `hookStrategy`, etc.) enable querying, filtering, and displaying structure details in the UI — "Show me all my structures that use a data-shock hook." The `reusableTemplate` string is what actually gets passed to the generation prompt. Both are generated from the same extraction, but serve different purposes.

### Seed data: pre-built structure templates

For cold-start users who haven't saved any structures yet, provide 5-8 pre-built templates based on the most effective LinkedIn post patterns. These act as "starter structures" that demonstrate the feature and provide immediate value:

- **"The Data Shock"** — Alarming statistic → emotional impact → contrasting data → insight → action
- **"The Story Arc"** — Personal hook → context/struggle → turning point → lesson → audience question
- **"The Contrarian Take"** — Conventional wisdom → why it's wrong → evidence → new framework → CTA
- **"The Tactical Breakdown"** — Bold claim → numbered steps/bullets → proof point → implementation nudge
- **"The Before/After"** — Past state → transformation trigger → current state → how → invitation

---

## The complete user flow — end-to-end experience

### Entry point 1: The web dashboard "Create Post" flow

This integrates into your existing left-panel chat + right-panel preview layout.

**Step 1 — Choose your approach.** When the user clicks "Create Post," the chat opens with:

> "What would you like to post about today? You can:"
> - Just tell me your topic (I'll write it in your voice)
> - **Use a post structure** (write in your voice, following a proven format)

If they choose "Use a post structure," the UI transitions to a structure selection panel.

**Step 2 — Select or create a structure.** Show a tabbed interface:

- **"My Structures"** tab — Saved structures the user has created (empty for new users)
- **"Starter Templates"** tab — Your 5-8 pre-built templates with preview cards showing the structure name, narrative arc type, and a brief description
- **"+ Create New"** button — Opens the structure creation flow

Each saved structure card shows: the structure name, a visual mini-diagram of the narrative arc (hook → pain → pivot → insight → close, shown as connected nodes), and a "Last used" timestamp.

**Step 3 — Create a new structure (if needed).** When the user clicks "+ Create New":

> "Paste 1-5 LinkedIn posts whose *structure* you want to borrow. I'll extract the framework and strip out the original voice — then apply YOUR voice to it."
> 
> [Large text area with placeholder: "Paste a LinkedIn post here..."]
> [+ Add another post] (up to 5)

Below the text area, add a helper note: *"Tip: Posts from the same creator work best. I'll find the common patterns across them."*

**Step 4 — Name the structure.** After the user pastes posts and clicks "Extract Structure":

> "Got it. Here's what I pulled from those posts:"
> 
> [Structure summary card showing: narrative arc type, hook type, pacing style, closing type, approximate length]
> 
> "Give this structure a name so you can reuse it:"
> [Input field with smart suggestion: "Data Shock + Reframe"]

**Step 5 — Write the post.** Now back in the main chat flow:

> "Now tell me what you want to write about using this structure. The more specific you are — a stat, a story, a strong opinion — the better the first draft will be."

The system runs the context sufficiency check. If sufficient → generates immediately (2-3 variations). If not → asks 1-3 targeted follow-up questions, then generates.

**Step 6 — Preview and refine.** Standard flow from your existing spec: LinkedIn post preview on the right panel, quick action buttons (shorter, more casual, stronger hook), inline editing, version comparison.

### Entry point 2: The Chrome extension "Save Structure" flow

This is where the magic happens for discoverability. While browsing LinkedIn, the user sees a post whose structure they admire.

**On any LinkedIn post**, the extension sidebar adds a subtle button: **"📐 Save Structure"** (appears alongside your existing extension controls).

Clicking it:
1. The extension content script extracts the post text from the DOM (using your existing safe-reading selectors).
2. Shows a confirmation in the sidebar: "Save this post's structure? I'll extract the framework for you to reuse."
3. User confirms → post text is sent to the backend → structure is extracted and saved.
4. User sees: "Structure saved as 'Untitled Structure.' [Rename] [Use now]"

**"Use now"** opens the sidebar's quick-generation flow with the structure pre-selected, letting the user type a topic and generate immediately from LinkedIn.

**Browsing accumulation:** Over time, users build a personal library of structures from posts they encounter organically. This is far more intuitive than asking users to go find posts to paste — they're already scrolling LinkedIn. The extension just makes it one click to save a structure.

### Entry point 3: The dashboard "Structure Library" page

Add a dedicated page at `/structures` (or a tab within `/settings`) that shows all saved structures in a gallery view. Each card shows:

- Structure name
- Visual narrative arc diagram
- Source posts count (e.g., "Based on 3 posts")
- Usage count (e.g., "Used 7 times")
- Last used date
- Quick actions: [Use] [Edit name] [Delete] [View source posts]

This becomes more valuable over time as users accumulate a library of proven structures they've curated from their LinkedIn feed.

---

## UX design principles — making it dead simple

### Principle 1: Make the happy path one click

Most users should be able to: select a saved structure → type their topic → get a draft. Three interactions, under 60 seconds. The structure creation step happens once; usage happens repeatedly.

### Principle 2: Progressive disclosure

Don't show the full structural JSON to users. Surface it as: "Data Shock + Reframe — starts with an alarming stat, builds tension with short lines, pivots to opportunity, closes with empowerment." That's all they need to know. Advanced users can click "View full structure" to see the breakdown.

### Principle 3: Smart defaults over blank canvases

When a new user has no saved structures, don't show an empty library. Show the 5-8 starter templates prominently with a message: "Start with one of these proven formats, or save your own from posts you see on LinkedIn."

### Principle 4: Don't gate the feature behind structure selection

Users should always be able to just type a topic and get a post generated in their voice without choosing a structure. Structure selection is an *enhancement*, not a requirement. The default flow (no structure selected) uses the system's best judgment about post format, as your existing spec describes.

### Principle 5: Chrome extension as the primary collection mechanism

Asking users to "go find posts to paste" is high-friction. Seeing a great post while browsing and hitting one button to save its structure is low-friction. Design the feature so the Chrome extension is the primary way users discover and save structures, while the dashboard paste-and-extract flow is the fallback for posts they've bookmarked elsewhere.

---

## Technical implementation within your existing architecture

### Where it fits in the monorepo

```
packages/
  ai/
    src/
      structure-extractor.ts    # NEW: Extraction prompt pipeline
      prompt-builder.ts         # MODIFY: Add structure-aware prompt assembly
      content-generator.ts      # MODIFY: Accept optional structure parameter
      context-checker.ts        # NEW: Context sufficiency evaluation
  shared/
    src/
      types/
        post-structure.ts       # NEW: TypeScript types for PostStructure
      schemas/
        post-structure.ts       # NEW: Zod schemas for validation
apps/
  web/
    src/app/(dashboard)/
      structures/               # NEW: Structure library page
      create/                   # MODIFY: Add structure selection to creation flow
  extension/
    entrypoints/
      linkedin-sidebar.content.tsx  # MODIFY: Add "Save Structure" button
```

### API additions (tRPC)

```typescript
// New tRPC router: structureRouter
export const structureRouter = router({
  // Extract structure from pasted posts
  extract: protectedProcedure
    .input(z.object({
      postTexts: z.array(z.string().min(50)).min(1).max(5),
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const extracted = await extractPostStructure(input.postTexts);
      return ctx.db.postStructure.create({
        data: {
          userId: ctx.user.id,
          name: input.name || extracted.suggestedName,
          sourcePostTexts: input.postTexts,
          narrativeArc: extracted.narrativeArc,
          hookStrategy: extracted.hookStrategy,
          pacingPattern: extracted.pacingPattern,
          transitions: extracted.transitions,
          evidencePattern: extracted.evidencePattern,
          closingStrategy: extracted.closingStrategy,
          formattingRules: extracted.formattingRules,
          reusableTemplate: extracted.reusableTemplate,
        },
      });
    }),

  // List user's structures + default templates
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.postStructure.findMany({
      where: { OR: [
        { userId: ctx.user.id },
        { isDefault: true },
      ]},
      orderBy: { lastUsedAt: 'desc' },
    });
  }),

  // Check context sufficiency before generation
  checkContext: protectedProcedure
    .input(z.object({
      structureId: z.string(),
      topicInput: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const structure = await ctx.db.postStructure.findUnique({
        where: { id: input.structureId },
      });
      return evaluateContextSufficiency(
        structure.reusableTemplate,
        input.topicInput
      );
    }),

  // Delete, rename, etc.
  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(/* ... */),
  
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(/* ... */),
});
```

### Modified generation pipeline

Your existing generation pipeline (Section 2 of the MVP spec) adds one branch:

```
┌─────────────────────────────────────────────────┐
│  1. USER INPUT                                   │
│     Topic/idea + post type + target audience      │
│     + OPTIONAL: selected PostStructure            │
├─────────────────────────────────────────────────┤
│  1.5 CONTEXT CHECK (if structure selected)       │  ← NEW
│     Evaluate if topic input fills template        │
│     If insufficient → ask follow-up questions     │
│     If sufficient → proceed                       │
├─────────────────────────────────────────────────┤
│  2. EXAMPLE RETRIEVAL (RAG via pgvector)         │
│     Same as existing — user's post corpus         │
├─────────────────────────────────────────────────┤
│  3. PROMPT ASSEMBLY                              │
│     System: Role + voice profile + style rules    │
│     Few-shot: 3-5 user's actual posts             │
│     Structure: reusableTemplate (if provided)     │  ← NEW
│     Instruction: Topic + format + constraints     │
├─────────────────────────────────────────────────┤
│  4-6: Same as existing                           │
└─────────────────────────────────────────────────┘
```

### Cost impact

Structure extraction uses one additional LLM call per structure creation — a lightweight operation (~2,000 input tokens, ~800 output tokens). At Claude Sonnet pricing, this is approximately $0.01-0.02 per extraction. Since users create structures infrequently (maybe 2-5 per month) and reuse them many times, the cost is negligible.

The context sufficiency check adds ~$0.005 per generation request (small input, small output). This is well within acceptable margins.

Generation with structure adds maybe 200-400 tokens to the prompt (the template + structural metadata). At prompt-cached rates, this costs roughly $0.001 extra per generation.

---

## Competitive differentiation this creates

| Feature | Your product | Taplio | AuthoredUp | Letterdrop |
|---------|-------------|--------|------------|------------|
| Extract structure from any post | ✅ Dynamic, user-selected | ❌ | ❌ | ❌ |
| Separate voice from structure | ✅ Core architecture | ❌ Copies tone + content | ❌ N/A (no AI gen) | ⚠️ Pre-built only |
| Save structure library | ✅ Personal, growing | ❌ | ⚠️ Fixed templates | ⚠️ Fixed templates |
| Chrome extension one-click save | ✅ From any LinkedIn post | ❌ | ❌ | ❌ |
| Smart follow-up questions | ✅ Context-aware | ❌ | ❌ | ⚠️ Interview flow |
| Maintain authentic user voice | ✅ Primary moat | ❌ Generic AI voice | ❌ No generation | ⚠️ Partial |

The combination of dynamic structure extraction (from any post the user chooses) plus your voice profile system creates a workflow no competitor offers: **"I love how Justin Welsh structures his posts, but I want them to sound like me."** That's the pitch in one sentence.

---

## Implementation priority and phasing

### Phase 1 (Add to V1, weeks 5-7): Core extraction + generation

- Prisma schema additions for PostStructure
- Structure extraction prompt pipeline (`structure-extractor.ts`)
- Context sufficiency checker (`context-checker.ts`)
- Modified prompt builder to accept structure parameter
- Basic "paste posts → extract → name → save" flow in the dashboard
- 5 pre-built starter templates seeded in the database
- Structure selection step in the "Create Post" chat flow
- tRPC routes for CRUD operations

**Estimated effort:** 3-5 days for a developer who's already built the voice pipeline, since the extraction and generation patterns are architecturally similar.

### Phase 2 (Add to V1, weeks 7-9): Chrome extension integration

- "Save Structure" button injected on LinkedIn posts
- Post text extraction from LinkedIn DOM (reuse existing safe selectors)
- Extension ↔ backend flow for extraction + storage
- Structure library page in the dashboard

**Estimated effort:** 2-3 days, leveraging existing extension architecture.

### Phase 3 (V2): Advanced features

- Structure performance tracking (which structures generate posts with highest engagement)
- AI-suggested structures based on user's content pillars and audience
- Structure sharing between team members
- "Trending structures" based on what's performing well across the platform
- Structure mixing: combine the hook from one structure with the body from another

---

## Summary: the three things that make this work

1. **Clean separation of voice and structure in the prompts.** The extraction prompt must output a generic skeleton with zero voice artifacts. The generation prompt must receive voice and structure as completely independent inputs. This is the technical foundation.

2. **Chrome extension as the natural collection mechanism.** Users shouldn't have to "go find posts." They should see a great post while scrolling, tap one button, and add its structure to their library. This turns passive consumption into active strategy building.

3. **Smart context gathering that respects the user's time.** When the topic input is rich enough, generate immediately. When it's not, ask the minimum number of targeted questions — framed as creative collaboration, not interrogation. Every unnecessary question is a user who gives up.

The feature turns your product from "AI that sounds like me" into "AI that sounds like me AND writes like the best creators on LinkedIn." That's the value proposition that converts free users into paying customers.
