import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@linkedin-agent/shared";

/**
 * Dual-mode auth helper for API routes.
 * - Cookie-based auth (web app requests)
 * - Bearer token auth (extension requests)
 */
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    // Extension auth: use the access token directly
    const token = authHeader.slice(7);
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, supabase, error: error?.message || "Invalid token" };
    }

    return { user, supabase, error: null };
  }

  // Web app auth: use cookie-based session
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, error: error?.message || "Not authenticated" };
  }

  return { user, supabase, error: null };
}

/** Standard CORS headers for API routes accessed by the extension */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
