"use client";

/**
 * ElevenLabs Voice Agent onboarding interface.
 * Placeholder for future ElevenLabs conversational agent integration.
 */
export function ElevenLabsOnboarding({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-light text-accent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </div>
      <h3 className="font-display text-xl text-ink">Speak with Voice Agent</h3>
      <p className="mt-2 text-sm text-ink-muted max-w-md mx-auto">
        Have a natural conversation with our AI voice agent to capture your speaking style,
        tone, and personality. This option uses ElevenLabs to create a richer voice profile.
      </p>
      <p className="mt-4 text-xs text-ink-muted">
        ElevenLabs integration is coming soon. For now, please use the text-based onboarding.
      </p>
      {onComplete && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-light hover:bg-surface-subtle transition"
        >
          Use text onboarding instead
        </button>
      )}
    </div>
  );
}
