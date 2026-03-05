"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingSession, ProfileToolData, TranscriptMessage } from "@linkedin-agent/shared";

interface PastePostsOnboardingProps {
  redirectTo: string;
  isRedo: boolean;
  userId: string;
}

export function PastePostsOnboarding({ redirectTo, isRedo, userId }: PastePostsOnboardingProps) {
  const router = useRouter();
  const [posts, setPosts] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [buildPhase, setBuildPhase] = useState<string | null>(null);
  const hasTriggeredBuild = useRef(false);

  // Load session on mount to get transcript + tool_data
  useEffect(() => {
    fetch("/api/onboarding/session")
      .then((r) => r.json())
      .then((data: { session: OnboardingSession }) => {
        setSession(data.session);
      })
      .catch(() => {});
  }, []);

  const buildProfile = async (writingSamples?: string[]) => {
    if (hasTriggeredBuild.current) return;
    hasTriggeredBuild.current = true;
    setIsSubmitting(true);
    setError(null);
    setBuildPhase("Analyzing your conversation...");

    const transcript: TranscriptMessage[] = session?.transcript ?? [];
    const toolData: ProfileToolData = (session?.tool_data as ProfileToolData) ?? {
      summary: "Voice onboarding conversation",
      confidence: "medium" as const,
    };

    try {
      setBuildPhase("Building your voice profile...");
      const res = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          toolData,
          userId,
          sessionId: session?.id,
          ...(writingSamples && writingSamples.length > 0
            ? { writingSamples }
            : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to build voice profile.");
      }

      setBuildPhase("Done! Redirecting...");
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
      setBuildPhase(null);
      hasTriggeredBuild.current = false;
    }
  };

  const handleSkip = () => {
    buildProfile();
  };

  const handleSave = () => {
    const samples = posts
      .split(/\n{2,}|^---$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
    buildProfile(samples.length > 0 ? samples : undefined);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:px-6">
      <header className="mb-6 space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          Voice setup · Optional refinement
        </p>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          Make your posts even more you
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted">
          Paste a few of your recent LinkedIn posts. I&apos;ll use them to refine your voice
          profile so Hope&apos;s drafts feel even closer to how you already write. This step is
          optional — you can skip it anytime.
        </p>
      </header>

      {isSubmitting ? (
        <section className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mb-4" />
          <p className="text-sm font-medium text-ink">{buildPhase}</p>
          <p className="mt-2 text-xs text-ink-muted">This usually takes 15-30 seconds.</p>
        </section>
      ) : (
        <section className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <label className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
            Recent posts (optional)
          </label>
          <p className="mb-3 text-xs text-ink-muted">
            Paste 3–10 posts if you can. Separate posts with a blank line or a line containing
            <code className="mx-1 rounded bg-surface-subtle px-1 py-0.5 text-[10px]">---</code>.
          </p>
          <textarea
            value={posts}
            onChange={(e) => setPosts(e.target.value)}
            placeholder={`Example:

Post 1...

Post 2...

Post 3...`}
            rows={10}
            className="min-h-[240px] flex-1 resize-y rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {error && (
            <p className="mt-3 text-xs text-error" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
            >
              Skip — build my profile now
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRedo ? "Save and rebuild profile" : "Save and build profile"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
