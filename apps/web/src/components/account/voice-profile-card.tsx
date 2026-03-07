"use client";

import type { LearnedPreference, VoiceProfile, VoiceRule } from "@linkedin-agent/shared";

interface VoiceProfileCardProps {
  profile: VoiceProfile;
}

function RuleList({ title, rules }: { title: string; rules: VoiceRule[] }) {
  if (rules.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      <div className="space-y-2">
        {rules.slice(0, 3).map((rule) => (
          <div key={`${title}-${rule.rule}`} className="rounded-lg border border-border/70 bg-white/50 px-3 py-2">
            <p className="text-sm leading-relaxed text-ink">{rule.rule}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-muted">
              {rule.confidence} confidence
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreferenceChip({ preference }: { preference: LearnedPreference }) {
  return (
    <div className="rounded-lg border border-accent/20 bg-accent-light/50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">Saved default</p>
      <p className="mt-1 text-sm text-ink">{preference.label}</p>
      <p className="mt-1 text-[11px] text-ink-muted">Seen {preference.evidence_count} times</p>
    </div>
  );
}

export function VoiceProfileCard({ profile }: VoiceProfileCardProps) {
  const core = profile.core_voice_profile;
  const promotedPreferences = (profile.learned_preferences ?? []).filter((preference) => preference.promoted);
  const exemplars = profile.exemplar_posts ?? [];
  const stats = profile.profile_stats;

  if (!core) {
    return (
      <div className="rounded-xl border border-border-light bg-surface p-6 shadow-sm">
        <p className="text-sm text-ink-muted">Your voice profile exists, but the structured v2 view is not available yet.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-border-light bg-surface p-6 shadow-sm"
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-ink-muted">
            Your Voice Profile
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink">{core.tone_summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-accent-light px-3 py-1 text-xs font-medium capitalize text-accent">
            {core.formality}
          </span>
          <span className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs text-ink-light">
            v{profile.voice_profile_version ?? "1"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-white/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Audience</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{core.audience_and_intent}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-white/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Signals Stored</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {stats?.user_post_count ?? exemplars.length} exemplar posts, {stats?.approved_post_count ?? 0} approved drafts, {stats?.edited_post_count ?? 0} manual edits
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-white/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Traits</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {core.personality_traits.length > 0 ? core.personality_traits.map((trait) => (
              <span key={trait} className="rounded-full bg-surface-muted px-3 py-1 text-xs text-ink-light">
                {trait}
              </span>
            )) : <span className="text-sm text-ink-muted">No strong traits captured yet.</span>}
          </div>
        </div>
      </div>

      {promotedPreferences.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Learned Defaults
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {promotedPreferences.map((preference) => (
              <PreferenceChip key={`${preference.key}-${preference.value}`} preference={preference} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RuleList title="Sentence Style" rules={core.sentence_style_rules} />
        <RuleList title="Vocabulary" rules={core.vocabulary_rules} />
        <RuleList title="Structure" rules={core.structure_rules} />
        <RuleList title="Hooks" rules={core.hook_rules} />
        <RuleList title="Calls To Action" rules={core.cta_rules} />
        <RuleList title="Formatting" rules={core.formatting_rules} />
      </div>

      {core.signature_phrases.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Signature Phrases
          </p>
          <div className="flex flex-wrap gap-2">
            {core.signature_phrases.map((phrase) => (
              <span
                key={phrase}
                className="rounded-md border border-accent/30 bg-accent-light/50 px-2.5 py-1 text-xs italic text-accent"
              >
                &ldquo;{phrase}&rdquo;
              </span>
            ))}
          </div>
        </div>
      )}

      {core.avoid_phrases.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Avoids
          </p>
          <div className="flex flex-wrap gap-2">
            {core.avoid_phrases.map((phrase) => (
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

      {exemplars.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Example In Your Voice
          </p>
          <blockquote className="border-l-2 border-accent pl-3 text-sm italic leading-relaxed text-ink-light">
            {exemplars[0]?.text}
          </blockquote>
        </div>
      )}
    </div>
  );
}
