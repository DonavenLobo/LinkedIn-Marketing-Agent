import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { refresh_token } = await request.json();

  if (!refresh_token) {
    return NextResponse.json(
      { error: "Missing refresh_token" },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error || !data.session) {
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 401, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    { headers: corsHeaders }
  );
}
