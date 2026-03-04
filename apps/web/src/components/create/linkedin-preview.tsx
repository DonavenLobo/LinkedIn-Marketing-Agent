"use client";

import { Skeleton } from "@linkedin-agent/shared";

interface LinkedInPreviewProps {
  content: string;
  isLoading: boolean;
  userName?: string;
  userHeadline?: string;
  avatarUrl?: string;
}

export function LinkedInPreview({
  content,
  isLoading,
  userName = "You",
  userHeadline = "LinkedIn Professional",
}: LinkedInPreviewProps) {
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
      <div className="flex items-start gap-3 p-4 pb-0">
        <div className="h-12 w-12 rounded-full bg-surface-muted flex items-center justify-center text-ink-light font-semibold text-lg flex-shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{userName}</p>
          <p className="text-xs text-ink-muted">{userHeadline}</p>
          <p className="text-xs text-ink-muted">Just now</p>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="text-sm leading-relaxed text-ink-light whitespace-pre-wrap">
          {content}
          {isLoading && (
            <span className="inline-block w-0.5 h-4 bg-ink animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>

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
    </div>
  );
}
