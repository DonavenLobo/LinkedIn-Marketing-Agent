import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type AuthResult =
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: SupabaseClient; error: string };

/**
 * Dual-mode auth helper for API routes.
 * - Cookie-based auth (web app requests)
 * - Bearer token auth (extension requests)
 */
export async function getAuthUser(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // Pass the token as a global Authorization header so RLS sees auth.uid() correctly
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
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
  const supabase = (await createSupabaseServer()) as unknown as SupabaseClient;
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
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
