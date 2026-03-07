import { streamText, StreamData } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import { buildSystemPrompt, buildFeedbackPrompt, buildLearningContext } from "@/lib/ai/prompts";
import { extractPreferenceSignals, normalizeVoiceProfile, refreshVoiceProfile } from "@/lib/ai/voice-engine";
import type { VoiceProfile, PostInteraction } from "@linkedin-agent/shared";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return new Response(JSON.stringify({ error: error || "Not authenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { generated_post_id, feedback, current_text, topic } = body as {
    generated_post_id: string;
    feedback: string;
    current_text: string;
    topic: string;
  };

  if (!generated_post_id || !feedback || !current_text || !topic) {
    return new Response(
      JSON.stringify({ error: "generated_post_id, feedback, current_text, and topic are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: post } = await supabase
    .from("generated_posts")
    .select("voice_profile_id")
    .eq("id", generated_post_id)
    .eq("user_id", user.id)
    .single();

  if (!post) {
    return new Response(JSON.stringify({ error: "Post not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: voiceProfileData } = post.voice_profile_id
    ? await supabase.from("voice_profiles").select("*").eq("id", post.voice_profile_id).single()
    : await supabase.from("voice_profiles").select("*").eq("user_id", user.id).eq("is_active", true).single();

  const voiceProfile = voiceProfileData as VoiceProfile | null;

  if (!voiceProfile) {
    return new Response(JSON.stringify({ error: "Voice profile not found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const normalizedProfile = normalizeVoiceProfile(voiceProfile);

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("brand_guidelines")
    .eq("id", user.id)
    .single();

  const { count: revisionCount } = await supabase
    .from("post_interactions")
    .select("*", { count: "exact", head: true })
    .eq("generated_post_id", generated_post_id)
    .eq("interaction_type", "feedback");

  const { data: interactions } = await supabase
    .from("post_interactions")
    .select("*")
    .eq("voice_profile_id", normalizedProfile.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const learningContext = buildLearningContext((interactions as PostInteraction[]) || []);
  const systemPrompt = buildSystemPrompt(normalizedProfile, userProfile?.brand_guidelines);
  const userPrompt = learningContext
    ? `${learningContext}\n\n${buildFeedbackPrompt(current_text, feedback, topic)}`
    : buildFeedbackPrompt(current_text, feedback, topic);

  const streamData = new StreamData();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    onFinish: async ({ text }) => {
      const interactionSignals = extractPreferenceSignals({
        source: "feedback",
        feedbackText: feedback,
        originalText: current_text,
        finalText: text,
      });

      await supabase.from("post_interactions").insert({
        user_id: user.id,
        generated_post_id,
        voice_profile_id: normalizedProfile.id,
        interaction_type: "feedback",
        original_text: current_text,
        feedback_text: feedback,
        final_text: text,
        revision_count: (revisionCount ?? 0) + 1,
        interaction_signals: interactionSignals,
      });

      if (interactionSignals.length > 0) {
        const profileUpdates = refreshVoiceProfile(normalizedProfile, {
          appendedSignals: interactionSignals,
        });

        await supabase.from("voice_profiles").update(profileUpdates).eq("id", normalizedProfile.id);
      }

      await supabase
        .from("generated_posts")
        .update({ status: "revised", generated_text: text })
        .eq("id", generated_post_id);

      streamData.close();
    },
  });

  const response = result.toDataStreamResponse({ data: streamData });

  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, { status: response.status, headers });
}
