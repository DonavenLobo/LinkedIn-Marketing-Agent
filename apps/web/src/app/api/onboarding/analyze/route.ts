import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { CoreVoiceProfile, TranscriptMessage, ProfileToolData, VoiceProfile, VoiceRule } from "@linkedin-agent/shared";
import { buildExemplarPrompt, compileGenerationInstructionPack, createExemplar, deriveLegacyFieldsFromCore, normalizeCoreVoiceProfile, parseModelJson } from "@/lib/ai/voice-engine";

type VoiceSignalExtraction = {
  tone_summary: string;
  audience_and_intent: string;
  personality_traits: string[];
  signature_phrases: string[];
  avoid_phrases: string[];
  formality: "casual" | "balanced" | "formal";
  formatting_preferences: {
    uses_emojis: boolean;
    line_break_style: "dense" | "spaced" | "mixed";
    uses_hashtags: boolean;
    hashtag_count: number;
  };
  sentence_style_observations: VoiceRule[];
  vocabulary_observations: VoiceRule[];
  punctuation_observations: VoiceRule[];
  structure_observations: VoiceRule[];
  hook_observations: VoiceRule[];
  cta_observations: VoiceRule[];
  formatting_observations: VoiceRule[];
  anti_pattern_observations: VoiceRule[];
};

function formatTranscript(transcript: TranscriptMessage[]): string {
  return transcript
    .map((message) => `${message.role === "user" ? "USER" : "ASSISTANT"}: ${message.content}`)
    .join("\n\n");
}

function extractWritingSamples(transcript: TranscriptMessage[]): string[] {
  return transcript
    .filter((message) => message.role === "user" && message.content.length > 100)
    .map((message) => message.content);
}

function extractName(transcript: TranscriptMessage[]): string | null {
  for (const message of transcript) {
    if (message.role !== "user" || message.content.length >= 60) continue;
    const trimmed = message.content.trim();
    if (!trimmed.includes(" ") || (trimmed.split(" ").length <= 3 && !trimmed.includes("."))) {
      return trimmed;
    }
  }
  return null;
}

function buildSignalExtractionPrompt(
  transcript: string,
  toolData: ProfileToolData,
  writingSamples: string[],
): string {
  return `You are extracting durable writing-voice signals for a LinkedIn ghostwriting engine.

Your job is to separate stable voice rules from vague adjectives. Prefer concrete observations the model can act on.

WEIGHTING RULES:
- Weight finished written posts much more heavily than transcript for punctuation, formatting, spacing, paragraph density, hooks, and CTA patterns.
- Weight transcript heavily for vocabulary, phrasing, personality, audience, and what the user dislikes.
- If evidence is weak, say so with low confidence instead of inventing a strong rule.

AI INTERVIEWER SUMMARY:
${toolData.summary}
Confidence level reported by interviewer: ${toolData.confidence}

TRANSCRIPT:
${transcript}
${writingSamples.length > 0 ? `
WRITING SAMPLES:
${writingSamples.map((sample, index) => `--- SAMPLE ${index + 1} ---\n${sample}`).join("\n\n")}` : ""}

Respond ONLY with valid JSON matching this exact shape:
{
  "tone_summary": string,
  "audience_and_intent": string,
  "personality_traits": string[],
  "signature_phrases": string[],
  "avoid_phrases": string[],
  "formality": "casual" | "balanced" | "formal",
  "formatting_preferences": {
    "uses_emojis": boolean,
    "line_break_style": "dense" | "spaced" | "mixed",
    "uses_hashtags": boolean,
    "hashtag_count": number
  },
  "sentence_style_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "vocabulary_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "punctuation_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "structure_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "hook_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "cta_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "formatting_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "anti_pattern_observations": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }]
}`;
}

function buildCoreProfilePrompt(extraction: VoiceSignalExtraction): string {
  return `You are synthesizing a generation-ready LinkedIn voice profile.

Convert the extracted signals into a compact, concrete core voice profile that a ghostwriting model can actually follow.

RULES:
- Be specific and actionable. Prefer rules like sentence rhythm, hook style, paragraph spacing, vocabulary habits, and words/tones to avoid.
- Keep rules concrete enough for another model to execute.
- Preserve uncertainty by lowering confidence instead of overcommitting.
- Signature phrases should only include phrases the user genuinely seems to use.
- Avoid phrases should include both user dislikes and generic LinkedIn filler that clearly clashes with this voice.

EXTRACTED SIGNALS JSON:
${JSON.stringify(extraction, null, 2)}

Respond ONLY with valid JSON matching this exact schema:
{
  "tone_summary": string,
  "audience_and_intent": string,
  "sentence_style_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "vocabulary_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "punctuation_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "structure_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "hook_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "cta_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "formatting_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "anti_pattern_rules": [{ "rule": string, "confidence": "high" | "medium" | "low", "evidence": string }],
  "personality_traits": string[],
  "signature_phrases": string[],
  "avoid_phrases": string[],
  "formality": "casual" | "balanced" | "formal",
  "formatting_preferences": {
    "uses_emojis": boolean,
    "line_break_style": "dense" | "spaced" | "mixed",
    "uses_hashtags": boolean,
    "hashtag_count": number
  }
}`;
}

function buildVoiceProfileRecord(args: {
  userId: string;
  coreProfile: CoreVoiceProfile;
  writingSamples: string[];
  transcript: TranscriptMessage[];
  toolData: ProfileToolData;
  analysisOutput: VoiceSignalExtraction;
}): Omit<VoiceProfile, "id" | "created_at" | "updated_at"> {
  const exemplars = args.writingSamples
    .slice(0, 5)
    .map((sample) => createExemplar(sample, "user_post", { quality_score: 98, usage_note: "Onboarding writing sample" }));
  const legacyFields = deriveLegacyFieldsFromCore(args.coreProfile);

  const baseProfile = {
    user_id: args.userId,
    name: "Default",
    is_active: true,
    tone_description: legacyFields.tone_description,
    formality: legacyFields.formality,
    personality_traits: legacyFields.personality_traits,
    signature_phrases: legacyFields.signature_phrases,
    avoid_phrases: legacyFields.avoid_phrases,
    formatting_preferences: legacyFields.formatting_preferences,
    sample_posts: exemplars.map((exemplar) => exemplar.text),
    system_prompt: null,
    voice_profile_version: "v2" as const,
    core_voice_profile: args.coreProfile,
    exemplar_posts: exemplars,
    learned_preferences: [],
    generation_instruction_pack: null,
    profile_stats: {
      onboarding_sample_count: args.writingSamples.length,
      user_post_count: exemplars.length,
      approved_post_count: 0,
      edited_post_count: 0,
      last_distilled_at: new Date().toISOString(),
    },
    onboarding_answers: {
      format: args.writingSamples.length > 0 ? "conversation_v4_voice_engine" : "conversation_v4_text",
      transcript: args.transcript,
      tool_data: args.toolData,
      analysis_output: args.analysisOutput,
      writing_samples: args.writingSamples,
    },
  } satisfies Omit<VoiceProfile, "id" | "created_at" | "updated_at">;

  const generationInstructionPack = compileGenerationInstructionPack({
    id: "pending",
    ...baseProfile,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return {
    ...baseProfile,
    generation_instruction_pack: generationInstructionPack,
    system_prompt: generationInstructionPack,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, toolData, userId, writingSamples: externalSamples, sessionId } = body as {
      transcript: TranscriptMessage[];
      toolData: ProfileToolData;
      userId: string;
      writingSamples?: string[];
      sessionId?: string;
    };

    if (!transcript || !userId || !toolData) {
      return NextResponse.json({ error: "Missing transcript, toolData, or userId" }, { status: 400 });
    }

    const isVoiceOnboarding = Array.isArray(externalSamples);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const formattedTranscript = formatTranscript(transcript);
    const transcriptSamples = extractWritingSamples(transcript);
    const writingSamples = isVoiceOnboarding && externalSamples && externalSamples.length > 0 ? externalSamples : transcriptSamples;

    const { text: extractionJson } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: buildSignalExtractionPrompt(formattedTranscript, toolData, writingSamples),
      temperature: 0.2,
    });
    const extractedSignals = parseModelJson<VoiceSignalExtraction>(extractionJson);

    const { text: coreProfileJson } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: buildCoreProfilePrompt(extractedSignals),
      temperature: 0.3,
    });
    const coreProfile = normalizeCoreVoiceProfile(parseModelJson<CoreVoiceProfile>(coreProfileJson));

    const voiceProfileRecord = buildVoiceProfileRecord({
      userId,
      coreProfile,
      writingSamples,
      transcript,
      toolData,
      analysisOutput: extractedSignals,
    });

    const extractedName = extractName(transcript);

    await supabase.from("voice_profiles").update({ is_active: false, updated_at: new Date().toISOString() }).eq("user_id", userId);

    const { data: voiceProfile, error: insertError } = await supabase
      .from("voice_profiles")
      .insert(voiceProfileRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert voice profile:", insertError);
      return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 });
    }

    const profileUpdate: Record<string, unknown> = {
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    };
    if (extractedName) {
      profileUpdate.display_name = extractedName;
    }

    await supabase.from("user_profiles").update(profileUpdate).eq("id", userId);

    if (sessionId) {
      await supabase
        .from("onboarding_sessions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", userId);
    }

    const samplePostPrompt = [
      buildExemplarPrompt(voiceProfile as VoiceProfile),
      `<task>\nWrite only the first 2-3 sentences of a LinkedIn post in this person's voice. Pick a topic that fits their actual audience and experience. Output only the opening hook, nothing else.\n</task>`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { text: samplePost } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: voiceProfileRecord.generation_instruction_pack || voiceProfileRecord.system_prompt || undefined,
      prompt: samplePostPrompt,
      temperature: 0.7,
    });

    return NextResponse.json({
      voice_profile: voiceProfile,
      sample_post_opening: samplePost.trim(),
    });
  } catch (error) {
    console.error("Onboarding analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
