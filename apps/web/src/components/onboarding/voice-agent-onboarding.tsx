"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Conversation } from "@elevenlabs/client";
import {
  AgentMode,
  HopeVoiceStateRing,
  Status,
} from "@/components/voice/HopeVoiceStateRing";

interface VoiceAgentOnboardingProps {
  isRedo: boolean;
}

type ConversationInstance = Awaited<ReturnType<typeof Conversation.startSession>>;

export function VoiceAgentOnboarding({ isRedo }: VoiceAgentOnboardingProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<AgentMode>("idle");
  const conversationRef = useRef<ConversationInstance | null>(null);

  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
        conversationRef.current = null;
      }
      setAgentMode("idle");
    };
  }, []);

  const goToPostsStep = () => {
    const redirectTo = isRedo ? "/account" : "/create";
    const params = new URLSearchParams();
    params.set("redirectTo", redirectTo);
    if (isRedo) params.set("redo", "1");
    router.push(`/onboarding/posts?${params.toString()}`);
  };

  const goToText = () => {
    const params = new URLSearchParams();
    params.set("mode", "text");
    if (isRedo) params.set("redo", "1");
    router.push(`/onboarding?${params.toString()}`);
  };

  const handleStart = async () => {
    if (status === "connecting" || status === "connected") return;

    try {
      setError(null);
      setStatus("connecting");

      // Ask for microphone up front so we can show a clear error
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError("Microphone access is required to speak with Hope.");
        setStatus("error");
        setAgentMode("idle");
        return;
      }

      const res = await fetch("/api/elevenlabs/signed-url");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed to initialise voice agent.");
      }
      const { signedUrl } = (await res.json()) as { signedUrl: string };

      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        onStatusChange: (nextStatus) => {
          if (nextStatus === "connected") {
            setStatus("connected");
          } else if (nextStatus === "connecting") {
            setStatus("connecting");
          } else if (nextStatus === "disconnected") {
            setStatus("ended");
            setAgentMode("idle");
          }
        },
        onModeChange: (mode) => {
          if (mode === "speaking" || mode === "listening") {
            setAgentMode(mode);
          } else {
            setAgentMode("idle");
          }
        },
      });

      conversationRef.current = conversation;
      setStatus("connected");
    } catch (err) {
      console.error("Failed to start Hope conversation", err);
      setError(
        err instanceof Error ? err.message : "Could not start voice session. Please try again.",
      );
      setStatus("error");
      setAgentMode("idle");
    }
  };

  const handleEnd = async () => {
    const conversation = conversationRef.current;
    if (!conversation) {
      setStatus("ended");
      setAgentMode("idle");
      goToPostsStep();
      return;
    }

    try {
      await conversation.endSession();
    } catch {
      // ignore
    } finally {
      conversationRef.current = null;
      setStatus("ended");
      setAgentMode("idle");
      goToPostsStep();
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:px-6">
      <header className="mb-6 space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
          Voice setup · Voice agent
        </p>
        <h1 className="font-display text-3xl text-ink tracking-tight sm:text-4xl">
          Speak with the voice agent
        </h1>
        <p className="mt-2 text-sm text-ink-muted max-w-xl">
          Have a short conversation so I can learn how you actually speak. I&apos;ll use this to
          tune your LinkedIn posts.
        </p>
      </header>

      <section className="mt-4 rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-4">
          <HopeVoiceStateRing agentMode={agentMode} status={status} />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">Hope · Voice agent</p>
            <p className="text-xs text-ink-muted">
              Hope is our voice agent that will guide you through your onboarding process.
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              {agentMode === "speaking"
                ? "Hope is speaking…"
                : status === "connected"
                  ? "Listening for your voice."
                  : "Ready to start when you are."}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {status === "idle" || status === "ended" || status === "error" ? (
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Start conversation with Hope
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnd}
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              End onboarding
            </button>
          )}

          <span className="text-xs text-ink-muted">
            {status === "idle" && "Ready when you are."}
            {status === "connecting" && "Connecting to Hope…"}
            {status === "connected" && "Live now — speak naturally and pause between thoughts."}
            {status === "ended" && "Session ended. You can start another conversation if you like."}
            {status === "error" && "Something went wrong starting the session."}
          </span>
        </div>

        <button
          type="button"
          onClick={goToText}
          className="mt-2 text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          Prefer text instead? Use text onboarding.
        </button>
      </section>
    </main>
  );
}

