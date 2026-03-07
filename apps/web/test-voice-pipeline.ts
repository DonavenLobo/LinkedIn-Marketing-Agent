/**
 * Voice Mimicking Pipeline Test
 *
 * Runs the full onboarding analysis + post generation pipeline against a
 * real test conversation so we can inspect every intermediate output and
 * tune the prompts for better voice mimicking.
 *
 * Usage (from apps/web/):
 *   npx tsx test-voice-pipeline.ts
 *
 * Or from repo root:
 *   npx tsx apps/web/test-voice-pipeline.ts
 *
 * Requires ANTHROPIC_API_KEY in apps/web/.env.local
 */

import fs from "fs";
import path from "path";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildSystemPrompt, buildUserPrompt } from "./src/lib/ai/prompts";
import type { TranscriptMessage, VoiceProfile } from "@linkedin-agent/shared";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTranscript(t: TranscriptMessage[]): string {
  return t
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");
}

function divider(title: string) {
  const line = "-".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line + "\n");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set. Run with: npx tsx --env-file=.env.local test-voice-pipeline.ts");
    process.exit(1);
  }

  // ── Load test conversation ────────────────────────────────────────────────
  const convoPath = path.join(__dirname, "../../test/test_onboarding_conversation.txt");
  const rawConvo = fs.readFileSync(convoPath, "utf-8").trim();

  // The file is partial JSON: `"transcript": [...]`
  // Wrap it to make a valid JSON object.
  const parsed = JSON.parse("{" + rawConvo + "}") as { transcript: TranscriptMessage[] };
  const transcript = parsed.transcript;

  console.log(`✓ Loaded ${transcript.length} transcript messages\n`);

  // ── Hardcoded toolData summary (mirrors what the chat route's AI produces) ──
  const toolData = {
    summary:
      "ML engineer at Ford building agentic AI systems (deep research agents, social listening agents, AI image generation) for product concepting and marketing teams. Building a personal brand as someone who both understands cutting-edge ML and can ship AI agentic systems into production. Prefers raw, conversational, direct writing with dry humor. Dislikes obviously AI-generated content. Wants short posts that get to the point with concrete takeaways. Has real war stories from a year of shipping agents from prototype to production at an enterprise.",
    confidence: "high" as const,
  };

  // ── PHASE 1: Linguistic Analysis ──────────────────────────────────────────
  divider("PHASE 1 — Linguistic Analysis (Sonnet)");

  const formattedTranscript = formatTranscript(transcript);

  const phase1Prompt = `You are an expert linguistic analyst specializing in writing voice profiling for LinkedIn content creators. You work with professionals in private equity, real estate, and capital markets.

Analyze the following onboarding conversation to build a comprehensive voice profile. Think through each dimension carefully, citing specific evidence from the user's responses.

ANALYSIS FRAMEWORK:

Step 1 — EXPLICIT PREFERENCES
List every direct statement the user made about their preferred writing style, tone, formatting, or content approach. Quote their exact words.

Step 2 — IMPLICIT PATTERN ANALYSIS
For each of the user's free-text responses, analyze:
- Sentence length (short and punchy vs. longer and flowing)
- Vocabulary sophistication (simple/moderate/technical)
- Contractions and informality markers
- Punctuation patterns (exclamation marks, dashes, ellipses, question marks)
- Emoji usage in their responses
- Pronoun patterns (I/we/you frequency)
- Hedging vs. assertive language ("I think" vs. declarative statements)
- Emotional vs. analytical framing
- Humor markers (if any)
- Industry jargon used naturally (without being asked)

Step 3 — ANTI-PREFERENCES
Note what the user explicitly rejected, disliked, or expressed distaste for about LinkedIn content.

Step 4 — CONFLICT DETECTION
Identify any cases where explicit stated preferences contradict observed implicit behavior.
For each conflict: weight implicit behavior at 70% and explicit statements at 30%.

Step 5 — CONFIDENCE ASSESSMENT
For each dimension, rate confidence as: high (3+ consistent signals) | medium (1-2 signals) | low (inferred from limited evidence)

AI INTERVIEWER'S SUMMARY:
${toolData.summary}
Confidence level reported by interviewer: ${toolData.confidence}

FULL CONVERSATION TRANSCRIPT:
${formattedTranscript}`;

  const { text: analysis } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: phase1Prompt,
    temperature: 0.2,
  });

  console.log(analysis);

  // ── PHASE 2: Voice Profile JSON ────────────────────────────────────────────
  divider("PHASE 2 — Voice Profile JSON (Sonnet)");

  const phase2Prompt = `Based on the linguistic analysis below, generate a voice profile optimized for guiding an AI ghostwriter to write LinkedIn posts that sound authentically like this user.

RULES:
- For any dimension with low confidence, use a moderate default and acknowledge it
- For conflicts between explicit and implicit signals, weight implicit behavior at 70%
- signature_phrases should only include phrases the user actually used in their responses
- avoid_phrases must include any phrases they rejected PLUS common AI LinkedIn clichés: "game-changer", "in today's fast-paced world", "let's dive in", "thrilled to announce", "I'm excited to announce", "synergy", "leverage", "circle back", "touch base", "move the needle", "at the end of the day"
- system_prompt should be a detailed 3-4 paragraph ghostwriter instruction that captures voice, style, vocabulary, and preferences. Write it in second person directed at an AI ghostwriter ("Write posts that sound like...")
- The system_prompt MUST include this exact rule: "NEVER use em dashes (— or –). They are a dead giveaway of AI writing. Use a comma, period, or rewrite the sentence instead."
- All formality must be exactly one of: "casual", "balanced", "formal"

LINGUISTIC ANALYSIS:
${analysis}

Respond ONLY with valid JSON matching this exact schema:
{
  "tone_description": "2-3 sentence natural language description of their writing voice",
  "formality": "casual" | "balanced" | "formal",
  "personality_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "signature_phrases": ["phrases they naturally used in conversation"],
  "avoid_phrases": ["clichés and phrases that clash with their style"],
  "formatting_preferences": {
    "uses_emojis": boolean,
    "line_break_style": "dense" | "spaced" | "mixed",
    "uses_hashtags": boolean,
    "hashtag_count": number
  },
  "system_prompt": "Detailed ghostwriter instruction paragraph..."
}`;

  const { text: profileJson } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: phase2Prompt,
    temperature: 0.3,
  });

  let voiceData: Record<string, unknown>;
  try {
    const cleaned = profileJson
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    voiceData = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse Phase 2 response:\n", profileJson);
    process.exit(1);
  }

  console.log(JSON.stringify(voiceData, null, 2));

  // ── PHASE 3: Sample Post Opening ──────────────────────────────────────────
  divider("PHASE 3 — Sample Post Opening / Hook (Sonnet)");

  const sigPhrases = (voiceData.signature_phrases as string[] | undefined)?.join(", ") || "none";
  const avoidPhrases = (voiceData.avoid_phrases as string[] | undefined)?.join(", ") || "none";
  const traits = (voiceData.personality_traits as string[] | undefined)?.join(", ") || "professional";
  const fmtPrefs = voiceData.formatting_preferences as Record<string, unknown> | undefined;

  const phase3System = `You are a LinkedIn ghostwriter. Write a 2-3 sentence LinkedIn post opening that sounds unmistakably like the specific person described below.

WHO THIS PERSON IS:
${toolData.summary}

THEIR VOICE PROFILE:
- Tone: ${voiceData.tone_description || "professional and authentic"}
- Formality: ${voiceData.formality || "balanced"}
- Personality traits: ${traits}
- Phrases they naturally use: ${sigPhrases}
- Phrases to NEVER use: ${avoidPhrases}
- Uses emojis: ${fmtPrefs?.uses_emojis === true ? "yes, sparingly" : "no"}
- Line break style: ${fmtPrefs?.line_break_style || "spaced"}

${voiceData.system_prompt ? `ADDITIONAL VOICE NOTES:\n${voiceData.system_prompt}` : ""}

THEIR ONBOARDING CONVERSATION (read this to understand how they actually talk and write):
${formattedTranscript}

LINKEDIN HOOK PRINCIPLES (the first ~210 characters appear before "See more" — make every word count):
- Effective hook formulas: surprising stat, contrarian take ("Everything you've been told about X is wrong"), personal story opener ("I got fired 3 years ago..."), direct question, or bold declarative claim
- Never open with "I'm excited to announce..." — it is the most overused opener on LinkedIn
- Front-load the key message; short sentences (under 12 words) perform best on mobile

WRITING RULES:
- NEVER use em dashes (— or –). Use a comma, a period, or restructure the sentence.
- Write ONLY the opening 2-3 sentences — the hook before "see more". Nothing more.
- Pick a topic relevant to their industry and audience based on what you learned about them.
- Mirror their actual word choices, sentence length, and energy from the conversation above.
- Sound completely human. No AI tells.
- Do not add any labels, headers, or commentary. Output only the post text.`;

  const { text: sampleOpening } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system: phase3System,
    prompt: "Write the opening hook for a LinkedIn post in this person's voice.",
    temperature: 0.7,
  });

  const opening = sampleOpening.trim();
  console.log(opening);
  console.log(`\n[Characters: ${opening.length} | First 210 chars of fold: "${opening.slice(0, 210)}"]\n`);

  // ── PHASE 4: Full Post Generation ─────────────────────────────────────────
  divider("PHASE 4 — Full Post Generation (Sonnet + LINKEDIN_POST_PRINCIPLES)");

  // Build a VoiceProfile from the Phase 2 output to pass to buildSystemPrompt
  const voiceProfile: VoiceProfile = {
    id: "test",
    user_id: "test",
    name: "Test",
    is_active: true,
    tone_description: (voiceData.tone_description as string) ?? null,
    formality: (voiceData.formality as VoiceProfile["formality"]) ?? null,
    personality_traits: (voiceData.personality_traits as string[]) ?? [],
    signature_phrases: (voiceData.signature_phrases as string[]) ?? [],
    avoid_phrases: (voiceData.avoid_phrases as string[]) ?? [],
    formatting_preferences: (voiceData.formatting_preferences as VoiceProfile["formatting_preferences"]) ?? {},
    sample_posts: transcript
      .filter((m) => m.role === "user" && m.content.length > 100)
      .map((m) => m.content),
    system_prompt: (voiceData.system_prompt as string) ?? null,
    voice_profile_version: "v2",
    core_voice_profile: null,
    exemplar_posts: [],
    learned_preferences: [],
    generation_instruction_pack: null,
    profile_stats: null,
    onboarding_answers: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const TEST_TOPIC = "Lessons learned from shipping AI agents from prototype to production at a large enterprise";

  const systemPrompt = buildSystemPrompt(voiceProfile);
  const userPrompt = buildUserPrompt(TEST_TOPIC, voiceProfile.sample_posts);

  console.log("--- SYSTEM PROMPT BEING SENT TO MODEL ---\n");
  console.log(systemPrompt);
  console.log("\n--- USER PROMPT BEING SENT TO MODEL ---\n");
  console.log(userPrompt);
  console.log("\n--- GENERATED POST ---\n");

  const { text: fullPost } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
  });

  const post = fullPost.trim();
  console.log(post);

  // ── Metrics ────────────────────────────────────────────────────────────────
  divider("METRICS");

  const charCount = post.length;
  const wordCount = post.split(/\s+/).filter(Boolean).length;
  const firstFold = post.slice(0, 210);
  const paragraphs = post.split(/\n\n+/).filter(Boolean);
  const hasEmDash = /—|–/.test(post);
  const hasBannedOpener = /^I('m| am) excited/i.test(post);
  const hasExternalLink = /https?:\/\//.test(post);

  console.log(`Characters : ${charCount} (target: 1200-1800)`);
  console.log(`Words      : ${wordCount}`);
  console.log(`Paragraphs : ${paragraphs.length}`);
  console.log(`Em dashes  : ${hasEmDash ? "❌ FOUND — fix prompt" : "✓ none"}`);
  console.log(`Bad opener : ${hasBannedOpener ? '❌ FOUND "I\'m excited" — fix prompt' : "✓ clean"}`);
  console.log(`Ext. link  : ${hasExternalLink ? "⚠ link in post body" : "✓ none"}`);
  console.log(`\nFirst 210 chars (the fold):\n"${firstFold}"\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
