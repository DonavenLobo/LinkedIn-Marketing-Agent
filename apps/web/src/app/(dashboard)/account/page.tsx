"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { VoiceProfileCard } from "@/components/account/voice-profile-card";

interface VoiceProfile {
  id: string;
  tone_description: string | null;
  formality: string | null;
  personality_traits: string[] | null;
  signature_phrases: string[] | null;
  avoid_phrases: string[] | null;
  sample_posts: string[] | null;
}

export default function AccountPage() {
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const res = await fetch("/api/account/voice-profile", {
        credentials: "include",
      });
      const data = await res.json();
      setVoiceProfile(data.voice_profile ?? null);
      setLoading(false);
    }
    load();
  }, []);

  const handleRedoSuccess = async () => {
    const res = await fetch("/api/account/voice-profile", {
      credentials: "include",
    });
    const data = await res.json();
    setVoiceProfile(data.voice_profile ?? null);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-muted rounded" />
          <div className="h-32 bg-surface-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl text-ink tracking-tight">
        Account
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Manage your profile and voice settings
      </p>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Your Voice</h2>
          <button
            type="button"
            onClick={() => router.push("/onboarding?redo=1")}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-accent hover:bg-accent-light hover:border-accent/30 transition"
          >
            Rebuild voice profile
          </button>
        </div>

        {voiceProfile ? (
          <VoiceProfileCard profile={voiceProfile} />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-ink-muted">
              No voice profile yet. Complete onboarding to get started.
            </p>
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
