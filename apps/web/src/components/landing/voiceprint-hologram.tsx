"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tone } from "@/lib/demo-generator";

interface TraitConfig {
  label: string;
  tooltip: string;
}

const TRAITS: TraitConfig[] = [
  { label: "Clarity", tooltip: "How directly your point comes across" },
  { label: "Brevity", tooltip: "Economy of words without losing meaning" },
  { label: "Conviction", tooltip: "Strength and confidence of your stance" },
  { label: "Warmth", tooltip: "Approachability and empathy in tone" },
];

const TRAIT_VALUES: Record<Tone, number[]> = {
  direct: [92, 85, 95, 40],
  warm: [70, 55, 60, 95],
  analytical: [88, 65, 75, 50],
};

const EXAMPLE_REWRITES: Record<Tone, string> = {
  direct:
    "\"We cut our deploy cycle by 60%. Here is exactly how.\"",
  warm:
    "\"Something I learned this quarter that I wish someone had told me earlier.\"",
  analytical:
    "\"Our data shows a 2.3x improvement. Three factors drove the result.\"",
};

interface VoiceprintHologramProps {
  activeTone: Tone;
  onToneChange: (tone: Tone) => void;
}

export function VoiceprintHologram({ activeTone, onToneChange }: VoiceprintHologramProps) {
  const [hoveredTrait, setHoveredTrait] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const values = TRAIT_VALUES[activeTone];

  const handleTraitHover = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 40,
      });
      setHoveredTrait(index);
    },
    []
  );

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          {/* Left copy */}
          <div>
            <span className="font-mono text-xs font-medium text-accent uppercase tracking-widest">
              Voiceprint
            </span>
            <h2 className="mt-3 font-display text-3xl text-ink tracking-tight sm:text-4xl">
              We learn your cadence, structure, and tone.
            </h2>
            <p className="mt-4 text-base text-ink-muted leading-relaxed max-w-lg">
              You stay in control. Every post is generated from your unique
              voiceprint, not a generic template.
            </p>

            {/* Tone selector */}
            <div className="mt-8 flex gap-2" role="radiogroup" aria-label="Select tone">
              {(["direct", "warm", "analytical"] as Tone[]).map((tone) => (
                <button
                  key={tone}
                  role="radio"
                  aria-checked={activeTone === tone}
                  onClick={() => onToneChange(tone)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    activeTone === tone
                      ? "bg-accent text-white shadow-sm"
                      : "border border-border text-ink-light hover:border-accent hover:text-accent"
                  }`}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </button>
              ))}
            </div>

            {/* Example rewrite */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTone}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-6 rounded-md border border-border-light bg-surface-subtle px-4 py-3"
              >
                <span className="font-mono text-[10px] font-medium text-ink-muted uppercase tracking-widest">
                  Example opening
                </span>
                <p className="mt-1 text-sm text-ink-light italic leading-relaxed">
                  {EXAMPLE_REWRITES[activeTone]}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: hologram card */}
          <div className="relative" ref={containerRef}>
            <div
              className="relative rounded-xl p-6 sm:p-8 overflow-hidden"
              style={{
                background: "var(--glass)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow:
                  "0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
              }}
            >
              {/* Animated scanline */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
                aria-hidden="true"
              >
                <div className="scanline absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
              </div>

              <h3 className="font-mono text-xs font-medium text-ink-muted uppercase tracking-widest mb-6">
                Voice Profile
              </h3>

              <div className="space-y-5">
                {TRAITS.map((trait, i) => (
                  <div
                    key={trait.label}
                    className="group cursor-default"
                    onMouseMove={(e) => handleTraitHover(i, e)}
                    onMouseLeave={() => setHoveredTrait(null)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-ink">
                        {trait.label}
                      </span>
                      <span className="font-mono text-xs text-ink-muted tabular-nums">
                        {values[i]}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={false}
                        animate={{ width: `${values[i]}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredTrait !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="pointer-events-none absolute z-10 rounded-md bg-ink px-3 py-1.5 text-xs text-white shadow-lg"
                  style={{
                    left: Math.min(tooltipPos.x, 260),
                    top: tooltipPos.y,
                  }}
                  role="tooltip"
                >
                  {TRAITS[hoveredTrait].tooltip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scanline {
          animation: scanline 4s ease-in-out infinite;
        }
        @keyframes scanline {
          0%, 100% { top: -1px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scanline { animation: none; opacity: 0.15; top: 50%; }
        }
      `}</style>
    </section>
  );
}
