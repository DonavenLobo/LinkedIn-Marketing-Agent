"use client";

interface VoiceProfile {
  tone_description: string | null;
  formality: string | null;
  personality_traits: string[] | null;
  signature_phrases: string[] | null;
  avoid_phrases: string[] | null;
  sample_posts?: string[] | null;
}

interface VoiceProfileCardProps {
  profile: VoiceProfile;
}

export function VoiceProfileCard({ profile }: VoiceProfileCardProps) {
  const traits = profile.personality_traits ?? [];
  const signaturePhrases = profile.signature_phrases ?? [];
  const avoidPhrases = profile.avoid_phrases ?? [];
  const samplePost = (profile.sample_posts ?? [])[0];

  return (
    <div
      className="rounded-xl border border-border-light bg-surface p-6 shadow-sm"
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
      }}
    >
      <h3 className="font-mono text-xs font-medium text-ink-muted uppercase tracking-widest mb-4">
        Your Voice Profile
      </h3>

      {profile.tone_description && (
        <div className="mb-5">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Tone
          </p>
          <p className="text-sm text-ink leading-relaxed">
            {profile.tone_description}
          </p>
        </div>
      )}

      {profile.formality && (
        <div className="mb-5">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
            Formality
          </p>
          <span className="inline-flex rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent capitalize">
            {profile.formality}
          </span>
        </div>
      )}

      {traits.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Personality Traits
          </p>
          <div className="flex flex-wrap gap-2">
            {traits.map((trait) => (
              <span
                key={trait}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs text-ink-light"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {signaturePhrases.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Signature Phrases
          </p>
          <div className="flex flex-wrap gap-2">
            {signaturePhrases.map((phrase) => (
              <span
                key={phrase}
                className="rounded-md border border-accent/30 bg-accent-light/50 px-2.5 py-1 text-xs text-accent italic"
              >
                &ldquo;{phrase}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}

      {avoidPhrases.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Phrases to Avoid
          </p>
          <div className="flex flex-wrap gap-2">
            {avoidPhrases.map((phrase) => (
              <span
                key={phrase}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted line-through"
              >
                {phrase}
              </span>
            ))}
          </div>
        </div>
      )}

      {samplePost && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Sample Opening
          </p>
          <blockquote className="border-l-2 border-accent pl-3 text-sm italic text-ink-light leading-relaxed">
            {samplePost}
          </blockquote>
        </div>
      )}
    </div>
  );
}
