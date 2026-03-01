"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignalCore } from "./signal-core";
import { DemoPostCard, GhostCard } from "./demo-post-card";
import { generateDemoPost, type Tone } from "@/lib/demo-generator";

const PHASE_LABELS = [
  "Analysing tone\u2026",
  "Structuring narrative\u2026",
  "Matching your cadence\u2026",
  "Refining voice\u2026",
];

interface HeroSectionProps {
  activeTone: Tone;
  onToneChange: (tone: Tone) => void;
}

export function HeroSection({ activeTone, onToneChange }: HeroSectionProps) {
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<ReturnType<
    typeof generateDemoPost
  > | null>(null);
  const [genKey, setGenKey] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [phaseLabelIndex, setPhaseLabelIndex] = useState(0);
  const phaseIntervalRef = useRef<ReturnType<typeof setInterval>>(null);

  // Cycle phase labels during generation
  useEffect(() => {
    if (generating) {
      setPhaseLabelIndex(0);
      phaseIntervalRef.current = setInterval(() => {
        setPhaseLabelIndex((i) => (i + 1) % PHASE_LABELS.length);
      }, 450);
    } else {
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    }
    return () => {
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    };
  }, [generating]);

  const handleGenerate = useCallback(() => {
    const input = topic.trim() || "building a high-performance team";
    setGenerating(true);
    setShowCard(false);
    setStreaming(false);
    setGeneratedPost(null);

    // Short wait: orb contracts + phase labels cycle, then we prepare the post.
    // The actual card reveal is triggered by onExpandStart from the orb.
    setTimeout(() => {
      const post = generateDemoPost(input, activeTone);
      setGeneratedPost(post);
      setGenKey((k) => k + 1);
      // Stop "generating" which triggers the orb expansion
      setGenerating(false);
    }, 1200);
  }, [topic, activeTone]);

  const handleRegenerate = useCallback(() => {
    const input = topic.trim() || "building a high-performance team";
    setGenerating(true);
    setShowCard(false);
    setStreaming(false);
    setGeneratedPost(null);

    setTimeout(() => {
      const post = generateDemoPost(input + String(genKey + 1), activeTone);
      setGeneratedPost(post);
      setGenKey((k) => k + 1);
      setGenerating(false);
    }, 900);
  }, [topic, activeTone, genKey]);

  // Called by SignalCore when expansion starts (the "release" moment)
  const handleExpandStart = useCallback(() => {
    if (generatedPost) {
      setShowCard(true);
      setStreaming(true);
    }
  }, [generatedPost]);

  const handleStreamComplete = useCallback(() => {
    setStreaming(false);
  }, []);

  const tones: Tone[] = useMemo(() => ["direct", "warm", "analytical"], []);

  // Determine what the right column shows
  const hasEverGenerated = generatedPost !== null || generating;

  return (
    <section className="relative overflow-hidden bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
        <div className="grid min-h-[calc(100vh-64px)] items-center gap-8 lg:grid-cols-2 lg:gap-12 py-16 lg:py-0">
          {/* Left column: copy + input */}
          <div className="relative z-10 max-w-lg">
            <h1 className="font-display text-4xl text-ink leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Turn rough ideas into high-signal LinkedIn posts.
            </h1>
            <p className="mt-5 text-lg text-ink-muted leading-relaxed">
              Your voice, sharpened. Drafts in under a minute.
            </p>

            {/* Demo input */}
            <div className="mt-8 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !generating) handleGenerate();
                  }}
                  placeholder="What are you posting about?"
                  aria-label="Post topic"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3.5 pr-12 text-sm text-ink placeholder:text-ink-muted shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {topic.length > 0 && (
                  <button
                    onClick={() => setTopic("")}
                    aria-label="Clear input"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Tone pills */}
              <div
                className="flex items-center gap-2"
                role="radiogroup"
                aria-label="Select tone"
              >
                <span className="text-xs text-ink-muted mr-1">Tone:</span>
                {tones.map((tone) => (
                  <button
                    key={tone}
                    role="radio"
                    aria-checked={activeTone === tone}
                    onClick={() => onToneChange(tone)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      activeTone === tone
                        ? "bg-accent text-white"
                        : "border border-border text-ink-light hover:border-accent hover:text-accent"
                    }`}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating...
                    </span>
                  ) : (
                    "Generate sample"
                  )}
                </button>
                <a
                  href="#how-it-works"
                  className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-ink-light transition hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  See how it works
                </a>
              </div>

              <p className="text-xs text-ink-muted pt-1">
                Preview only. Nothing is posted without approval.
              </p>
            </div>
          </div>

          {/* Right column: canvas + card */}
          <div className="relative flex items-center justify-center min-h-[400px] lg:min-h-[520px]">
            <SignalCore
              generating={generating}
              onExpandStart={handleExpandStart}
            />

            {/* Content overlay */}
            <div className="relative z-10 flex items-center justify-center w-full">
              <AnimatePresence mode="wait">
                {/* Phase 1: Ghost card (before first generation) */}
                {!hasEverGenerated && (
                  <motion.div
                    key="ghost"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex justify-center"
                  >
                    <GhostCard />
                  </motion.div>
                )}

                {/* Phase 2: Processing labels (during generation) */}
                {generating && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center gap-3 rounded-xl bg-surface/80 border border-border-light px-6 py-5 shadow-md backdrop-blur-sm"
                  >
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={phaseLabelIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="text-sm text-ink-light font-medium"
                      >
                        {PHASE_LABELS[phaseLabelIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Phase 3: Generated card (with typewriter) */}
                {showCard && generatedPost && !generating && (
                  <DemoPostCard
                    key={genKey}
                    name={generatedPost.name}
                    headline={generatedPost.headline}
                    body={generatedPost.body}
                    likes={generatedPost.likes}
                    comments={generatedPost.comments}
                    reposts={generatedPost.reposts}
                    streaming={streaming}
                    onStreamComplete={handleStreamComplete}
                    onRegenerate={handleRegenerate}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
