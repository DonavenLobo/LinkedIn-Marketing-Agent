import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, corsHeaders } from "@/lib/auth";

const feedbackSchema = z.object({
  onboarding_rating: z.enum(["bad", "okay", "good"]),
  generated_posts_rating: z.enum(["bad", "okay", "good"]),
  would_use_if_resolved_rating: z.enum(["not_really", "maybe", "absolutely"]),
  notes: z.string().max(2000).optional(),
});

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback payload" },
      { status: 400, headers: corsHeaders }
    );
  }

  const notes = parsed.data.notes?.trim();

  const { error: insertError } = await supabase.from("product_feedback").insert({
    user_id: user.id,
    onboarding_rating: parsed.data.onboarding_rating,
    generated_posts_rating: parsed.data.generated_posts_rating,
    would_use_if_resolved_rating: parsed.data.would_use_if_resolved_rating,
    notes: notes && notes.length > 0 ? notes : null,
    source: "web_create_dropdown",
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
