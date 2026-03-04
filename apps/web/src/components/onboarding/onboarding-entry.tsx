"use client";

import { useRouter } from "next/navigation";

interface OnboardingEntryProps {
  isRedo: boolean;
}

export function OnboardingEntry({ isRedo }: OnboardingEntryProps) {
  const router = useRouter();

  const buildUrl = (mode: "text" | "voice") => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (isRedo) params.set("redo", "1");
    return `/onboarding?${params.toString()}`;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          Voice setup
        </p>
        <h1 className="font-display text-3xl text-ink tracking-tight sm:text-4xl">
          {isRedo ? "Update how we understand your voice" : "Let’s learn your LinkedIn voice"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted max-w-xl">
          Choose how you want to onboard. You can type through a short chat or speak with the
          voice agent. Either way, your profile will power every post we write for you.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push(buildUrl("voice"))}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface px-4 py-4 text-left shadow-sm transition hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex items-center rounded-full bg-accent-light px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Recommended
          </span>
          <h2 className="mt-1 text-sm font-semibold text-ink">Speak with voice agent</h2>
          <p className="text-xs text-ink-muted">
            Hope is our voice agent that will guide you through your onboarding process.
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push(buildUrl("text"))}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface px-4 py-4 text-left shadow-sm transition hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Text chat
          </span>
          <h2 className="mt-1 text-sm font-semibold text-ink">Text onboarding</h2>
          <p className="text-xs text-ink-muted">
            Answer a short series of questions in a chat to capture your tone, structure, and
            preferences.
          </p>
        </button>

      </section>

      <p className="mt-4 text-[11px] text-ink-muted">
        You can always come back later and refine your voice profile from the account page.
      </p>
    </main>
  );
}

