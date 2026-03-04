"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    title: "Capture your voice",
    description:
      "A short conversation teaches our AI your tone, vocabulary, and formatting instincts.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Draft with structure",
    description:
      "Describe your topic. We generate a LinkedIn post that matches your natural style and cadence.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Publish with confidence",
    description:
      "Review, refine, and copy. Nothing goes live without your approval.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-surface-subtle">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-16">
          <span className="font-mono text-xs font-medium text-accent uppercase tracking-widest">
            Process
          </span>
          <h2 className="mt-3 font-display text-3xl text-ink tracking-tight sm:text-4xl">
            Three steps. Under two minutes.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
              className="group rounded-xl border border-border-light bg-surface p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                {step.icon}
              </div>
              <span className="font-mono text-xs text-ink-muted tracking-widest">
                {step.number}
              </span>
              <h3 className="mt-1 text-base font-semibold text-ink tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed opacity-0 max-h-0 overflow-hidden transition-all duration-300 group-hover:opacity-100 group-hover:max-h-24 group-hover:mt-3">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
