# Building a voice engine that actually sounds like someone

**Your LinkedIn ghostwriting agent has the right foundation but three critical architectural gaps: a static voice profile that never learns, a context window that forgets important corrections, and style instructions too abstract for Claude to act on.** This report provides a complete blueprint for fixing each — covering prompt engineering, voice profile schema design, and progressive learning systems — drawn from Anthropic's API documentation, computational stylometry research, practitioner implementations, and recent academic work on LLM style transfer.

The core finding across all research: **few-shot prompting improves style-matching accuracy by 23.5x over zero-shot**, prompting strategy matters more than model choice for voice fidelity, and the biggest lever you're likely not pulling is replacing abstract tone labels with concrete, measurable writing rules. Your current schema stores `formality: casual/balanced/formal` — but Claude needs "sentences average 8-12 words, never exceed 20, open with a question or bold claim, avoid semicolons entirely."

---

## Your current system's three biggest problems

Before diving into solutions, here's a diagnostic of what the existing architecture gets wrong based on the research.

**Problem 1: The system prompt is frozen at onboarding.** You generate it once and never update it. Every user correction, every edit, every "this doesn't sound like me" disappears into the void. The voice profile should be a living document that distills accumulated feedback every 10-20 interactions. Research from Meta's PAHF framework shows that personalization systems with updatable memory dramatically outperform static profiles, especially after preference shifts.

**Problem 2: The last-8-interactions window is a naive FIFO queue.** When interaction #9 arrives, interaction #1 gets dropped — even if it contained a foundational correction like "I never use exclamation marks." LLMs also exhibit a "lost in the middle" attention bias, paying most attention to content at the start and end of context while ignoring the middle. Your 8 interactions are likely getting uneven attention, and critical early learnings vanish permanently.

**Problem 3: Your style dimensions are too abstract for reliable generation.** `tone_description` and `personality_traits` are labels Claude interprets differently each time. "Casual and confident" could produce wildly different outputs across runs. Research consistently shows that **concrete, quantitative style rules** (sentence length ranges, specific vocabulary preferences, structural patterns) produce dramatically more consistent voice replication than adjective-based descriptions. The difference is "casual tone" versus "uses contractions always, starts 40% of sentences with 'I' or 'Look,' averages 9 words per sentence, never uses semicolons or the word 'utilize.'"

---

## Area 1: Prompt engineering that prevents average-voice collapse

### The XML voice profile structure Claude actually follows

Claude was trained with XML tags, and structured input produces measurably higher-quality structured output. Anthropic's own documentation recommends XML for organizing complex prompts. Here is the optimal system prompt architecture for voice replication, synthesized from Anthropic's guidance, Nina Panickssery's style-emulation pipeline, and the Atom Writer "Brand Anchor" approach:

```xml
<role>
You are a LinkedIn ghostwriter. You write exclusively in {Name}'s voice.
Every word must sound like {Name} wrote it on their best day.
</role>

<voice_profile>
SENTENCE ARCHITECTURE:
- Average sentence length: 9-14 words. Never exceed 22 words.
- 60% simple declarative, 25% questions, 15% fragments.
- Opens paragraphs with bold claims or direct questions, never "In today's..."
- Alternates between 1-sentence and 2-sentence paragraphs.

VOCABULARY:
- Uses: "wild," "real talk," "here's the thing," "zero fluff"
- Never uses: "leverage," "utilize," "delve," "game-changing," "it's important to note"
- Contractions always ("don't" never "do not")
- First person dominant. "You" for reader address.

RHYTHM AND CADENCE:
- Punchy-long-punchy pattern. Short sentence. Then a longer one that 
  develops the idea. Then snap back short.
- Line breaks between every 1-2 sentences (LinkedIn formatting).
- No transition words: no "Furthermore," "Moreover," "Additionally."

PUNCTUATION:
- Em-dashes frequently — used for asides and emphasis.
- No semicolons ever. No Oxford comma.
- Occasional ALL CAPS for single-word emphasis.
- Emoji: sparingly, max 1-2 per post, only 🔥 and 💡.

STRUCTURAL PATTERNS:
- Hook: provocative question or contrarian claim in line 1.
- Body: personal anecdote → lesson → broader principle.
- Close: direct question to reader OR single-line CTA.
- Total length: 150-250 words per post.
</voice_profile>

<anti_patterns>
NEVER write these — they immediately break voice authenticity:
- "In today's fast-paced world" or any throat-clearing opener
- "It's not X — it's Y" (overused AI pattern)
- Passive voice ("was implemented" → "we built")
- Hedging language ("perhaps," "arguably," "it could be said")
- Lists longer than 3 items
- Generic motivational closings ("The future is bright!")
- Uniform sentence lengths (vary between 4 and 18 words)
</anti_patterns>

<exemplar_posts>
[Include 3-5 actual posts from the user, preserving original formatting,
line breaks, and rhythm exactly as written]
</exemplar_posts>
```

**Place the voice profile at the very top of the system prompt** (highest attention zone), exemplar posts in the middle, and task-specific instructions at the end (second-highest attention zone). This counteracts the "lost in the middle" problem that causes Claude to underweight mid-context instructions.

### Few-shot examples are non-negotiable

A 2025 study measuring style-matching accuracy found that zero-shot prompting completely failed (below 7% accuracy) while few-shot prompting achieved **23.5x higher fidelity**. Another study confirmed that few-shot generations are statistically significantly closer to target style than zero-shot, validated via Wilcoxon signed-rank tests — but increasing demonstrations beyond 5 offers limited additional gains.

The most effective few-shot technique comes from Nina Panickssery's style-emulation pipeline: instead of simply pasting examples, construct **synthetic conversation history** where each example appears as an assistant response to a generated prompt. This teaches Claude in-context that "the assistant" writes in the target voice:

```
User: Write a LinkedIn post about why most startup advice is wrong.
Assistant: [Actual user post about startup advice, verbatim]

User: Write a LinkedIn post about hiring your first employee.
Assistant: [Actual user post about hiring, verbatim]
```

This format outperforms raw examples because it establishes a behavioral pattern — Claude learns that "when I'm asked to write, I produce text that looks like these examples."

### Extended thinking improves voice analysis but has a tradeoff

Claude's extended thinking feature allows internal step-by-step reasoning before generating output. For voice replication, this means Claude can analyze the voice profile, reason about which patterns to apply, and plan its approach before writing. Enable it with a **2,000-5,000 token budget** — enough for style reasoning without excessive cost:

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 16000,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 3000
  }
}
```

**The critical tradeoff**: when extended thinking is enabled, you cannot set `temperature` or `top_p` — they lock to defaults. Since temperature 0.5-0.7 is the sweet spot for style replication (low enough for pattern adherence, high enough to avoid robotic output), you must choose between extended thinking and temperature control. For most LinkedIn posts, **use temperature 0.6 without extended thinking** for production generation, and reserve extended thinking for voice profile analysis tasks where Claude needs to reason about stylistic patterns in writing samples.

### Prompt caching makes rich voice profiles economical

Anthropic's prompt caching stores the processed representation of your system prompt, reducing cost by **90%** on cache reads and latency by up to 85%. For a voice profile with 5 exemplar posts (potentially 3,000-5,000 tokens), this is essential:

```python
system=[
    {"type": "text", "text": voice_profile_xml,
     "cache_control": {"type": "ephemeral"}}
]
```

The cache persists for 5 minutes (refreshing on each hit), meaning consecutive post generations reuse the cached voice profile. At **$0.30 per million tokens** for cache reads versus $3.00 for fresh input on Sonnet 4.6, a user generating 5 posts per session pays roughly 10% of the uncached cost. This makes including 5-10 full exemplar posts economically viable.

### Concrete rules beat abstract labels every time

The research is unambiguous: **quantitative, actionable instructions dramatically outperform adjective-based style descriptions**. Anthropic's own documentation says "instead of 'be concise', give a specific sentence range like 'limit your response to 2-3 sentences.'" Google Cloud's prompt engineering guidance agrees: "Avoid using subjective or relative qualifiers that lack a concrete, measurable definition."

Your current `formality: casual` means nothing specific. Replace it with rules Claude can verify against its own output: sentence length ranges, contraction frequency, specific vocabulary to use and avoid, structural templates for openings and closings, punctuation rules. The Atom Writer team found that **structured voice profiles with explicit vocabulary rules and tone scales beat vague adjectives by 40-60% less editing required**.

Also critical: **match the formatting of your prompt to the desired output**. Anthropic confirms that "the formatting style used in your prompt influences Claude's response style." If you want short LinkedIn posts with line breaks, write your system prompt with short sentences and line breaks. If you include Markdown headers in your prompt, Claude will include them in output. Remove all formatting from the prompt that you don't want in the output.

---

## Area 2: A voice profile schema grounded in stylometry research

### The 10 dimensions that actually matter

Computational stylometry research identifies hundreds of measurable features, but for practical voice recreation, **10 dimensions capture the vast majority of a person's writing fingerprint**. These are drawn from the Lagutina et al. (2019) survey, the GhostWriter design probe (CHI 2024), forensic linguistics research, and practitioner experience:

1. **Sentence architecture** — length distribution (mean, standard deviation, min, max), sentence type ratios (declarative, interrogative, imperative, fragments), complexity (simple vs. compound vs. complex), and opening-word patterns
2. **Vocabulary fingerprint** — lexical diversity (Type-Token Ratio, MTLD), word length preference, Latinate-to-Germanic ratio, signature phrases, and forbidden words
3. **Rhythm and cadence** — sentence length variation coefficient (choppy vs. flowing), paragraph length, alternation patterns (short-long-short), and clause density
4. **Punctuation profile** — per-1000-word rates for every mark (commas, em-dashes, semicolons, exclamation marks, ellipses), Oxford comma preference, and parenthetical frequency
5. **Transition patterns** — connector preferences (causal, temporal, adversative), paragraph-opening habits, and whether transitions are explicit ("However") or implicit (juxtaposition)
6. **Opening and closing signatures** — hook type distribution (question, anecdote, statistic, bold claim), closing patterns (CTA, question, reflection), and first-sentence characteristics
7. **Rhetorical devices** — metaphor/analogy sources, rhetorical question frequency, direct reader address ("you") rate, humor style, and storytelling approach
8. **Formatting habits** — list usage, header patterns, paragraph density, bold/italic/caps usage, emoji usage, and platform-specific formatting (LinkedIn line breaks)
9. **Tone and register** — formality on a 1-10 scale, emotional valence tendency, authority level (directive vs. collaborative), and perspective (first/second/third person distribution)
10. **Argument structure** — thesis-first vs. evidence-first, abstraction level, source-referencing habits, contrarian tendency, and nuance level

Research shows that **function words and punctuation patterns are the single most discriminative features** for authorship attribution — more reliable than vocabulary or topic. Your current schema captures none of these quantitatively. The GhostWriter paper's five-dimension model (tone, voice, word choice, sentence structure, paragraph structure) is a good starting point but insufficient alone.

### How many writing samples you actually need

The research converges on clear thresholds. Eder's foundational stylometry work established **2,000-5,000 running words** as the minimum for reliable attribution, with accuracy improving sharply up to that point then plateauing. For AI ghostwriting specifically, **6-10 substantial pieces** (each 500+ words) provide enough signal for a high-quality voice profile, while **15-30 pieces spanning different topics** (totaling 15,000-50,000 words) represent the optimal range. Having samples across different topics is critical because it lets the system separate style from content — you want to capture how someone writes, not just what they write about.

For your system's onboarding, the pasted LinkedIn posts are your highest-fidelity source. Chat transcripts are useful but need different treatment: they reveal natural vocabulary, metaphors, storytelling cadence, and pet phrases, but their punctuation and sentence structure are transcription artifacts, not writing choices. **Weight finished posts at 1.0 and chat transcripts at 0.3-0.5**, extracting only vocabulary patterns, metaphor preferences, and topic framing from transcripts while ignoring their structure entirely.

### The voice profile schema your system should store

Replace your current flat schema with a structured document that separates quantitative measurements from qualitative descriptions from raw exemplars:

```json
{
  "version": "2.3",
  "last_updated": "2026-03-07",
  "update_count": 12,
  
  "quantitative_profile": {
    "sentence_length": {"mean": 11.2, "std": 4.8, "min": 3, "max": 22},
    "paragraph_length": {"mean": 2.1, "sentences_per_paragraph": true},
    "vocabulary_richness": {"ttr": 0.72, "mtld": 84.3},
    "contraction_rate": 0.89,
    "question_frequency": 0.23,
    "first_person_rate": 0.31,
    "exclamation_rate": 0.02,
    "emoji_rate": 0.8
  },
  
  "qualitative_rules": [
    {"dimension": "openings", "rule": "Start with a contrarian claim or direct question. Never throat-clear.", "confidence": 0.95, "source": "12 samples + 3 corrections"},
    {"dimension": "vocabulary", "rule": "Uses 'wild' not 'remarkable'. Uses 'real talk' as transition.", "confidence": 0.88, "source": "8 samples"},
    {"dimension": "structure", "rule": "Hook → personal story → lesson → question to reader", "confidence": 0.92, "source": "10 samples + user confirmation"}
  ],
  
  "anti_patterns": [
    {"pattern": "Never uses semicolons", "confidence": 1.0},
    {"pattern": "Never uses 'leverage' or 'utilize'", "confidence": 1.0},
    {"pattern": "Never opens with 'In today's...'", "confidence": 0.97}
  ],
  
  "signature_elements": {
    "phrases": ["here's the thing", "real talk", "zero fluff"],
    "metaphor_sources": ["sports", "cooking"],
    "humor_style": "self-deprecating, brief asides"
  },
  
  "exemplar_posts": ["[raw post 1]", "[raw post 2]", "[raw post 3]"],
  
  "generated_system_prompt": "[The full XML system prompt, regenerated at each version update]"
}
```

**Store raw exemplars and extracted features and the generated prompt.** Research and practice converge on this: raw exemplars capture holistic qualities (narrative arc, humor timing, idea development) that extracted features miss, while quantitative features enable automated drift detection and concrete prompt instructions. The generated system prompt is what Claude actually consumes, rebuilt from the other two whenever the profile updates.

### Programmatic feature extraction for the initial profile

Use **StyloMetrix** (Python, 195 features, built on spaCy) as the primary extraction tool for building quantitative profiles from writing samples. It covers grammatical forms, lexical patterns, POS frequencies, sentiment, syntactic forms, and text statistics with normalized outputs for cross-text comparison. Supplement with **spaCy** for custom features (opening-word patterns, paragraph structure) and **textstat** for readability metrics. A practical pipeline:

1. Collect 6-10 writing samples, clean formatting but preserve structure
2. Run StyloMetrix to extract 195 features per sample, then average
3. Run custom spaCy pipeline for LinkedIn-specific features (hook types, CTA patterns, line break density, emoji placement)
4. Feed all samples to Claude with the analysis prompt: "Create a comprehensive style guide covering tone, sentence structure, vocabulary, pacing, personality traits, structural patterns, and punctuation habits. Be specific and quantitative."
5. Cross-validate Claude's qualitative analysis against the quantitative StyloMetrix output
6. Generate the XML system prompt from the combined profile

---

## Area 3: Making the voice profile learn and improve over time

### The tiered memory architecture that prevents forgetting

Replace your flat sliding window of 8 interactions with a three-tier system inspired by the Letta/MemGPT architecture and Meta's PAHF framework:

**Tier 1 — Core Memory (always in context, ~800-1,200 tokens):** The distilled voice profile XML. This is always present in every system prompt. It contains the synthesized rules, anti-patterns, and style description. Updated periodically through distillation. Early foundational corrections get "promoted" here permanently.

**Tier 2 — Working Memory (recent context, ~2,000-3,000 tokens):** The last 5-8 interactions, but importance-weighted rather than FIFO. Direct edit corrections (highest signal) persist longer than simple approvals (lowest signal). When the window fills, low-importance items get dropped first while high-importance items get absorbed into Core Memory before removal.

**Tier 3 — Archival Memory (searchable, unlimited):** Full history of all interactions stored in a vector database. At generation time, retrieve the 2-3 most relevant past interactions (matched by topic or content type) and include them as additional few-shot examples. This provides topic-specific voice context without consuming permanent context window space.

This architecture means Claude always sees the distilled profile (Tier 1), always has recent corrections visible (Tier 2), and gets relevant historical context when it would help (Tier 3). Critical early corrections never vanish — they're either promoted to Tier 1 or retrievable from Tier 3.

### Profile distillation: how and when to update

The system prompt should not be generated once — it should be **re-distilled on a decreasing cadence** as the profile matures. Use Claude itself as the distiller, feeding it the current profile plus accumulated feedback and asking it to produce an updated, compact voice profile:

```
Interactions 1-5:    Update after EVERY interaction (rapid learning)
Interactions 6-20:   Update every 5 interactions
Interactions 21-50:  Update every 10 interactions
Interactions 50+:    Update every 20 interactions OR on quality-drop trigger
```

The distillation prompt:

```xml
<current_profile>{current voice profile XML}</current_profile>
<new_feedback>
  Interaction 12: User replaced "utilize" with "use" and "However," with "But"
  Interaction 13: User approved as-is (post about hiring)
  Interaction 14: User rewrote opening from question to bold claim
  Interaction 15: User feedback: "too many em-dashes, dial it back"
</new_feedback>

Produce an updated voice profile that incorporates these learnings.
Rules that appear 3+ times become high-confidence.
Never drop existing high-confidence rules unless contradicted.
Keep the profile under 1000 tokens.
```

**Version the profile** with timestamps. Keep the last 3 versions for rollback if a distillation introduces regression. After distillation, generate 2-3 test paragraphs with the old and new profiles and compare — deploy the new version only if it's measurably better or at least equivalent.

### Weighting feedback signals for maximum learning

Not all user signals carry equal information. Direct edits contain the most precise style information because the user invested effort to show exactly what they prefer. The recommended weighting hierarchy:

**Direct edits (weight 1.0)** are the gold standard. Compute a word-level diff between the AI output and the user's edited version, then classify each change: vocabulary substitution, sentence restructuring, tone shift, formatting change, or content addition/deletion. When the same type of edit appears 3+ times (e.g., user consistently replaces Latinate words with simpler alternatives), promote it to a high-confidence rule in the voice profile.

**Rejections with explanation (weight 0.8)** provide clear direction. Parse the explanation for style directives — "too formal" maps to shorter sentences, more contractions, less hedging.

**Verbal corrections (weight 0.6)** like "make it punchier" require interpretation. Map them to concrete style dimensions and validate by checking if the user approves the next output that applies the interpretation.

**Simple approvals (weight 0.1-0.3)** are weak positive signals — the user may just be busy. Only count them as meaningful when the same pattern repeats 3+ times. However, approved posts should be added to the exemplar pool for future few-shot examples, selected by semantic similarity to each new writing task.

Apply **exponential decay** to older feedback so recent corrections take priority, but exempt "foundational rules" — high-confidence, repeatedly validated preferences — from decay. These persist permanently.

### Best-of-N generation with voice scoring

Since Anthropic doesn't offer per-user fine-tuning of Claude models, the most effective quality lever after prompt engineering is **best-of-N sampling with a voice judge**. Generate 2-3 candidate posts, then use a separate Claude call (Haiku 4.5 is sufficient and cost-effective for this) to score each against the voice profile:

```xml
<voice_profile>{the user's voice profile}</voice_profile>
<candidate_post>{generated post}</candidate_post>

Score this post on voice match (1-10) across these dimensions:
- Sentence length and rhythm match
- Vocabulary and word choice match  
- Structural pattern match (opening, body, closing)
- Anti-pattern violations (list any)
- Overall voice authenticity

Return the score and specific areas of mismatch.
```

Present only the highest-scoring candidate to the user. When the user still edits the top-scoring candidate, the gap between their edit and the model's best attempt provides the most informative learning signal — it reveals exactly where the profile's ceiling is.

### Detecting voice drift before the user notices

Track three quantitative metrics on a rolling window:

**Acceptance rate** — the percentage of posts the user approves without major edits over the last 10 interactions. If this drops more than 15 percentage points from baseline, trigger immediate profile re-distillation with emphasis on recent corrections.

**Edit distance** — the average word-level diff size between AI output and user-edited versions. An upward trend signals that outputs are drifting from the user's expectations. Measure this as the proportion of tokens changed.

**Stylometric divergence** — periodically (every 20 interactions), generate test paragraphs and compare their StyloMetrix feature vectors against the user's gold-standard writing samples. If cosine similarity drops below a threshold, the model's output is drifting from the quantitative voice profile even if the user hasn't complained yet.

Set a **90-day safety net**: regardless of other metrics, trigger a full profile review and re-distillation at least quarterly. Writing styles evolve naturally (a phenomenon called "stylochronometry" in the literature), and the profile should evolve with them.

---

## Model selection and API parameter recommendations

**Use Sonnet 4.6 for all production post generation.** At $3/$15 per million tokens with 200K context (expandable to 1M with beta headers), it provides the best balance of style quality, speed, and cost. Anthropic describes it as "best combination of speed and intelligence" with strong creative writing capabilities.

**Use Haiku 4.5 for voice scoring, diff analysis, and distillation tasks.** At $1/$5 per million tokens, it's 3x cheaper than Sonnet and fast enough for these analytical tasks. It rivals earlier Sonnet models in reasoning capability.

**Reserve Opus 4.6 for initial voice profile creation** during onboarding, where maximum analytical depth matters. Its "adaptive thinking" mode dynamically adjusts reasoning depth per query and produces the most nuanced style analysis. At $5/$25 per million tokens, it's too expensive for daily generation but worth the premium for the one-time profile creation step.

**Set temperature to 0.6** for production generation (without extended thinking). This provides enough variation to avoid robotic repetition while maintaining consistency with the target voice. Increase to 0.7-0.8 for more creative or literary voices; decrease to 0.4-0.5 for highly structured, corporate voices. Never use `top_p` and `temperature` together — Anthropic's documentation explicitly warns against this. Temperature alone is sufficient.

**Enable prompt caching on the system prompt** containing the voice profile and exemplars. With the profile persisting for 5 minutes per cache hit, consecutive generations reuse the cached representation at 90% cost savings. This makes including 5+ full exemplar posts economically viable for every request.

---

## Conclusion: the implementation roadmap

The single highest-impact change is replacing your abstract style labels with **concrete, quantitative writing rules in XML format**. This alone — without any architectural changes — will produce noticeably better voice fidelity. The second-highest impact change is implementing **profile distillation on a decreasing cadence**, turning your frozen onboarding prompt into a living document that improves with every interaction.

The three-tier memory architecture (distilled profile → importance-weighted recent interactions → vector-searchable history) solves both the forgetting problem and the context-window efficiency problem simultaneously. Combined with best-of-N voice scoring using Haiku as a cheap judge, this creates a system that catches voice drift before it reaches the user.

What separates good voice replication from great is the anti-patterns. Research on LLM-generated text detection confirms that outputs consistently default to a recognizable "helpful AI assistant" voice — detectable not by what the model says but by what it never says. The absence of fragments, the uniformly medium sentence lengths, the polite hedging. Your anti-pattern list is as important as your style rules. Define what the user would *never* write with the same precision you define what they *would* write, and you'll close the gap between "this sounds like AI writing about me" and "this sounds like me."