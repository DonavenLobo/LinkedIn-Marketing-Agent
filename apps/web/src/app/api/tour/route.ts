import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";

const VALID_FLAGS = [
  "tour_create_seen",
  "tour_post_review_seen",
  "tour_toggle_seen",
  "tour_sidebar_seen",
  "tour_ext_post_review_seen",
] as const;

type TourFlag = (typeof VALID_FLAGS)[number];

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await request.json();
  const flag = body.flag as string;

  if (!VALID_FLAGS.includes(flag as TourFlag)) {
    return NextResponse.json(
      { error: `Invalid tour flag. Valid flags: ${VALID_FLAGS.join(", ")}` },
      { status: 400, headers: corsHeaders }
    );
  }

  const { error: dbError } = await supabase
    .from("user_profiles")
    .update({ [flag]: true })
    .eq("id", user.id);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to update tour flag" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json({ [flag]: true }, { headers: corsHeaders });
}
