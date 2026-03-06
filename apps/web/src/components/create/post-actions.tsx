"use client";

import { useState, useRef } from "react";
import { useCompletion } from "ai/react";
import { toast } from "sonner";
import { HashtagSuggestions } from "./hashtag-suggestions";

type Mode = "preview" | "feedback";

interface PostActionsProps {
  content: string;
  postId: string | null;
  topic: string;
  onRegenerate: () => void;
  onContentUpdate: (newContent: string) => void;
}

export function PostActions({
  content,
  postId,
  topic,
  onRegenerate,
  onContentUpdate,
}: PostActionsProps) {
  const [mode, setMode] = useState<Mode>("preview");
  const [approved, setApproved] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const currentContentRef = useRef(content);
  currentContentRef.current = content;

  const {
    complete,
    completion: feedbackCompletion,
    isLoading: isFeedbackStreaming,
  } = useCompletion({
    api: "/api/post/feedback",
    onFinish: (_, finalCompletion) => {
      onContentUpdate(finalCompletion);
      setFeedbackText("");
      setMode("preview");
      toast.success("Post updated with your feedback");
    },
  });

  const handleApprove = async () => {
    if (!postId) return;
    setIsSaving(true);
    try {
      await fetch("/api/post/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generated_post_id: postId, final_text: content }),
      });
      setApproved(true);
      toast.success("Post approved");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !postId) return;
    await complete("", {
      body: {
        generated_post_id: postId,
        feedback: feedbackText,
        current_text: currentContentRef.current,
        topic,
      },
    });
  };

  const displayFeedbackContent = isFeedbackStreaming ? feedbackCompletion : null;

  if (mode === "feedback") {
    return (
      <div className="space-y-3">
        {displayFeedbackContent && (
          <div className="rounded-md border border-border bg-surface-subtle p-3 text-sm text-ink-light whitespace-pre-wrap">
            {displayFeedbackContent}
            <span className="inline-block w-0.5 h-4 bg-ink animate-pulse ml-0.5 align-text-bottom" />
          </div>
        )}
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="What would you change? e.g. 'Make it shorter and punchier' or 'Less formal, more like how I actually talk'"
          rows={3}
          disabled={isFeedbackStreaming}
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSendFeedback();
            }
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={handleSendFeedback}
            disabled={isFeedbackStreaming || !feedbackText.trim() || !postId}
            className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isFeedbackStreaming ? "Rewriting..." : "Send Feedback"}
          </button>
          <button
            onClick={() => { setMode("preview"); setFeedbackText(""); }}
            disabled={isFeedbackStreaming}
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink-light hover:bg-surface-subtle disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-ink-muted">Tip: Cmd+Enter to send</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div id="tour-post-actions" className="flex gap-2">
        <button
          onClick={() => { setMode("feedback"); setFeedbackText(""); }}
          disabled={!postId}
          className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink-light hover:bg-surface-subtle disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Give Feedback
        </button>
        <button
          onClick={handleApprove}
          disabled={isSaving || approved || !postId}
          className="flex-1 rounded-md bg-success px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {approved ? "Approved!" : isSaving ? "Saving..." : "Approve"}
        </button>
      </div>
      {approved && (
        <button
          onClick={handleCopy}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Copy
        </button>
      )}
      <button
        onClick={onRegenerate}
        className="w-full text-xs text-ink-muted underline underline-offset-2 hover:text-ink-light transition py-1"
      >
        Regenerate from scratch
      </button>
      {!postId && (
        <p className="text-xs text-ink-muted text-center">Approve/Feedback require the post to finish saving...</p>
      )}
      {approved && postId && (
        <HashtagSuggestions postContent={content} postId={postId} />
      )}
    </div>
  );
}
