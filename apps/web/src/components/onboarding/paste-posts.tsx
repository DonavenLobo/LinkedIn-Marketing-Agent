"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PastePostsOnboardingProps {
  redirectTo: string;
  isRedo: boolean;
}

export function PastePostsOnboarding({ redirectTo, isRedo }: PastePostsOnboardingProps) {
  const router = useRouter();
  const [posts, setPosts] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = () => {
    router.push(redirectTo);
  };

  const handleSave = async () => {
    if (!posts.trim()) {
      router.push(redirectTo);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
      });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed to save posts. Please try again.");
      }

      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
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
            Skip for now
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : isRedo ? "Save and return to account" : "Save and continue"}
          </button>
        </div>
      </section>
    </main>
  );
}

