"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const POINTS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Your data stays yours",
    description:
      "Content is processed in-session and never used to train models. Delete your profile at any time.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    ),
    title: "Minimal permissions",
    description:
      "We only ask for what we need. No contacts, no message access, no background tracking.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "You approve everything",
    description:
      "Every post requires your explicit approval before it can be copied or published.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="py-24 sm:py-32 border-t border-border-light">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-14">
          <span className="font-mono text-xs font-medium text-ink-muted uppercase tracking-widest">
            Trust
          </span>
          <h2 className="mt-3 font-display text-3xl text-ink tracking-tight sm:text-4xl">
            Built with privacy in mind
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {POINTS.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-light">
                {point.icon}
              </div>
              <h3 className="text-sm font-semibold text-ink">{point.title}</h3>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-xs mx-auto">
                {point.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/security"
            className="text-sm font-medium text-accent hover:text-accent-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            Learn more about our security practices &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
