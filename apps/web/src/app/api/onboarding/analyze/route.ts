import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { TranscriptMessage, ProfileToolData } from "@linkedin-agent/shared";

function formatTranscript(transcript: TranscriptMessage[]): string {
  return transcript
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");
}

function extractWritingSamples(transcript: TranscriptMessage[]): string[] {
  return transcript
    .filter((m) => m.role === "user" && m.content.length > 100)
    .map((m) => m.content);
}

function extractName(transcript: TranscriptMessage[]): string | null {
  for (const msg of transcript) {
    if (msg.role === "user" && msg.content.length < 60) {
      const trimmed = msg.content.trim();
      if (
        !trimmed.includes(" ") ||
        (trimmed.split(" ").length <= 3 && !trimmed.includes("."))
      ) {
        return trimmed;
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, toolData, userId } = body as {
      transcript: TranscriptMessage[];
      toolData: ProfileToolData;
      userId: string;
    };

    if (!transcript || !userId || !toolData) {
      return NextResponse.json(
        { error: "Missing transcript, toolData, or userId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const formattedTranscript = formatTranscript(transcript);

    // ── Phase 1: Linguistic Analysis (haiku, chain-of-thought) ──────────────
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
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: phase1Prompt,
      temperature: 0.2,
    });

    // ── Phase 2: Profile Generation (haiku, structured JSON) ────────────────
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
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: phase2Prompt,
      temperature: 0.3,
    });

    let voiceData;
    try {
      const cleaned = profileJson
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      voiceData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Phase 2 AI response:", profileJson);
      return NextResponse.json(
        { error: "Failed to parse voice analysis" },
        { status: 500 }
      );
    }

    // ── Save voice profile to DB ─────────────────────────────────────────────
    const writingSamples = extractWritingSamples(transcript);
    const extractedName = extractName(transcript);

    const { data: voiceProfile, error: insertError } = await supabase
      .from("voice_profiles")
      .insert({
        user_id: userId,
        name: "Default",
        is_active: true,
        tone_description: voiceData.tone_description,
        formality: voiceData.formality,
        personality_traits: voiceData.personality_traits || [],
        signature_phrases: voiceData.signature_phrases || [],
        avoid_phrases: voiceData.avoid_phrases || [],
        formatting_preferences: voiceData.formatting_preferences || {},
        sample_posts: writingSamples,
        system_prompt: voiceData.system_prompt,
        onboarding_answers: {
          format: "conversation_v2",
          transcript,
          tool_data: toolData,
          analysis_output: analysis,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert voice profile:", insertError);
      return NextResponse.json(
        { error: "Failed to save voice profile" },
        { status: 500 }
      );
    }

    // Mark onboarding complete, update display name if we captured it
    const profileUpdate: Record<string, unknown> = {
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    };
    if (extractedName) {
      profileUpdate.display_name = extractedName;
    }

    await supabase
      .from("user_profiles")
      .update(profileUpdate)
      .eq("id", userId);

    // ── Phase 3: Sample Post Opening (sonnet — voice mimicking) ─────────────
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

    const { text: samplePost } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: phase3System,
      prompt: "Write the opening hook for a LinkedIn post in this person's voice.",
      temperature: 0.7,
    });

    return NextResponse.json({
      voice_profile: voiceProfile,
      sample_post_opening: samplePost.trim(),
    });
  } catch (error) {
    console.error("Onboarding analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
