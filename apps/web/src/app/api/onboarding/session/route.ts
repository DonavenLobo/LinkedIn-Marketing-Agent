import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import type { OnboardingSession, TranscriptMessage, ProfileToolData } from "@linkedin-agent/shared";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** GET — load existing in_progress session or create a new one */
export async function GET(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  // Look for an existing in_progress session
  const { data: existing } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ session: existing as OnboardingSession, isResuming: true }, { headers: corsHeaders });
  }

  // Create a new session
  const { data: created, error: createError } = await supabase
    .from("onboarding_sessions")
    .insert({ user_id: user.id })
    .select()
    .single();

  if (createError || !created) {
    console.error("Failed to create onboarding session:", createError);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ session: created as OnboardingSession, isResuming: false }, { headers: corsHeaders });
}

/** PATCH — update transcript, turn_count, tool_data, mode, writing_samples */
export async function PATCH(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json() as {
    sessionId: string;
    transcript?: TranscriptMessage[];
    turn_count?: number;
    tool_data?: ProfileToolData;
    mode?: "voice" | "text";
    writing_samples?: string[];
    linkedin_import?: Record<string, unknown>;
  };

  const { sessionId, ...fields } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers: corsHeaders });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.transcript !== undefined) updatePayload.transcript = fields.transcript;
  if (fields.turn_count !== undefined) updatePayload.turn_count = fields.turn_count;
  if (fields.tool_data !== undefined) updatePayload.tool_data = fields.tool_data;
  if (fields.mode !== undefined) updatePayload.mode = fields.mode;
  if (fields.writing_samples !== undefined) updatePayload.writing_samples = fields.writing_samples;
  if (fields.linkedin_import !== undefined) updatePayload.linkedin_import = fields.linkedin_import;

  const { data, error: updateError } = await supabase
    .from("onboarding_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    console.error("Failed to update onboarding session:", updateError);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ session: data as OnboardingSession }, { headers: corsHeaders });
}

/** DELETE — mark session abandoned (Start Over) */
export async function DELETE(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json() as { sessionId: string };

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400, headers: corsHeaders });
  }

  const { error: updateError } = await supabase
    .from("onboarding_sessions")
    .update({ status: "abandoned", updated_at: new Date().toISOString() })
    .eq("id", body.sessionId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to abandon onboarding session:", updateError);
    return NextResponse.json({ error: "Failed to abandon session" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
