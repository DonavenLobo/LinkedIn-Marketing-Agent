import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options as Record<string, unknown>)
            );
          },
        },
      }
    );

    // Refresh the session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users to login (except public routes)
    const isPublicRoute =
      request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname.startsWith("/auth") ||
      request.nextUrl.pathname === "/privacy";

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users who haven't onboarded
    if (
      user &&
      !request.nextUrl.pathname.startsWith("/onboarding") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      request.nextUrl.pathname !== "/"
    ) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();

      if (profile && !profile.onboarding_complete) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  } catch (e) {
    // If middleware fails (e.g., DB not set up yet), let the request through
    console.error("Middleware error:", e);
  }

  return supabaseResponse;
}
