"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LinkedInImport } from "./linkedin-import";
import type { OnboardingSession, LinkedInImportData } from "@linkedin-agent/shared";

interface OnboardingEntryProps {
  isRedo: boolean;
  existingSession?: OnboardingSession | null;
  linkedInData?: LinkedInImportData | null;
  userName?: string;
}

type Step = "linkedin" | "choose";

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 1) return `${minutes}m ago`;
  return "just now";
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "linkedin", label: "Import context" },
    { key: "choose", label: "Choose method" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-3 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i < currentIdx
                ? "bg-accent text-white"
                : i === currentIdx
                  ? "bg-accent text-white"
                  : "bg-surface-muted text-ink-muted"
                }`}
            >
              {i < currentIdx ? (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs font-medium ${i === currentIdx ? "text-ink" : i < currentIdx ? "text-ink-muted" : "text-ink-muted"
                }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 ${i < currentIdx ? "bg-accent" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function OnboardingEntry({ isRedo, existingSession, linkedInData: serverLinkedInData, userName }: OnboardingEntryProps) {
  const router = useRouter();
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [showWelcome, setShowWelcome] = useState(!isRedo && !!userName);
  const hasExistingLinkedIn = !!(serverLinkedInData?.headline || serverLinkedInData?.positions?.length);

  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, [showWelcome]);
  const [step, setStep] = useState<Step>(hasExistingLinkedIn ? "choose" : "linkedin");
  const [linkedInData, setLinkedInData] = useState<LinkedInImportData | null>(serverLinkedInData ?? null);

  const buildUrl = (mode: "text" | "voice", opts?: { sessionId?: string }) => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (isRedo) params.set("redo", "1");
    if (opts?.sessionId) params.set("sessionId", opts.sessionId);
    return `/onboarding?${params.toString()}`;
  };

  const handleResume = (session: OnboardingSession) => {
    router.push(buildUrl(session.mode as "text" | "voice", { sessionId: session.id }));
  };

  const handleStartOver = async (session: OnboardingSession) => {
    setIsAbandoning(true);
    try {
      await fetch("/api/onboarding/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
    } catch {
      // non-fatal
    } finally {
      setIsAbandoning(false);
    }
    router.refresh();
  };

  const hasLinkedIn = !!(linkedInData?.headline || linkedInData?.positions?.length);

  return (
    <>
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface px-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <motion.h1
              className="font-display text-4xl font-bold text-ink tracking-tight sm:text-5xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              Welcome, {userName}!
            </motion.h1>
            <motion.p
              className="mt-4 text-base text-ink-muted max-w-sm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              Are you ready to supercharge your LinkedIn presence?
            </motion.p>
            <motion.button
              type="button"
              onClick={() => setShowWelcome(false)}
              className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              Let&apos;s go →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:px-6">

      {/* Resume existing session card — shown above steps */}
      {existingSession && existingSession.turn_count > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">You have an in-progress session</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {existingSession.turn_count} message{existingSession.turn_count !== 1 ? "s" : ""} shared
              {" · "}{existingSession.mode} mode
              {" · "}started {formatRelativeTime(existingSession.created_at)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleResume(existingSession)}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => handleStartOver(existingSession)}
              disabled={isAbandoning}
              className="inline-flex items-center justify-center rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              {isAbandoning ? "Clearing…" : "Start over"}
            </button>
          </div>
        </div>
      )}

      {!isRedo && <StepIndicator current={step} />}

      {/* ── Step 1: LinkedIn import ── */}
      {step === "linkedin" && (
        <>
          <header className="mb-8 space-y-2">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
              Step 1 · Give us some context
            </p>
            <h1 className="font-display text-3xl text-ink tracking-tight sm:text-4xl">
              Tell us about yourself
            </h1>
            <p className="mt-2 text-sm text-ink-muted max-w-xl">
              Share some info from your LinkedIn profile so the agent already knows who you are.
              Just copy-paste from your profile page, or upload a couple of screenshots.
            </p>
          </header>

          <LinkedInImport
            onImported={(data) => {
              setLinkedInData(data);
              setStep("choose");
            }}
            onSkip={() => setStep("choose")}
          />
        </>
      )}

      {/* ── Step 2: Choose mode ── */}
      {step === "choose" && (
        <>
          <header className="mb-8 space-y-2">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
              {isRedo ? "Voice setup" : "Step 2 · Start the conversation"}
            </p>
            <h1 className="font-display text-3xl text-ink tracking-tight sm:text-4xl">
              {isRedo ? "Update your LinkedIn voice" : "How do you want to onboard?"}
            </h1>
            <p className="mt-2 text-sm text-ink-muted max-w-xl">
              {hasLinkedIn
                ? "We already know the basics from your LinkedIn profile. Now, we just need to hear how you talk — pick whichever method feels natural."
                : "Speak with the voice agent or type through a short chat. Either way, your profile will power every post we write for you."}
            </p>
          </header>

          {/* LinkedIn import status */}
          {hasLinkedIn ? (
            <div className="mb-5 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>LinkedIn profile imported — onboarding will take 2-3 minutes</span>
              </div>
              {!hasExistingLinkedIn && (
                <button
                  type="button"
                  onClick={() => setStep("linkedin")}
                  className="ml-3 underline underline-offset-2 hover:no-underline"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="mb-5 flex items-center justify-between rounded-lg border border-border bg-surface-subtle px-4 py-3 text-xs text-ink-muted">
              <span>No LinkedIn data — onboarding will take 4-5 minutes</span>
              <button
                type="button"
                onClick={() => setStep("linkedin")}
                className="ml-3 underline underline-offset-2 hover:text-ink"
              >
                Import now
              </button>
            </div>
          )}

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
        </>
      )}
    </main>
    </>
  );
}
