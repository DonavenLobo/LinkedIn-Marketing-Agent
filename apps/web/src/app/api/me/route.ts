import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: voiceProfile, error: vpError } = await supabase
    .from("voice_profiles")
    .select("id, name, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  console.log("[/api/me]", {
    userId: user.id,
    profileError: profileError?.message,
    onboarding_complete: profile?.onboarding_complete,
    vpError: vpError?.message,
    hasVoiceProfile: !!voiceProfile,
  });

  // Onboarding is complete if the flag is set OR a voice profile already exists
  const onboardingComplete = profile?.onboarding_complete === true || !!voiceProfile;
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    profile?.display_name ??
    undefined;

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: profile?.avatar_url,
        onboarding_complete: onboardingComplete,
        has_brand_guidelines: !!profile?.brand_guidelines,
        tour_create_seen: profile?.tour_create_seen ?? false,
        tour_post_review_seen: profile?.tour_post_review_seen ?? false,
        tour_toggle_seen: profile?.tour_toggle_seen ?? false,
        tour_sidebar_seen: profile?.tour_sidebar_seen ?? false,
        tour_ext_post_review_seen: profile?.tour_ext_post_review_seen ?? false,
      },
      voice_profile: voiceProfile ?? null,
    },
    { headers: corsHeaders }
  );
}
