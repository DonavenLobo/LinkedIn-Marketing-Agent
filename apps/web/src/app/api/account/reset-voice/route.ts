import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * DELETE: Permanently remove voice profile(s) and reset onboarding.
 * Used when user chooses "Completely reframe" in the redo flow.
 */
export async function DELETE(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  // Delete all voice profiles for this user
  const { error: deleteError } = await supabase
    .from("voice_profiles")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Failed to delete voice profiles:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete voice profile" },
      { status: 500, headers: corsHeaders }
    );
  }

  // Reset onboarding_complete on user_profiles
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      onboarding_complete: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("Failed to reset onboarding:", profileError);
    return NextResponse.json(
      { error: "Failed to reset onboarding" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { success: true },
    { headers: corsHeaders }
  );
}
