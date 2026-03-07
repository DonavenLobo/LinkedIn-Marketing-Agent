import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAuthUser } from "@/lib/auth";
import type { CoreVoiceProfile, VoiceProfile } from "@linkedin-agent/shared";
import { compileGenerationInstructionPack, createExemplar, deriveLegacyFieldsFromCore, normalizeCoreVoiceProfile, normalizeVoiceProfile, parseModelJson, refreshVoiceProfile } from "@/lib/ai/voice-engine";

function splitPosts(raw: string): string[] {
  return raw
    .split(/(?:\n\s*\n|^---+\s*$)/gm)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function buildPostsRefinementPrompt(existingProfile: VoiceProfile | null, posts: string[]): string {
  const existingCore = existingProfile ? normalizeVoiceProfile(existingProfile).core_voice_profile : null;

  return `You are refining a LinkedIn writing voice profile using real user-authored posts.

RULES:
- Prioritize the writing in RECENT_POSTS over earlier assumptions when there is a clear conflict.
- Extract concrete rules, not generic adjectives.
- Preserve stable voice traits unless the new posts clearly show otherwise.
- Signature phrases should be phrases the user actually seems to use.
- Avoid phrases should include tones or cliches that would feel wrong for this writer.

${existingCore ? `CURRENT_CORE_PROFILE:\n${JSON.stringify(existingCore, null, 2)}\n` : "NO CURRENT PROFILE EXISTS YET. Build the initial core profile from these posts.\n"}
RECENT_POSTS:
${posts.map((post, index) => `POST ${index + 1}:\n${post}`).join("\n\n")}

Respond ONLY with valid JSON matching this schema:
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

export async function POST(request: Request) {
  try {
    const { user, supabase, error } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: error || "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { posts?: string } | null;
    const postsRaw = (body?.posts || "").trim();

    if (!postsRaw || postsRaw.length < 50) {
      return new Response(null, { status: 204 });
    }

    const posts = splitPosts(postsRaw).slice(0, 15);
    if (posts.length === 0) {
      return new Response(null, { status: 204 });
    }

    const { data: existingProfileData, error: vpError } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (vpError) {
      console.error("Failed to load existing voice profile:", vpError);
    }

    const existingProfile = existingProfileData as VoiceProfile | null;

    const { text: refinedJson } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      temperature: 0.3,
      prompt: buildPostsRefinementPrompt(existingProfile, posts),
    });

    const coreProfile = normalizeCoreVoiceProfile(parseModelJson<CoreVoiceProfile>(refinedJson));
    const legacyFields = deriveLegacyFieldsFromCore(coreProfile);
    const newExemplars = posts.map((post) => createExemplar(post, "user_post", { quality_score: 98, usage_note: "Imported user-authored post" }));

    if (existingProfile) {
      const normalized = normalizeVoiceProfile(existingProfile);
      const refreshed = refreshVoiceProfile(
        {
          ...normalized,
          core_voice_profile: coreProfile,
          tone_description: legacyFields.tone_description,
          formality: legacyFields.formality,
          personality_traits: legacyFields.personality_traits,
          signature_phrases: legacyFields.signature_phrases,
          avoid_phrases: legacyFields.avoid_phrases,
          formatting_preferences: legacyFields.formatting_preferences,
        },
        {
          appendedExemplars: newExemplars,
          statsDelta: { user_post_count: newExemplars.length },
        },
      );

      const generationInstructionPack = refreshed.generation_instruction_pack || compileGenerationInstructionPack({
        ...normalized,
        core_voice_profile: coreProfile,
        tone_description: legacyFields.tone_description,
        formality: legacyFields.formality,
        personality_traits: legacyFields.personality_traits,
        signature_phrases: legacyFields.signature_phrases,
        avoid_phrases: legacyFields.avoid_phrases,
        formatting_preferences: legacyFields.formatting_preferences,
      });

      const { error: updateError } = await supabase
        .from("voice_profiles")
        .update({
          voice_profile_version: "v2",
          core_voice_profile: coreProfile,
          tone_description: legacyFields.tone_description,
          formality: legacyFields.formality,
          personality_traits: legacyFields.personality_traits,
          signature_phrases: legacyFields.signature_phrases,
          avoid_phrases: legacyFields.avoid_phrases,
          formatting_preferences: legacyFields.formatting_preferences,
          generation_instruction_pack: generationInstructionPack,
          system_prompt: generationInstructionPack,
          ...refreshed,
          onboarding_answers: {
            ...(normalized.onboarding_answers || {}),
            last_posts_refinement: {
              posts,
              refined_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("Failed to update voice profile with posts:", updateError);
        return NextResponse.json({ error: "Failed to update voice profile" }, { status: 500 });
      }
    } else {
      const baseProfile = {
        user_id: user.id,
        name: "Default",
        is_active: true,
        tone_description: legacyFields.tone_description,
        formality: legacyFields.formality,
        personality_traits: legacyFields.personality_traits,
        signature_phrases: legacyFields.signature_phrases,
        avoid_phrases: legacyFields.avoid_phrases,
        formatting_preferences: legacyFields.formatting_preferences,
        sample_posts: posts,
        system_prompt: null,
        voice_profile_version: "v2" as const,
        core_voice_profile: coreProfile,
        exemplar_posts: newExemplars,
        learned_preferences: [],
        generation_instruction_pack: null,
        profile_stats: {
          onboarding_sample_count: posts.length,
          user_post_count: newExemplars.length,
          approved_post_count: 0,
          edited_post_count: 0,
          last_distilled_at: new Date().toISOString(),
        },
        onboarding_answers: {
          format: "pasted_posts_v2",
          writing_samples: posts,
        },
      } satisfies Omit<VoiceProfile, "id" | "created_at" | "updated_at">;

      const generationInstructionPack = compileGenerationInstructionPack({
        id: "pending",
        ...baseProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { error: insertError } = await supabase.from("voice_profiles").insert({
        ...baseProfile,
        generation_instruction_pack: generationInstructionPack,
        system_prompt: generationInstructionPack,
      });

      if (insertError) {
        console.error("Failed to insert voice profile from posts:", insertError);
        return NextResponse.json({ error: "Failed to save voice profile from posts" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("onboarding/posts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
