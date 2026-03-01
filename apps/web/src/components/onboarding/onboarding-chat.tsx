"use client";

import { useChat } from "ai/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { Progress } from "@linkedin-agent/shared";
import type { ProfileToolData, TranscriptMessage } from "@linkedin-agent/shared";

interface OnboardingChatProps {
  userId: string;
}

function getProgress(userMessageCount: number, isBuilding: boolean): { label: string; value: number } {
  if (isBuilding) return { label: "Creating your voice profile...", value: 95 };
  if (userMessageCount <= 1) return { label: "Getting to know you...", value: 15 };
  if (userMessageCount <= 3) return { label: "Understanding your style...", value: 40 };
  if (userMessageCount <= 5) return { label: "Dialling in your voice...", value: 65 };
  return { label: "Almost there...", value: 85 };
}

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
    <div className="mx-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          ✨ Voice Profile Ready
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
        Continue to Dashboard →
      </button>
    </div>
  );
}

export function OnboardingChat({ userId }: OnboardingChatProps) {
  const router = useRouter();
  const [isBuilding, setIsBuilding] = useState(false);
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);
  const hasTriggeredBuild = useRef(false);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    status,
    error,
    reload,
  } = useChat({
    api: "/api/onboarding/chat",
    maxSteps: 1,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Trigger the AI's opening message on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    append({ role: "user", content: "[START_ONBOARDING]" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, isBuilding, profileResult]);

  // Auto-trigger profile building when the AI calls the tool
  const triggerBuild = useCallback(
    async (toolArgs: ProfileToolData) => {
      if (hasTriggeredBuild.current) return;
      hasTriggeredBuild.current = true;
      setIsBuilding(true);
      setBuildError(null);

      const transcript: TranscriptMessage[] = messages
        .filter((m) => !(m.role === "user" && m.content === "[START_ONBOARDING]"))
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      try {
        const response = await fetch("/api/onboarding/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, toolData: toolArgs, userId }),
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
      } catch (err) {
        console.error("Profile build error:", err);
        setBuildError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
        hasTriggeredBuild.current = false;
      } finally {
        setIsBuilding(false);
      }
    },
    [messages, userId]
  );

  // Watch for tool invocation in messages
  useEffect(() => {
    if (hasTriggeredBuild.current || isBuilding || profileResult) return;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts ?? []) {
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === "ready_to_build_profile" &&
          part.toolInvocation.state === "call"
        ) {
          triggerBuild(part.toolInvocation.args as ProfileToolData);
          return;
        }
      }
    }
  }, [messages, isBuilding, profileResult, triggerBuild]);

  // Fallback: show manual trigger after 10 user messages
  const userMessageCount = messages.filter(
    (m) => m.role === "user" && m.content !== "[START_ONBOARDING]"
  ).length;
  const showFallbackButton =
    userMessageCount >= 10 && !isBuilding && !profileResult && !hasTriggeredBuild.current;

  const visibleMessages = messages.filter(
    (m) => !(m.role === "user" && m.content === "[START_ONBOARDING]")
  );

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm px-6 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink">Voice Profile Setup</h1>
          <span className="text-xs text-ink-muted">{getProgress(userMessageCount, isBuilding).label}</span>
        </div>
        <Progress value={getProgress(userMessageCount, isBuilding).value} className="h-1.5" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {visibleMessages.map((message) => {
          const textParts = (message.parts ?? []).filter((p) => p.type === "text");
          const hasToolCall = (message.parts ?? []).some(
            (p) =>
              p.type === "tool-invocation" &&
              p.toolInvocation.toolName === "ready_to_build_profile"
          );

          return (
            <div key={message.id}>
              {textParts.length > 0 && (
                <MessageBubble
                  message={{
                    id: message.id,
                    role: message.role as "user" | "assistant",
                    content: textParts.map((p) => (p as { type: "text"; text: string }).text).join(""),
                  }}
                />
              )}
              {/* If no text parts (pure tool call), show a completion message */}
              {hasToolCall && textParts.length === 0 && (
                <MessageBubble
                  message={{
                    id: message.id + "-completion",
                    role: "assistant",
                    content: "I've got a great picture of your voice — let me put your profile together now!",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isStreaming && <TypingIndicator />}

        {/* Building state */}
        {isBuilding && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm text-gray-600">Building your voice profile...</span>
            </div>
          </div>
        )}

        {/* Build error */}
        {buildError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {buildError}{" "}
            <button
              onClick={() => {
                setBuildError(null);
                hasTriggeredBuild.current = false;
              }}
              className="underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Profile ready card */}
        {profileResult && (
          <ProfileReadyCard
            result={profileResult}
            onContinue={() => router.push("/create")}
          />
        )}

        {/* Fallback button */}
        {showFallbackButton && (
          <div className="flex justify-center">
            <button
              onClick={() =>
                triggerBuild({ summary: "Manual trigger after extended conversation", confidence: "medium" })
              }
              className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
            >
              I&apos;m ready — build my voice profile
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat error */}
      {error && !isBuilding && !profileResult && (
        <div className="border-t bg-red-50 px-6 py-3 text-sm text-red-600">
          Connection error.{" "}
          <button onClick={() => reload()} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Input */}
      {!isBuilding && !profileResult && (
        <div className="border-t bg-white px-6 py-4">
          <form
            onSubmit={handleSubmit}
            className="flex gap-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }
              }}
              disabled={isStreaming}
              placeholder={isStreaming ? "..." : "Type your response..."}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              style={{ minHeight: "42px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </form>
          <p className="mt-1.5 text-center text-xs text-gray-400">
            Shift+Enter for a new line
          </p>
        </div>
      )}
    </div>
  );
}
