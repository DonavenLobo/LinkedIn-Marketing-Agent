import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAuthUser } from "@/lib/auth";

function splitPosts(raw: string): string[] {
  return raw
    .split(/(?:\n\s*\n|^---+\s*$)/gm)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

export async function POST(request: Request) {
  try {
    const { user, supabase, error } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { error: error || "Not authenticated" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { posts?: string }
      | null;
    const postsRaw = (body?.posts || "").trim();

    if (!postsRaw || postsRaw.length < 50) {
      // Not enough signal to be useful – treat as no-op but allow redirect.
      return new Response(null, { status: 204 });
    }

    const posts = splitPosts(postsRaw).slice(0, 15);

    if (posts.length === 0) {
      return new Response(null, { status: 204 });
    }

    const { data: existingProfile, error: vpError } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (vpError) {
      console.error("Failed to load existing voice profile:", vpError);
    }

    const profileJson = existingProfile
      ? JSON.stringify({
          tone_description: existingProfile.tone_description,
          formality: existingProfile.formality,
          personality_traits: existingProfile.personality_traits,
          signature_phrases: existingProfile.signature_phrases,
          avoid_phrases: existingProfile.avoid_phrases,
          formatting_preferences: existingProfile.formatting_preferences,
        })
      : "{}";

    const { text: refinedJson } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      temperature: 0.3,
      prompt: `You are refining a LinkedIn writing voice profile using fresh real posts.\n\nEXISTING_PROFILE_JSON (may be empty):\n${profileJson}\n\nRECENT_POSTS:\n${posts
        .map((p, i) => `POST ${i + 1}:\n${p}`)
        .join("\n\n")}\n\nTASK:\n- Merge the signal from RECENT_POSTS into the EXISTING_PROFILE_JSON.\n- Preserve what is already working unless the new posts clearly show a different pattern.\n- Update or extend:\n  - tone_description (2-3 sentences)\n  - formality (one of: \"casual\" | \"balanced\" | \"formal\")\n  - personality_traits (up to 5 short traits)\n  - signature_phrases (add phrases that recur across posts)\n  - avoid_phrases (add phrases and tones that would feel wrong for these posts)\n  - formatting_preferences (uses_emojis, line_break_style, uses_hashtags, hashtag_count)\n- Respond ONLY with valid JSON in this exact schema:\n{\n  \"tone_description\": string,\n  \"formality\": \"casual\" | \"balanced\" | \"formal\",\n  \"personality_traits\": string[],\n  \"signature_phrases\": string[],\n  \"avoid_phrases\": string[],\n  \"formatting_preferences\": {\n    \"uses_emojis\": boolean,\n    \"line_break_style\": \"dense\" | \"spaced\" | \"mixed\",\n    \"uses_hashtags\": boolean,\n    \"hashtag_count\": number\n  }\n}`,
    });

    let voiceData: {
      tone_description?: string;
      formality?: string;
      personality_traits?: string[];
      signature_phrases?: string[];
      avoid_phrases?: string[];
      formatting_preferences?: Record<string, unknown>;
    };

    try {
      const cleaned = refinedJson
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      voiceData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse refined voice JSON:", refinedJson, parseError);
      return NextResponse.json(
        { error: "Failed to refine voice profile" },
        { status: 500 },
      );
    }

    // Fall back to existing values when model omits fields.
    const merged = {
      tone_description:
        voiceData.tone_description || existingProfile?.tone_description,
      formality: voiceData.formality || existingProfile?.formality || "balanced",
      personality_traits:
        voiceData.personality_traits || existingProfile?.personality_traits || [],
      signature_phrases:
        voiceData.signature_phrases || existingProfile?.signature_phrases || [],
      avoid_phrases:
        voiceData.avoid_phrases || existingProfile?.avoid_phrases || [],
      formatting_preferences:
        voiceData.formatting_preferences ||
        existingProfile?.formatting_preferences ||
        {},
    };

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from("voice_profiles")
        .update({
          tone_description: merged.tone_description,
          formality: merged.formality,
          personality_traits: merged.personality_traits,
          signature_phrases: merged.signature_phrases,
          avoid_phrases: merged.avoid_phrases,
          formatting_preferences: merged.formatting_preferences,
          // keep existing sample_posts but append recent ones lightly
          sample_posts: [
            ...(existingProfile.sample_posts || []),
            ...posts,
          ].slice(0, 25),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("Failed to update voice profile with posts:", updateError);
        return NextResponse.json(
          { error: "Failed to update voice profile" },
          { status: 500 },
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("voice_profiles")
        .insert({
          user_id: user.id,
          name: "Default",
          is_active: true,
          tone_description: merged.tone_description,
          formality: merged.formality,
          personality_traits: merged.personality_traits,
          signature_phrases: merged.signature_phrases,
          avoid_phrases: merged.avoid_phrases,
          formatting_preferences: merged.formatting_preferences,
          sample_posts: posts,
          system_prompt: null,
          onboarding_answers: {
            format: "pasted_posts",
          },
        });

      if (insertError) {
        console.error("Failed to insert voice profile from posts:", insertError);
        return NextResponse.json(
          { error: "Failed to save voice profile from posts" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("onboarding/posts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

