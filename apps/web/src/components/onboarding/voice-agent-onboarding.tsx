"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import {
  AgentMode,
  HopeVoiceStateRing,
  Status,
} from "@/components/voice/HopeVoiceStateRing";
import type { TranscriptMessage, ProfileToolData, OnboardingSession, LinkedInImportData } from "@linkedin-agent/shared";

interface VoiceAgentOnboardingProps {
  isRedo: boolean;
  linkedInData?: LinkedInImportData | null;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const PATCH_DEBOUNCE_MS = 3000;
const CONNECTION_TIMEOUT_MS = 10000;

export function VoiceAgentOnboarding({ isRedo, linkedInData }: VoiceAgentOnboardingProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [agentMode, setAgentMode] = useState<AgentMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showSilenceHint, setShowSilenceHint] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const sessionRef = useRef<OnboardingSession | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);

  // Keep refs in sync so callbacks don't capture stale state
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Load or create session on mount
  useEffect(() => {
    fetch("/api/onboarding/session")
      .then((r) => r.json())
      .then((data: { session: OnboardingSession; isResuming: boolean }) => {
        setSession(data.session);
        if (data.isResuming && data.session.transcript.length > 0) {
          setTranscript(data.session.transcript);
          setIsResuming(true);
          setShowResumeBanner(true);
        }
      })
      .catch(() => {});
  }, []);

  const schedulePatch = useCallback((updatedTranscript: TranscriptMessage[], turnCount: number) => {
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(() => {
      const s = sessionRef.current;
      if (!s) return;
      fetch("/api/onboarding/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: s.id,
          transcript: updatedTranscript,
          turn_count: turnCount,
          mode: "voice",
        }),
      }).catch(() => {});
    }, PATCH_DEBOUNCE_MS);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    setShowSilenceHint(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      setShowSilenceHint(true);
    }, 30000);
  }, []);

  const goToPostsStep = useCallback(() => {
    const redirectTo = isRedo ? "/account" : "/create";
    const params = new URLSearchParams();
    params.set("redirectTo", redirectTo);
    if (isRedo) params.set("redo", "1");
    router.push(`/onboarding/posts?${params.toString()}`);
  }, [isRedo, router]);

  const goToText = useCallback((preserveSession = true) => {
    const params = new URLSearchParams();
    params.set("mode", "text");
    if (isRedo) params.set("redo", "1");
    if (preserveSession && sessionRef.current) {
      params.set("sessionId", sessionRef.current.id);
    }
    router.push(`/onboarding?${params.toString()}`);
  }, [isRedo, router]);

  const startConversation = useCallback(async (isRetry = false) => {
    if (status === "connecting" || status === "connected") return;

    try {
      setError(null);
      setStatus("connecting");

      // Connection timeout guard
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = setTimeout(() => {
        setError("Connection timed out. You can switch to text chat instead.");
        setStatus("error");
        setAgentMode("idle");
      }, CONNECTION_TIMEOUT_MS);

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        clearTimeout(connectionTimerRef.current!);
        setError("Microphone access is required to speak with Hope.");
        setStatus("error");
        setAgentMode("idle");
        return;
      }

      const res = await fetch("/api/elevenlabs/signed-url");
      if (!res.ok) {
        clearTimeout(connectionTimerRef.current!);
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to initialise voice agent.");
      }
      const { signedUrl } = (await res.json()) as { signedUrl: string };

      // Optionally update session mode to voice
      if (sessionRef.current) {
        fetch("/api/onboarding/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionRef.current.id, mode: "voice" }),
        }).catch(() => {});
      }

      const overrides: Record<string, unknown> = {};
      const agentOverride: Record<string, unknown> = {};

      if (linkedInData?.headline || linkedInData?.positions?.[0]) {
        const title = linkedInData.positions?.[0]?.title || linkedInData.headline;
        const company = linkedInData.positions?.[0]?.company || "";
        const industry = linkedInData.industry ? ` (${linkedInData.industry})` : "";
        const skills = linkedInData.skills?.length
          ? `\nSkills: ${linkedInData.skills.slice(0, 6).join(", ")}`
          : "";
        const positions = linkedInData.positions?.length
          ? linkedInData.positions
              .slice(0, 3)
              .map((p) => `- ${p.title} at ${p.company}`)
              .join("\n")
          : "";

        // Inject LinkedIn context into the agent's prompt so it has this info throughout
        agentOverride.prompt = {
          prompt: `## LINKEDIN CONTEXT (pre-imported — do not ask about these)
Name: ${linkedInData.firstName ?? ""} ${linkedInData.lastName ?? ""}
Headline: ${linkedInData.headline ?? ""}${industry}${positions ? `\nPositions:\n${positions}` : ""}${skills}

You already know their professional background. SKIP all questions about what they do or their industry. Jump straight to voice calibration — ask about a specific story, win, or opinion. Target 3-4 exchanges total, then call ready_to_build_profile.`,
        };

        agentOverride.firstMessage = `Hey${linkedInData.firstName ? ` ${linkedInData.firstName}` : ""}! I can see you're a ${title}${company ? ` at ${company}` : ""}. I already know the background — I just need to hear how you actually talk. Tell me about a deal, project, or decision you're proud of, like you'd explain it to a friend.`;
      } else if (isRetry && isResuming) {
        agentOverride.firstMessage = `Welcome back! Let's pick up where we left off.`;
      }

      if (Object.keys(agentOverride).length > 0) {
        overrides.agent = agentOverride;
      }

      await conversation.startSession({
        signedUrl,
        ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
      } as Parameters<typeof conversation.startSession>[0]);

      retryCountRef.current = 0;
      if (!isRetry) resetSilenceTimer();
    } catch (err) {
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      console.error("Failed to start Hope conversation", err);
      setError(
        err instanceof Error ? err.message : "Could not start voice session. Please try again.",
      );
      setStatus("error");
      setAgentMode("idle");
    }
  }, [status, linkedInData, isResuming, resetSilenceTimer]); // conversation added after definition

  const conversation = useConversation({
    onConnect: () => {
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      setStatus("connected");
      setError(null);
      resetSilenceTimer();
    },
    onDisconnect: () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setAgentMode("idle");
      // Auto-reconnect if unexpected disconnect (not triggered by us)
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        setStatus("connecting");
        setError(`Reconnecting… (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        setTimeout(() => startConversation(true), RETRY_DELAY_MS);
      } else {
        setStatus("ended");
        setError("Voice connection lost. You can switch to text chat to continue.");
      }
    },
    onMessage: (message) => {
      const role = message.source === "user" ? "user" : "assistant";
      const newMsg: TranscriptMessage = { role, content: message.message };
      setTranscript((prev) => {
        const updated = [...prev, newMsg];
        const turnCount = updated.filter((m) => m.role === "user").length;
        schedulePatch(updated, turnCount);
        lastMessageTimeRef.current = Date.now();
        resetSilenceTimer();
        return updated;
      });
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      setError("Voice connection error. Please try again or switch to text.");
      setStatus("error");
      setAgentMode("idle");
    },
    onModeChange: (mode) => {
      const m = typeof mode === "string" ? mode : (mode as { mode: string })?.mode;
      if (m === "speaking" || m === "listening") {
        setAgentMode(m as AgentMode);
      } else {
        setAgentMode("idle");
      }
    },
    clientTools: {
      ready_to_build_profile: async (params: Record<string, unknown>) => {
        toolFiredRef.current = true;
        const toolData: ProfileToolData = {
          summary: (params.summary as string) || "Voice onboarding conversation",
          confidence: (params.confidence as "high" | "medium" | "low") || "medium",
        };
        // Save tool_data to session then navigate
        const s = sessionRef.current;
        if (s) {
          try {
            await fetch("/api/onboarding/session", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: s.id,
                tool_data: toolData,
                transcript: transcriptRef.current,
                turn_count: transcriptRef.current.filter((m) => m.role === "user").length,
              }),
            });
          } catch {
            // Non-fatal — proceed to posts step anyway
          }
        }
        try { await conversation.endSession(); } catch { /* ignore */ }
        goToPostsStep();
        return "Profile build triggered.";
      },
    },
  });

  // Scroll transcript on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleEnd = async () => {
    // Flush pending patch
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    if (sessionRef.current && transcript.length > 0) {
      await fetch("/api/onboarding/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current.id,
          transcript,
          turn_count: transcript.filter((m) => m.role === "user").length,
          mode: "voice",
        }),
      }).catch(() => {});
    }
    try { await conversation.endSession(); } catch { /* ignore */ }
    setStatus("ended");
    setAgentMode("idle");
    goToPostsStep();
  };

  const handleStartOver = async () => {
    const s = sessionRef.current;
    if (s) {
      await fetch("/api/onboarding/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: s.id }),
      }).catch(() => {});
    }
    setSession(null);
    setTranscript([]);
    setIsResuming(false);
    setShowResumeBanner(false);
    setStatus("idle");
    setError(null);
    // Create a fresh session
    fetch("/api/onboarding/session")
      .then((r) => r.json())
      .then((data: { session: OnboardingSession }) => setSession(data.session))
      .catch(() => {});
  };

  // Auto-trigger: if user has spoken 8 times and tool still hasn't fired, end and proceed
  const toolFiredRef = useRef(false);
  useEffect(() => {
    const userTurns = transcript.filter((m) => m.role === "user").length;
    if (userTurns >= 8 && !toolFiredRef.current && status === "connected") {
      toolFiredRef.current = true;
      handleEnd();
    }
  }, [transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isActive = isConnected || isConnecting;
  const turnCount = transcript.filter((m) => m.role === "user").length;
  // Show a prominent "build" CTA after 5 user turns in case the agent doesn't call the tool
  const showBuildButton = isConnected && turnCount >= 5 && !toolFiredRef.current;

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

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Resuming previous session ({transcript.length} messages)</span>
          <button
            type="button"
            onClick={() => setShowResumeBanner(false)}
            className="ml-4 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
                : isConnected
                  ? "Listening for your voice."
                  : "Ready to start when you are."}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        {turnCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min((turnCount / 6) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-muted">{turnCount}/6 exchanges</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        )}

        {showSilenceHint && isConnected && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Feeling stuck? Try describing a recent deal or project like you&apos;d tell a colleague.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!isActive ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startConversation(false)}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isResuming ? "Resume conversation" : "Start conversation with Hope"}
              </button>
              {isResuming && (
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-subtle"
                >
                  Start over
                </button>
              )}
            </div>
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
            {status === "ended" && "Session ended."}
            {status === "error" && "Something went wrong."}
          </span>
        </div>

        {/* Fallback build CTA — appears after 5 user turns if agent hasn't ended the session */}
        {showBuildButton && (
          <div className="rounded-xl border border-accent/30 bg-accent-light px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-xs text-ink">
              Sounds like Hope has enough to work with. Ready to build your profile?
            </p>
            <button
              type="button"
              onClick={handleEnd}
              className="shrink-0 inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
            >
              Build my profile →
            </button>
          </div>
        )}

        {/* Switch to text — always visible */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => goToText(true)}
            className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Switch to text chat
          </button>
          {isActive && (
            <button
              type="button"
              onClick={async () => {
                // Save & continue later
                if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
                const s = sessionRef.current;
                if (s && transcript.length > 0) {
                  await fetch("/api/onboarding/session", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sessionId: s.id,
                      transcript,
                      turn_count: transcript.filter((m) => m.role === "user").length,
                    }),
                  }).catch(() => {});
                }
                try { await conversation.endSession(); } catch { /* ignore */ }
                router.push("/create");
              }}
              className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Save &amp; continue later
            </button>
          )}
        </div>
      </section>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-surface p-4 space-y-2 max-h-72 overflow-y-auto">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted mb-2">Conversation</p>
          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`rounded-xl px-3 py-2 max-w-[85%] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-surface-subtle text-ink"
                }`}
              >
                {msg.content}
              </span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </section>
      )}
    </main>
  );
}
