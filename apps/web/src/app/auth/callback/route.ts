import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if onboarding is complete
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        if (profile?.onboarding_complete) {
          return NextResponse.redirect(`${origin}/create`);
        }
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
