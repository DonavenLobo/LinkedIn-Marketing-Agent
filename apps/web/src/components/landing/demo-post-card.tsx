"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";

interface DemoPostCardProps {
  name: string;
  headline: string;
  body: string;
  likes: number;
  comments: number;
  onRegenerate: () => void;
}

export function DemoPostCard({
  name,
  headline,
  body,
  likes,
  comments,
  onRegenerate,
}: DemoPostCardProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(body);
    toast.success("Copied to clipboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full max-w-sm rounded-xl border border-border-light bg-surface shadow-lg overflow-hidden"
    >
      {/* Shimmer overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="shimmer-bar absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent-light/40 to-transparent" />
      </div>

      {/* Generated badge */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-light px-2.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Generated
        </span>
        <div className="flex gap-1">
          <button
            onClick={onRegenerate}
            aria-label="Regenerate post"
            className="rounded-md p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 8a6.5 6.5 0 0 1 11.25-4.5M14.5 8a6.5 6.5 0 0 1-11.25 4.5" />
              <path d="M13.5 1v3.5H10M2.5 15v-3.5H6" />
            </svg>
          </button>
          <button
            onClick={handleCopy}
            aria-label="Copy post text"
            className="rounded-md p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2H3.5A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Post header */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-0">
        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm flex-shrink-0">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{name}</p>
          <p className="text-xs text-ink-muted truncate">{headline}</p>
        </div>
      </div>

      {/* Post body */}
      <div className="px-4 py-3">
        <p className="text-[13px] leading-relaxed text-ink-light whitespace-pre-wrap line-clamp-[12]">
          {body}
        </p>
      </div>

      {/* Engagement bar */}
      <div className="border-t border-border-light px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-ink-muted">{likes} reactions</span>
        <span className="text-xs text-ink-muted">{comments} comments</span>
      </div>

      <style jsx>{`
        .shimmer-bar {
          animation: shimmer 2s ease-in-out 0.3s 1 forwards;
        }
        @keyframes shimmer {
          to { transform: translateX(200%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer-bar { animation: none; opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}
