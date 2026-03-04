"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Ghost Card (idle state)                                           */
/* ------------------------------------------------------------------ */

export function GhostCard() {
  return (
    <div className="ghost-card w-full max-w-sm rounded-xl border-2 border-dashed border-border-light bg-surface/40 backdrop-blur-sm overflow-hidden">
      {/* Fake badge row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        <div className="h-4 w-20 rounded-full bg-border-light" />
        <div className="flex gap-1.5">
          <div className="h-5 w-5 rounded-md bg-border-light" />
          <div className="h-5 w-5 rounded-md bg-border-light" />
        </div>
      </div>

      {/* Fake post header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-0">
        <div className="h-10 w-10 rounded-full border-2 border-dashed border-border bg-surface-subtle flex-shrink-0" />
        <div className="space-y-2 pt-0.5">
          <div className="h-3 w-24 rounded bg-border-light" />
          <div className="h-2.5 w-32 rounded bg-border-light/60" />
        </div>
      </div>

      {/* Fake body lines */}
      <div className="px-4 py-4 space-y-2.5">
        <div className="h-2.5 w-full rounded bg-border-light" />
        <div className="h-2.5 w-full rounded bg-border-light" />
        <div className="h-2.5 w-4/5 rounded bg-border-light" />
        <div className="h-2.5 w-full rounded bg-border-light/60" />
        <div className="h-2.5 w-3/5 rounded bg-border-light/60" />
      </div>

      {/* Fake engagement bar */}
      <div className="border-t border-dashed border-border-light px-4 py-3 flex items-center justify-between">
        <div className="h-2.5 w-16 rounded bg-border-light/50" />
        <div className="h-2.5 w-20 rounded bg-border-light/50" />
      </div>

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-surface/90 border border-border-light px-4 py-1.5 text-xs font-medium text-ink-muted shadow-sm backdrop-blur-sm">
          Your post will appear here
        </span>
      </div>

      <style jsx>{`
        .ghost-card {
          position: relative;
          animation: ghostBreathe 3s ease-in-out infinite;
        }
        @keyframes ghostBreathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.008); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ghost-card { animation: none; opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                             */
/* ------------------------------------------------------------------ */

function useAnimatedCounter(
  target: number,
  active: boolean,
  durationMs: number = 4000,
  delayMs: number = 0
) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    let started = false;
    const delayTimeout = setTimeout(() => {
      started = true;
      startTimeRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / durationMs, 1);
        // Ease-out: fast start, slow end (feels like real engagement)
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(delayTimeout);
      if (started && rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, durationMs, delayMs]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Demo Post Card (with typewriter streaming + animated engagement)  */
/* ------------------------------------------------------------------ */

interface DemoPostCardProps {
  name: string;
  headline: string;
  body: string;
  likes: number;
  comments: number;
  reposts: number;
  streaming?: boolean;
  onStreamComplete?: () => void;
  onRegenerate: () => void;
}

export function DemoPostCard({
  name,
  headline,
  body,
  likes,
  comments,
  reposts,
  streaming = false,
  onStreamComplete,
  onRegenerate,
}: DemoPostCardProps) {
  const [displayedChars, setDisplayedChars] = useState(streaming ? 0 : body.length);
  const [streamDone, setStreamDone] = useState(!streaming);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const charsRef = useRef(0);

  // Animated engagement counters start ticking once streaming is done
  const animatedLikes = useAnimatedCounter(likes, streamDone, 3500, 300);
  const animatedComments = useAnimatedCounter(comments, streamDone, 3000, 800);
  const animatedReposts = useAnimatedCounter(reposts, streamDone, 2800, 1200);

  const tick = useCallback(
    (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;

      if (delta >= 15) {
        const charsToAdd = Math.max(1, Math.floor(delta / 15));
        charsRef.current = Math.min(charsRef.current + charsToAdd, body.length);
        setDisplayedChars(charsRef.current);
        lastTimeRef.current = time;

        if (charsRef.current >= body.length) {
          setStreamDone(true);
          onStreamComplete?.();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [body.length, onStreamComplete]
  );

  useEffect(() => {
    if (!streaming) {
      setDisplayedChars(body.length);
      setStreamDone(true);
      return;
    }

    charsRef.current = 0;
    lastTimeRef.current = 0;
    setDisplayedChars(0);
    setStreamDone(false);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [streaming, tick, body.length]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(body);
    toast.success("Copied to clipboard");
  };

  const visibleText = body.slice(0, displayedChars);
  const isStreaming = streaming && !streamDone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-sm rounded-xl border border-border-light bg-surface shadow-lg overflow-hidden"
    >
      {/* Shimmer overlay, only plays after stream completes */}
      {streamDone && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="shimmer-bar absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent-light/40 to-transparent" />
        </div>
      )}

      {/* Generated badge */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-light px-2.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-accent ${isStreaming ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
          {isStreaming ? "Writing" : "Generated"}
        </span>
        <div className="flex gap-1">
          <button
            onClick={onRegenerate}
            aria-label="Regenerate post"
            disabled={isStreaming}
            className="rounded-md p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 8a6.5 6.5 0 0 1 11.25-4.5M14.5 8a6.5 6.5 0 0 1-11.25 4.5" />
              <path d="M13.5 1v3.5H10M2.5 15v-3.5H6" />
            </svg>
          </button>
          <button
            onClick={handleCopy}
            aria-label="Copy post text"
            disabled={isStreaming}
            className="rounded-md p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Post body with typewriter effect */}
      <div className="px-4 py-3 min-h-[120px]">
        <p className="text-[13px] leading-relaxed text-ink-light whitespace-pre-wrap">
          {visibleText}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-accent animate-pulse ml-0.5 align-text-bottom" />
          )}
        </p>
      </div>

      {/* Engagement bar with animated counters */}
      <div className="border-t border-border-light px-4 py-2">
        <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
          <span className="flex items-center gap-1">
            <span className="flex -space-x-1" aria-hidden="true">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] text-white">&#x1F44D;</span>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-error text-[8px] text-white">&#x2764;</span>
            </span>
            <span className="tabular-nums ml-0.5">{animatedLikes}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{animatedComments} comments</span>
            <span className="tabular-nums">{animatedReposts} reposts</span>
          </span>
        </div>
        <div className="flex border-t border-border-light pt-1.5 -mx-1">
          {[
            { label: "Like", icon: "M14 9V5a3 3 0 0 0-6 0v4M2 9h3v7H2zM5 16h5.5a2 2 0 0 0 1.9-1.4l1.4-4.2A1 1 0 0 0 12.8 9H9l.6-2.8" },
            { label: "Comment", icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
            { label: "Repost", icon: "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" },
            { label: "Send", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" },
          ].map((action) => (
            <button
              key={action.label}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-ink-muted rounded hover:bg-surface-subtle transition"
              tabIndex={-1}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                <path d={action.icon} />
              </svg>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .shimmer-bar {
          animation: shimmer 2s ease-in-out 0.2s 1 forwards;
        }
        @keyframes shimmer {
          to {
            transform: translateX(200%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer-bar {
            animation: none;
            opacity: 0;
          }
        }
      `}</style>
    </motion.div>
  );
}
