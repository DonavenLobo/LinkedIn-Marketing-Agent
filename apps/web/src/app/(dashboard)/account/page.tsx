"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { VoiceProfile } from "@linkedin-agent/shared";
import { VoiceProfileCard } from "@/components/account/voice-profile-card";

export default function AccountPage() {
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/account/voice-profile", {
        credentials: "include",
      });
      const data = await res.json();
      setVoiceProfile(data.voice_profile ?? null);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded bg-surface-muted" />
          <div className="h-64 rounded-xl bg-surface-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight text-ink">Account</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage your profile and inspect the extracted voice engine.</p>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Your Voice</h2>
            <p className="mt-1 text-sm text-ink-muted">
              See the concrete rules, learned defaults, and exemplar posts that shape generation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/onboarding?redo=1")}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/30 hover:bg-accent-light"
          >
            Rebuild voice profile
          </button>
        </div>

        {voiceProfile ? (
          <VoiceProfileCard profile={voiceProfile} />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-ink-muted">No voice profile yet. Complete onboarding to get started.</p>
            <a
              href="/onboarding"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Complete onboarding
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
