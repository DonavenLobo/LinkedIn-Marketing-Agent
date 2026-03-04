"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "../../public/logo.png";
import { HeroSection } from "@/components/landing/hero-section";
import { VoiceprintHologram } from "@/components/landing/voiceprint-hologram";
import { HowItWorks } from "@/components/landing/how-it-works";
import type { Tone } from "@/lib/demo-generator";

export default function Home() {
  const [activeTone, setActiveTone] = useState<Tone>("direct");

  return (
    <main className="min-h-screen bg-surface">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src={logo} alt="" width={24} height={24} aria-hidden="true" />
            <span className="text-sm font-semibold text-ink tracking-tight">
              LinkedIn Agent
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            <a
              href="#how-it-works"
              className="text-sm text-ink-light transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              How it works
            </a>
            <Link
              href="/auth/login"
              className="text-sm text-ink-light transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try the demo
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/auth/login"
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try the demo
            </Link>
          </div>
        </div>
      </header>

      {/* A) Hero: Signal Engine */}
      <HeroSection activeTone={activeTone} onToneChange={setActiveTone} />

      {/* B) Voiceprint Hologram */}
      <div className="border-t border-border-light bg-surface">
        <VoiceprintHologram activeTone={activeTone} onToneChange={setActiveTone} />
      </div>

      {/* C) How it works */}
      <HowItWorks />

      {/* D) Final CTA band */}
      <section className="border-t border-border-light bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl text-ink tracking-tight sm:text-4xl">
            Start in under two minutes.
          </h2>
          <p className="mt-4 text-base text-ink-muted">
            No credit card. No setup complexity. Just sign in and go.
          </p>
          <div className="mt-8">
            <Link
              href="/auth/login"
              className="inline-flex rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center bg-surface-subtle">
        <span className="font-mono text-xs text-ink-muted tracking-wide">
          International Venture Studio
        </span>
      </footer>
    </main>
  );
}
