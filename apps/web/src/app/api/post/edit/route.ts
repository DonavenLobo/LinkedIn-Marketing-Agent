import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
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
      { status: 400, headers: corsHeaders }
    );
  }

  // Fetch the post to get voice_profile_id
  const { data: post, error: postError } = await supabase
    .from("generated_posts")
    .select("voice_profile_id")
    .eq("id", generated_post_id)
    .eq("user_id", user.id)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  // Insert the edit interaction
  const { data: interaction, error: insertError } = await supabase
    .from("post_interactions")
    .insert({
      user_id: user.id,
      generated_post_id,
      voice_profile_id: post.voice_profile_id,
      interaction_type: "edit",
      original_text,
      final_text: edited_text,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to save edit" },
      { status: 500, headers: corsHeaders }
    );
  }

  // Update the post text but leave status as-is — user must explicitly approve
  await supabase
    .from("generated_posts")
    .update({ generated_text: edited_text })
    .eq("id", generated_post_id);

  return NextResponse.json({ interaction }, { headers: corsHeaders });
}
