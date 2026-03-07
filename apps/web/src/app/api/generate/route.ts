import { streamText, StreamData } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import { buildSystemPrompt, buildUserPrompt, buildLearningContext } from "@/lib/ai/prompts";
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
  const { topic, voice_profile_id } = body;

  if (!topic) {
    return new Response(JSON.stringify({ error: "Topic is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch voice profile
  const { data, error: vpError } = voice_profile_id
    ? await supabase
        .from("voice_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", voice_profile_id)
        .single()
    : await supabase
        .from("voice_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

  const voiceProfile = data as VoiceProfile | null;

  if (vpError || !voiceProfile) {
    return new Response(
      JSON.stringify({ error: "No voice profile found. Complete onboarding first." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Fetch brand guidelines from user profile
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("brand_guidelines")
    .eq("id", user.id)
    .single();

  // Fetch recent interactions for progressive learning context
  const { data: interactions } = await supabase
    .from("post_interactions")
    .select("*")
    .eq("voice_profile_id", voiceProfile.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const learningContext = buildLearningContext((interactions as PostInteraction[]) || []);
  const systemPrompt = buildSystemPrompt(voiceProfile, userProfile?.brand_guidelines);
  const userPrompt = buildUserPrompt(topic, voiceProfile, learningContext);

  // StreamData lets us send the saved post's ID back to the client
  const streamData = new StreamData();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    onFinish: async ({ text, usage }) => {
      const { data: post } = await supabase
        .from("generated_posts")
        .insert({
          user_id: user.id,
          voice_profile_id: voiceProfile.id,
          user_input: topic,
          generated_text: text,
          model_used: "claude-sonnet-4-6",
          tokens_used: usage?.totalTokens ?? null,
        })
        .select("id")
        .single();

      if (post) {
        streamData.append({ postId: post.id });
      }
      streamData.close();
    },
  });

  const response = result.toDataStreamResponse({ data: streamData });

  // Add CORS headers to the streaming response
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
