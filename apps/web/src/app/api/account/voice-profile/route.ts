import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  const { data: voiceProfile, error: vpError } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (vpError || !voiceProfile) {
    return NextResponse.json(
      { voice_profile: null },
      { headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { voice_profile: voiceProfile },
    { headers: corsHeaders }
  );
}
