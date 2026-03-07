import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import { createExemplar, extractPreferenceSignals, normalizeVoiceProfile, refreshVoiceProfile } from "@/lib/ai/voice-engine";
import type { VoiceProfile } from "@linkedin-agent/shared";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: error || "Not authenticated" }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json();
  const { generated_post_id, original_text, edited_text } = body as {
    generated_post_id: string;
    original_text: string;
    edited_text: string;
  };

  if (!generated_post_id || !original_text || !edited_text) {
    return NextResponse.json(
      { error: "generated_post_id, original_text, and edited_text are required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: post, error: postError } = await supabase
    .from("generated_posts")
    .select("voice_profile_id, user_input")
    .eq("id", generated_post_id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404, headers: corsHeaders });
  }

  const { data: voiceProfileData } = post.voice_profile_id
    ? await supabase.from("voice_profiles").select("*").eq("id", post.voice_profile_id).single()
    : await supabase.from("voice_profiles").select("*").eq("user_id", user.id).eq("is_active", true).single();

  const voiceProfile = voiceProfileData as VoiceProfile | null;
  if (!voiceProfile) {
    return NextResponse.json({ error: "Voice profile not found" }, { status: 400, headers: corsHeaders });
  }

  const normalizedProfile = normalizeVoiceProfile(voiceProfile);
  const interactionSignals = extractPreferenceSignals({
    source: "edit",
    originalText: original_text,
    finalText: edited_text,
  });

  const { data: interaction, error: insertError } = await supabase
    .from("post_interactions")
    .insert({
      user_id: user.id,
      generated_post_id,
      voice_profile_id: post.voice_profile_id,
      interaction_type: "edit",
      original_text,
      final_text: edited_text,
      interaction_signals: interactionSignals,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to save edit" }, { status: 500, headers: corsHeaders });
  }

  const exemplar = createExemplar(edited_text, "edited_post", {
    topic: post.user_input,
    usage_note: "User manually edited this draft",
    quality_score: 96,
  });
  const profileUpdates = refreshVoiceProfile(normalizedProfile, {
    appendedSignals: interactionSignals,
    appendedExemplars: [exemplar],
    statsDelta: { edited_post_count: 1 },
  });

  await supabase.from("voice_profiles").update(profileUpdates).eq("id", normalizedProfile.id);

  await supabase.from("generated_posts").update({ generated_text: edited_text }).eq("id", generated_post_id);

  return NextResponse.json({ interaction }, { headers: corsHeaders });
}
