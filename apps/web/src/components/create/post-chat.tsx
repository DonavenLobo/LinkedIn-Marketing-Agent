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
  isGenerating: boolean;
}

export function PostChat({ onReadyToGenerate, onReset, isGenerating }: PostChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  const { messages, input, setInput, handleSubmit, append, status } = useChat({
    api: "/api/post/chat",
    maxSteps: 1,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, isGenerating]);

  // Watch for ready_to_generate tool invocation
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
    // Hide pure tool-call messages with no text
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create a Post</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tell me what you want to post about and I&apos;ll write it in your voice.
        </p>
      </div>

      {/* Messages */}
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
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 font-medium shadow-sm">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Writing your post...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick Ideas chips — only before first message */}
      {showQuickIdeas && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">QUICK IDEAS</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_IDEAS.map((idea) => (
              <button
                key={idea}
                onClick={() => append({ role: "user", content: idea })}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-400 hover:text-blue-700 transition"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area — hide when generating */}
      {!isGenerating && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex gap-3"
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
            placeholder={
              userMessageCount === 0
                ? "e.g. Just closed a $15M deal in Austin, want to share the lesson about patience..."
                : "Type your response..."
            }
            rows={3}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </form>
      )}

      {/* Start over */}
      {(visibleMessages.length > 0 || isGenerating) && (
        <button
          onClick={onReset}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition self-start"
        >
          Start over
        </button>
      )}
    </div>
  );
}
