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

  const { data, error: dbError } = await supabase
    .from("user_profiles")
    .select("brand_guidelines")
    .eq("id", user.id)
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { brand_guidelines: data?.brand_guidelines ?? null },
    { headers: corsHeaders }
  );
}

export async function PUT(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await request.json();
  const raw = body.brand_guidelines;

  // Trim and nullify empty input
  const brand_guidelines =
    typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;

  const { error: dbError } = await supabase
    .from("user_profiles")
    .update({ brand_guidelines })
    .eq("id", user.id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json({ brand_guidelines }, { headers: corsHeaders });
}
