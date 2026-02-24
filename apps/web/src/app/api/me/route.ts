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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: voiceProfile } = await supabase
    .from("voice_profiles")
    .select("id, name, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        onboarding_complete: profile?.onboarding_complete ?? false,
      },
      voice_profile: voiceProfile ?? null,
    },
    { headers: corsHeaders }
  );
}
