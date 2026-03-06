"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@linkedin-agent/shared";

interface LinkedInPreviewProps {
  content: string;
  isLoading: boolean;
  userName?: string;
  userHeadline?: string;
  avatarUrl?: string;
  postId?: string | null;
  onContentUpdate?: (content: string) => void;
}

export function LinkedInPreview({
  content,
  isLoading,
  userName = "You",
  userHeadline = "LinkedIn Professional",
  postId,
  onContentUpdate,
}: LinkedInPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setEditText(content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setIsSaving(true);
    try {
      if (postId) {
        await fetch("/api/post/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generated_post_id: postId,
            original_text: content,
            edited_text: editText,
          }),
        });
      }
      onContentUpdate?.(editText);
      setIsEditing(false);
      toast.success("Edits saved");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText("");
  };
  if (!content && !isLoading) {
    return (
      <div className="rounded-md border-2 border-dashed border-border p-8 text-center">
        <p className="text-sm text-ink-muted">
          Your LinkedIn post preview will appear here
        </p>
      </div>
    );
  }

  if (!content && isLoading) {
    return (
      <div className="rounded-md border border-border-light bg-surface p-4 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-light bg-surface shadow-sm">
      <div className="relative flex items-start gap-3 p-4 pb-0">
        <div className="h-12 w-12 rounded-full bg-surface-muted flex items-center justify-center text-ink-light font-semibold text-lg flex-shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{userName}</p>
          <p className="text-xs text-ink-muted">{userHeadline}</p>
          <p className="text-xs text-ink-muted">Just now</p>
        </div>
        {/* Pencil edit button — only shown when post exists and not loading */}
        {content && !isLoading && (
          <button
            id="tour-edit-pencil"
            onClick={handleStartEdit}
            title="Edit post"
            className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:text-ink hover:bg-surface-subtle transition"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {isEditing ? (
          <>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-md border border-accent bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={Math.max(6, editText.split("\n").length + 2)}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editText.trim()}
                className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-ink-light hover:bg-surface-subtle transition"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm leading-relaxed text-ink-light">
            {isLoading ? (
              <span className="whitespace-pre-wrap">
                {content}
                <span className="inline-block w-0.5 h-4 bg-ink animate-pulse ml-0.5 align-text-bottom" />
              </span>
            ) : (
              (() => {
                const paragraphs = content.split(/\n\n+/).filter(Boolean);
                if (paragraphs.length === 0) return null;
                return paragraphs.map((para, i) => {
                  let id: string | undefined;
                  if (i === 0 && paragraphs.length > 1) id = "tour-post-hook";
                  if (i === paragraphs.length - 1) id = "tour-post-cta";
                  return (
                    <span
                      key={i}
                      id={id}
                      style={{ display: "block", marginBottom: i < paragraphs.length - 1 ? "0.75em" : 0 }}
                    >
                      {para}
                    </span>
                  );
                });
              })()
            )}
          </div>
        )}
      </div>

      {!isEditing && (
        <>
          <div className="border-t border-border-light px-4 py-1">
            <div className="flex items-center gap-1 text-xs text-ink-muted py-1">
              <span>42 reactions</span>
              <span className="ml-auto">12 comments</span>
            </div>
          </div>
          <div className="border-t border-border-light flex">
            {["Like", "Comment", "Repost", "Send"].map((action) => (
              <button
                key={action}
                className="flex-1 py-2.5 text-xs font-medium text-ink-muted hover:bg-surface-subtle transition"
              >
                {action}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
