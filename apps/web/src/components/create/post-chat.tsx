"use client";

import { useChat } from "ai/react";
import { useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "@/components/onboarding/message-bubble";
import { TypingIndicator } from "@/components/onboarding/typing-indicator";

const QUICK_IDEAS = [
  "Share a recent win",
  "Industry insight",
  "Lesson learned",
  "Hot take on market trends",
];

interface PostChatProps {
  onReadyToGenerate: (enrichedTopic: string) => void;
  onReset: () => void;
  onStop?: () => void;
  isGenerating: boolean;
}

export function PostChat({ onReadyToGenerate, onReset, onStop, isGenerating }: PostChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  const { messages, input, setInput, handleSubmit, append, status } = useChat({
    api: "/api/post/chat",
    maxSteps: 1,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, isGenerating]);

  const handleGenerate = useCallback(
    (enrichedTopic: string) => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      onReadyToGenerate(enrichedTopic);
    },
    [onReadyToGenerate]
  );

  useEffect(() => {
    if (hasTriggeredRef.current) return;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts ?? []) {
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === "ready_to_generate" &&
          part.toolInvocation.state === "call"
        ) {
          handleGenerate(
            (part.toolInvocation.args as { enrichedTopic: string }).enrichedTopic
          );
          return;
        }
      }
    }
  }, [messages, handleGenerate]);

  const visibleMessages = messages.filter((m) => {
    const textParts = (m.parts ?? []).filter((p) => p.type === "text");
    const hasToolCall = (m.parts ?? []).some(
      (p) =>
        p.type === "tool-invocation" &&
        p.toolInvocation.toolName === "ready_to_generate"
    );
    return textParts.length > 0 || !hasToolCall;
  });

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showQuickIdeas = userMessageCount === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full">
      <div>
        <h1 className="font-display text-3xl text-ink tracking-tight leading-tight">
          Create a Post
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tell me what you want to post about and I&apos;ll write it in your voice.
        </p>
      </div>

      {visibleMessages.length > 0 && (
        <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-64">
          {visibleMessages.map((message) => {
            const textParts = (message.parts ?? []).filter((p) => p.type === "text");
            const text = textParts
              .map((p) => (p as { type: "text"; text: string }).text)
              .join("");
            if (!text) return null;
            return (
              <MessageBubble
                key={message.id}
                message={{ id: message.id, role: message.role as "user" | "assistant", content: text }}
              />
            );
          })}
          {isStreaming && <TypingIndicator />}
          {isGenerating && (
            <div className="flex justify-start items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-subtle px-4 py-3 text-sm text-ink-light font-medium shadow-sm">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                Writing your post...
              </div>
              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="text-sm text-ink-muted hover:text-ink underline underline-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Stop generating
                </button>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {showQuickIdeas && (
        <div className="mt-4">
          <p className="font-mono text-[10px] font-medium text-ink-muted mb-2 tracking-widest uppercase">
            Quick Ideas
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_IDEAS.map((idea) => (
              <button
                key={idea}
                onClick={() => append({ role: "user", content: idea })}
                className="rounded-full border border-border px-3 py-1 text-xs text-ink-light hover:border-ink hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isGenerating && (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
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
            placeholder={
              userMessageCount === 0
                ? "What would you like to post about?\n\ne.g. Just closed a $15M deal in Austin..."
                : "Type your response..."
            }
            rows={3}
            className="flex-1 resize-none rounded-md border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="self-end rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Send
          </button>
        </form>
      )}

      {(visibleMessages.length > 0 || isGenerating) && (
        <button
          onClick={onReset}
          className="mt-3 text-xs text-ink-muted underline underline-offset-2 hover:text-ink-light transition self-start"
        >
          Start over
        </button>
      )}
    </div>
  );
}
