"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { AuthShell } from "@/components/layout/AuthShell";

type Provider = "google" | "linkedin_oidc";

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: Provider) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const supabase = createSupabaseBrowser();
      const params = new URLSearchParams(window.location.search);
      const fromExtension = params.get("from") === "extension";

      const redirectTo = fromExtension
        ? `${window.location.origin}/auth/extension-done`
        : `${window.location.origin}/auth/callback`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoadingProvider(null);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoadingProvider(null);
    }
  };

  const isLoading = loadingProvider !== null;

  return (
    <AuthShell>
      <div className="rounded-md border border-border bg-surface p-8 shadow-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl text-ink">LinkedIn Agent</h1>
          <p className="mt-2 text-sm text-ink-muted">
            AI-powered LinkedIn posts in your voice
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* LinkedIn sign-in */}
          <button
            onClick={() => handleOAuthLogin("linkedin_oidc")}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingProvider === "linkedin_oidc" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            )}
            {loadingProvider === "linkedin_oidc" ? "Redirecting..." : "Sign in with LinkedIn"}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-ink-muted">or</span>
            </div>
          </div>

          {/* Google sign-in */}
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-ink shadow-sm transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingProvider === "google" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink-muted border-t-ink" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {loadingProvider === "google" ? "Redirecting..." : "Sign in with Google"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </AuthShell>
  );
}
