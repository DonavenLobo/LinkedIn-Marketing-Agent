"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import type { ProfileToolData, TranscriptMessage } from "@linkedin-agent/shared";

interface VoiceOnboardingProps {
  userId: string;
  onFallbackToText?: () => void;
}

type Phase = "idle" | "conversation" | "writing-samples" | "building" | "done";

interface ProfileResult {
  samplePostOpening: string;
  toneDescription: string;
  formality: string;
  traits: string[];
}

function ProfileReadyCard({
  result,
  onContinue,
}: {
  result: ProfileResult;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          Voice Profile Ready
        </span>
      </div>

      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Here&apos;s how I&apos;d open a post for you:
      </p>
      <blockquote className="mb-4 border-l-2 border-blue-300 pl-3 text-sm italic text-gray-700 leading-relaxed">
        {result.samplePostOpening}
      </blockquote>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
          {result.formality}
        </span>
        {result.traits.slice(0, 3).map((trait) => (
          <span
            key={trait}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
          >
            {trait}
          </span>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        Continue to Dashboard
      </button>
    </div>
  );
}

export function VoiceOnboarding({ userId, onFallbackToText }: VoiceOnboardingProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [toolData, setToolData] = useState<ProfileToolData | null>(null);
  const [writingSamples, setWritingSamples] = useState("");
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => {
      setPhase("conversation");
      setError(null);
    },
    onDisconnect: () => {
      if (phase === "conversation" && !toolData) {
        setPhase("idle");
      }
    },
    onMessage: (message) => {
      setTranscript((prev) => {
        const role = message.source === "user" ? "user" : "assistant";
        return [...prev, { role, content: message.message }];
      });
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setError("Voice connection error. Please try again.");
      setPhase("idle");
    },
    clientTools: {
      ready_to_build_profile: async (params: Record<string, unknown>) => {
        const data: ProfileToolData = {
          summary: (params.summary as string) || "Voice onboarding conversation",
          confidence: (params.confidence as "high" | "medium" | "low") || "medium",
        };
        setToolData(data);
        setPhase("writing-samples");
        try {
          await conversation.endSession();
        } catch {
          // Session may already be ending
        }
        return "Profile build triggered.";
      },
    },
  });

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const startConversation = useCallback(async () => {
    setError(null);
    setMicError(false);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(true);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/voice-token");
      if (!res.ok) {
        setError("Failed to initialize voice session. Please try again.");
        return;
      }
      const data = await res.json();
      setAgentId(data.agentId);

      await conversation.startSession({
        signedUrl: data.signedUrl,
      });
    } catch (err) {
      console.error("Start session error:", err);
      setError("Failed to start voice conversation. Please try again.");
    }
  }, [conversation]);

  const handleBuildProfile = useCallback(async () => {
    if (!toolData) return;
    setPhase("building");
    setError(null);

    const samples = writingSamples
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          toolData,
          userId,
          writingSamples: samples.length > 0 ? samples : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to build profile");
      }

      const result = await response.json();
      setProfileResult({
        samplePostOpening: result.sample_post_opening,
        toneDescription: result.voice_profile.tone_description,
        formality: result.voice_profile.formality,
        traits: result.voice_profile.personality_traits || [],
      });
      setPhase("done");
    } catch (err) {
      console.error("Profile build error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("writing-samples");
    }
  }, [toolData, transcript, userId, writingSamples]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // Already ended
    }
    if (transcript.length >= 6) {
      setToolData({
        summary: "Manual stop after voice conversation",
        confidence: transcript.length >= 10 ? "high" : "medium",
      });
      setPhase("writing-samples");
    } else {
      setPhase("idle");
    }
  }, [conversation, transcript]);

  // -- Idle phase: start button --
  if (phase === "idle") {
    return (
      <div className="mx-auto flex h-screen max-w-2xl flex-col">
        <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Voice Profile Setup</h1>
          <p className="text-sm text-gray-500">Let&apos;s have a quick chat about your LinkedIn voice</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Talk to your voice coach</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Have a 3-5 minute conversation about how you want to show up on LinkedIn.
              Just talk naturally and we&apos;ll build a voice profile that sounds like you.
            </p>
          </div>

          {micError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 max-w-sm text-center">
              Microphone access is needed for voice onboarding.
              <br />
              Please allow mic access in your browser settings.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={startConversation}
            className="rounded-xl bg-[#1a1a1a] px-8 py-3 text-sm font-medium text-white hover:bg-[#333] transition"
          >
            Start Voice Chat
          </button>

          {onFallbackToText && (
            <button
              onClick={onFallbackToText}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Prefer typing? Use text chat instead
            </button>
          )}
        </div>
      </div>
    );
  }

  // -- Conversation phase --
  if (phase === "conversation") {
    return (
      <div className="mx-auto flex h-screen max-w-2xl flex-col">
        <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Voice Profile Setup</h1>
          <p className="text-sm text-gray-500">Conversation in progress...</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          {/* Voice visualizer */}
          <div className="relative flex items-center justify-center">
            <div
              className={`h-32 w-32 rounded-full transition-all duration-300 ${
                conversation.isSpeaking
                  ? "bg-blue-100 scale-110 shadow-lg shadow-blue-200/50"
                  : "bg-gray-100 scale-100"
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {conversation.isSpeaking ? (
                <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              ) : (
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
          </div>

          <p className="text-sm font-medium text-gray-600">
            {conversation.isSpeaking ? "Coach is speaking..." : "Listening to you..."}
          </p>

          {/* Live transcript */}
          {transcript.length > 0 && (
            <div
              ref={transcriptRef}
              className="w-full max-w-md max-h-48 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3"
            >
              {transcript.map((msg, i) => (
                <div key={i} className={`text-xs leading-relaxed ${msg.role === "user" ? "text-blue-700" : "text-gray-600"}`}>
                  <span className="font-semibold">{msg.role === "user" ? "You" : "Coach"}:</span>{" "}
                  {msg.content}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={stopConversation}
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            {transcript.length >= 6 ? "I'm done, let's build my profile" : "End conversation"}
          </button>
        </div>
      </div>
    );
  }

  // -- Writing samples phase --
  if (phase === "writing-samples") {
    return (
      <div className="mx-auto flex h-screen max-w-2xl flex-col">
        <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Voice Profile Setup</h1>
          <p className="text-sm text-gray-500">One more optional step...</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Great conversation!</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Want to turbocharge your voice profile? Paste any LinkedIn posts, emails,
              or writing you&apos;ve done. This helps us match your written style too.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-sm text-center">
              {error}
            </div>
          )}

          <textarea
            value={writingSamples}
            onChange={(e) => setWritingSamples(e.target.value)}
            placeholder="Paste your writing here... Separate multiple samples with a blank line."
            className="w-full max-w-md resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={6}
          />

          <div className="flex gap-3">
            <button
              onClick={handleBuildProfile}
              className="rounded-xl bg-[#1a1a1a] px-8 py-3 text-sm font-medium text-white hover:bg-[#333] transition"
            >
              {writingSamples.trim() ? "Build My Profile" : "Skip & Build Profile"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Building phase --
  if (phase === "building") {
    return (
      <div className="mx-auto flex h-screen max-w-2xl flex-col">
        <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Voice Profile Setup</h1>
          <p className="text-sm text-gray-500">Creating your voice profile...</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Analyzing your conversation and building your voice profile...</p>
          <p className="text-xs text-gray-400">This usually takes a couple minutes!</p>
        </div>
      </div>
    );
  }

  // -- Done phase --
  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col">
      <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Voice Profile Setup</h1>
        <p className="text-sm text-gray-500">All done!</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {profileResult && (
          <ProfileReadyCard
            result={profileResult}
            onContinue={() => router.push("/create")}
          />
        )}
      </div>
    </div>
  );
}
