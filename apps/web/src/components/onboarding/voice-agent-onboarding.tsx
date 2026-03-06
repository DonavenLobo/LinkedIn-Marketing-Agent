"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Conversation } from "@elevenlabs/client";
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
  const intentionalDisconnectRef = useRef(false);
  const toolFiredRef = useRef(false);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<OnboardingSession | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  // Stores the active Conversation instance so callbacks can call endSession()
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  // Stable ref to startConversation so onDisconnect retry doesn't capture a stale closure
  const startConversationRef = useRef<(isRetry?: boolean) => Promise<void>>(async () => {});

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
    if (!isRetry && (status === "connecting" || status === "connected")) return;

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

      // Update session mode to voice
      if (sessionRef.current) {
        fetch("/api/onboarding/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionRef.current.id, mode: "voice" }),
        }).catch(() => {});
      }

      // Build LinkedIn context as a single dynamic variable for the agent system prompt
      const hasLinkedIn = !!(linkedInData?.headline || linkedInData?.positions?.length || linkedInData?.summary);

      let userContext = "";
      if (hasLinkedIn) {
        const parts = [
          "You already know the following about this person. SKIP background and professional context questions — jump straight to voice calibration. Target 3-4 exchanges total.",
        ];

        const name = [linkedInData?.firstName, linkedInData?.lastName].filter(Boolean).join(" ");
        if (name) parts.push(`Name: ${name}`);
        if (linkedInData?.headline) parts.push(`Headline: ${linkedInData.headline}`);
        if (linkedInData?.industry) parts.push(`Industry: ${linkedInData.industry}`);
        if (linkedInData?.summary) parts.push(`About/Summary: ${linkedInData.summary}`);

        if (linkedInData?.positions?.length) {
          parts.push(`Work history:`);
          for (const p of linkedInData.positions) {
            const desc = p.description ? ` (${p.description})` : "";
            parts.push(`  - ${p.title} at ${p.company}${desc}`);
          }
        }

        if (linkedInData?.skills?.length) {
          parts.push(`Skills: ${linkedInData.skills.join(", ")}`);
        }

        userContext = parts.join("\n");
      }

      const sessionOptions = {
        signedUrl,
        dynamicVariables: { user_context: userContext },
      };
      console.log("[Hope] Starting session, full dynamicVariables:", JSON.stringify(sessionOptions.dynamicVariables));

      conversationRef.current = await Conversation.startSession({
        ...sessionOptions,

        onConnect: ({ conversationId }) => {
          console.log("[Hope] Connected, conversationId:", conversationId);
          if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
          setStatus("connected");
          setError(null);
          resetSilenceTimer();
        },

        onDisconnect: (details) => {
          console.warn("[Hope] Disconnected:", JSON.stringify(details));
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
          setAgentMode("idle");

          if (intentionalDisconnectRef.current) {
            intentionalDisconnectRef.current = false;
            return;
          }

          const hasConversationStarted = transcriptRef.current.length > 0;

          if (hasConversationStarted && retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            setError(`Connection dropped. Reconnecting… (${retryCountRef.current}/${MAX_RETRIES})`);
            setTimeout(() => startConversationRef.current(true), RETRY_DELAY_MS);
          } else {
            setStatus("error");
            const detailMsg = details.reason === "error" ? ` (${details.message})` : "";
            setError(
              hasConversationStarted
                ? `Voice connection lost${detailMsg}. You can switch to text chat to continue.`
                : `Could not connect to the voice agent${detailMsg}. Please try again.`
            );
          }
        },

        onMessage: (message) => {
          console.log("[Hope] Message:", message.source, message.message.slice(0, 80));
          const role = message.source === "user" ? "user" : "assistant";
          const newMsg: TranscriptMessage = { role, content: message.message };
          retryCountRef.current = 0;
          setTranscript((prev) => {
            const updated = [...prev, newMsg];
            const turnCount = updated.filter((m) => m.role === "user").length;
            schedulePatch(updated, turnCount);
            resetSilenceTimer();
            return updated;
          });
        },

        onError: (message, context) => {
          console.error("[Hope] Error:", message, context);
          if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
          setError(`Voice connection error: ${message}`);
          setStatus("error");
          setAgentMode("idle");
        },

        onModeChange: ({ mode }) => {
          if (mode === "speaking" || mode === "listening") {
            setAgentMode(mode as AgentMode);
          } else {
            setAgentMode("idle");
          }
        },

        onConversationMetadata: (metadata) => {
          console.log("[Hope] Conversation metadata:", JSON.stringify(metadata, null, 2));
        },

        clientTools: {
          ready_to_build_profile: async (params: Record<string, unknown>) => {
            toolFiredRef.current = true;
            const toolData: ProfileToolData = {
              summary: (params.summary as string) || "Voice onboarding conversation",
              confidence: (params.confidence as "high" | "medium" | "low") || "medium",
            };
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
            intentionalDisconnectRef.current = true;
            try { await conversationRef.current?.endSession(); } catch { /* ignore */ }
            goToPostsStep();
            return "Profile build triggered.";
          },
        },
      });

      console.log("[Hope] startSession resolved successfully");
      if (!isRetry) resetSilenceTimer();
    } catch (err) {
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      console.error("[Hope] startSession threw:", err);
      setError(
        err instanceof Error ? err.message : "Could not start voice session. Please try again.",
      );
      setStatus("error");
      setAgentMode("idle");
    }
  }, [status, linkedInData, resetSilenceTimer, schedulePatch, goToPostsStep]);

  // Keep ref in sync so onDisconnect retry always calls the latest version
  useEffect(() => {
    startConversationRef.current = startConversation;
  }, [startConversation]);

  // Scroll transcript on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleEnd = async () => {
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
    intentionalDisconnectRef.current = true;
    try { await conversationRef.current?.endSession(); } catch { /* ignore */ }
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
    fetch("/api/onboarding/session")
      .then((r) => r.json())
      .then((data: { session: OnboardingSession }) => setSession(data.session))
      .catch(() => {});
  };

  // Auto-trigger: if user has spoken 8 times and tool still hasn't fired, end and proceed
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
                intentionalDisconnectRef.current = true;
                try { await conversationRef.current?.endSession(); } catch { /* ignore */ }
                router.push("/create");
              }}
              className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Save &amp; continue later
            </button>
          )}
        </div>
      </section>

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
