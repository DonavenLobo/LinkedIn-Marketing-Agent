"use client";

import { useState, useRef } from "react";
import { useCompletion } from "ai/react";

type Mode = "preview" | "feedback" | "editing";

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
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [editText, setEditText] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const currentContentRef = useRef(content);
  currentContentRef.current = content;

  // Feedback streaming via useCompletion
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
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    } finally {
      setIsSaving(false);
    }
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

  const handleSaveEdit = async () => {
    if (!postId || !editText.trim()) return;
    setIsSaving(true);
    try {
      await fetch("/api/post/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_post_id: postId,
          original_text: currentContentRef.current,
          edited_text: editText,
        }),
      });
      onContentUpdate(editText);
      setMode("preview");
    } finally {
      setIsSaving(false);
    }
  };

  // While streaming feedback, show the incoming content
  const displayFeedbackContent = isFeedbackStreaming ? feedbackCompletion : null;

  if (mode === "feedback") {
    return (
      <div className="space-y-3">
        {displayFeedbackContent && (
          <div className="rounded-lg border border-[#e2e2dc] bg-[#f7f7f5] p-3 text-sm text-[#4a4a4a] whitespace-pre-wrap">
            {displayFeedbackContent}
            <span className="inline-block w-0.5 h-4 bg-[#1a1a1a] animate-pulse ml-0.5 align-text-bottom" />
          </div>
        )}
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="What would you change? e.g. 'Make it shorter and punchier' or 'Less formal, more like how I actually talk'"
          rows={3}
          disabled={isFeedbackStreaming}
          className="w-full rounded-lg border border-[#e2e2dc] px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#8a8a8a] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] disabled:opacity-50"
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
            className="flex-1 rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isFeedbackStreaming ? "Rewriting..." : "Send Feedback"}
          </button>
          <button
            onClick={() => { setMode("preview"); setFeedbackText(""); }}
            disabled={isFeedbackStreaming}
            className="rounded-lg border border-[#e2e2dc] px-4 py-2.5 text-sm font-medium text-[#4a4a4a] hover:bg-[#f7f7f5] disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-[#8a8a8a]">Tip: Cmd+Enter to send</p>
      </div>
    );
  }

  if (mode === "editing") {
    return (
      <div className="space-y-3">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-[#e2e2dc] px-3 py-2 text-sm text-[#1a1a1a] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={isSaving || !editText.trim()}
            className="flex-1 rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSaving ? "Saving..." : "Save Edit"}
          </button>
          <button
            onClick={() => { setMode("preview"); setEditText(content); }}
            className="rounded-lg border border-[#e2e2dc] px-4 py-2.5 text-sm font-medium text-[#4a4a4a] hover:bg-[#f7f7f5] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Preview mode (default)
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isSaving || approved || !postId}
          className="flex-1 rounded-lg bg-[#16a34a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {approved ? "Approved!" : isSaving ? "Saving..." : "Approve"}
        </button>
        <button
          onClick={() => { setMode("feedback"); setFeedbackText(""); }}
          disabled={!postId}
          className="flex-1 rounded-lg border border-[#e2e2dc] px-4 py-2.5 text-sm font-medium text-[#4a4a4a] hover:bg-[#f7f7f5] disabled:opacity-50 transition"
        >
          Give Feedback
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("editing"); setEditText(content); }}
          className="flex-1 rounded-lg border border-[#e2e2dc] px-4 py-2.5 text-sm font-medium text-[#4a4a4a] hover:bg-[#f7f7f5] transition"
        >
          Edit Post
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#333] transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <button
        onClick={onRegenerate}
        className="w-full text-xs text-[#8a8a8a] underline underline-offset-2 hover:text-[#4a4a4a] transition py-1"
      >
        Regenerate from scratch
      </button>
      {!postId && (
        <p className="text-xs text-[#8a8a8a] text-center">Approve/Feedback/Edit require the post to finish saving...</p>
      )}
    </div>
  );
}
