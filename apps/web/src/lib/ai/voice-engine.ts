import type {
  CoreVoiceProfile,
  FormattingPreferences,
  LearnedPreference,
  PostInteraction,
  PreferenceSignalSource,
  VoiceConfidence,
  VoiceExemplar,
  VoicePreferenceKey,
  VoicePreferenceSignal,
  VoiceProfile,
  VoiceProfileStats,
  VoiceRule,
} from "@linkedin-agent/shared";
import { HUMANIZER_ANTI_AI_PATTERNS, LINKEDIN_POST_PRINCIPLES } from "./prompt-constants";

const PROMOTION_THRESHOLD = 2;
const EXEMPLAR_LIMIT = 5;
const RECENT_INTERACTION_LIMIT = 5;

const DEFAULT_FORMATTING_PREFERENCES: FormattingPreferences = {
  uses_emojis: false,
  line_break_style: "spaced",
  uses_hashtags: false,
  hashtag_count: 0,
};

const DEFAULT_PROFILE_STATS: VoiceProfileStats = {
  onboarding_sample_count: 0,
  user_post_count: 0,
  approved_post_count: 0,
  edited_post_count: 0,
  last_distilled_at: null,
};

type SignalPattern = {
  key: VoicePreferenceKey;
  value: string;
  label: string;
  patterns: RegExp[];
};

const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    key: "post_length",
    value: "shorter",
    label: "Prefer shorter posts",
    patterns: [
      /\bshorter\b/i,
      /too long/i,
      /cut (it )?down/i,
      /trim (it )?down/i,
      /condens(e|ed)/i,
      /more concise/i,
      /tight(er|en) it up/i,
      /less verbose/i,
    ],
  },
  {
    key: "post_length",
    value: "longer",
    label: "Prefer longer posts",
    patterns: [
      /\blonger\b/i,
      /expand/i,
      /go deeper/i,
      /more depth/i,
      /more detail/i,
      /build this out/i,
    ],
  },
  {
    key: "paragraph_density",
    value: "more_spaced",
    label: "Prefer more whitespace",
    patterns: [
      /more line breaks/i,
      /space it out/i,
      /more whitespace/i,
      /break it up/i,
      /lighter formatting/i,
    ],
  },
  {
    key: "paragraph_density",
    value: "denser",
    label: "Prefer denser paragraphs",
    patterns: [
      /fewer line breaks/i,
      /less whitespace/i,
      /denser/i,
      /tighter paragraphs/i,
      /keep it tighter/i,
    ],
  },
  {
    key: "structure_style",
    value: "less_structured",
    label: "Prefer looser structure",
    patterns: [
      /less structured/i,
      /less formulaic/i,
      /less rigid/i,
      /looser/i,
      /less listy/i,
      /less templated/i,
    ],
  },
  {
    key: "structure_style",
    value: "more_structured",
    label: "Prefer clearer structure",
    patterns: [
      /more structured/i,
      /clearer structure/i,
      /more organized/i,
      /cleaner flow/i,
      /make it clearer/i,
      /more scannable/i,
    ],
  },
  {
    key: "hook_style",
    value: "question_led",
    label: "Prefer question-led hooks",
    patterns: [
      /start with a question/i,
      /open with a question/i,
      /lead with a question/i,
      /question hook/i,
    ],
  },
  {
    key: "hook_style",
    value: "bold_claim",
    label: "Prefer bold-claim hooks",
    patterns: [
      /stronger hook/i,
      /bolder opening/i,
      /more provocative opener/i,
      /lead with a bold claim/i,
      /contrarian hook/i,
    ],
  },
  {
    key: "cta_style",
    value: "lighter_or_none",
    label: "Prefer lighter CTAs",
    patterns: [
      /softer cta/i,
      /lighter cta/i,
      /less salesy/i,
      /no call to action/i,
      /remove the cta/i,
      /drop the cta/i,
    ],
  },
  {
    key: "cta_style",
    value: "question_based",
    label: "Prefer question-based CTAs",
    patterns: [
      /end with a question/i,
      /question based cta/i,
      /ask a question at the end/i,
    ],
  },
  {
    key: "directness",
    value: "more_direct",
    label: "Prefer more direct writing",
    patterns: [
      /more direct/i,
      /more blunt/i,
      /more punchy/i,
      /less fluffy/i,
      /less filler/i,
      /get to the point/i,
      /make it sharper/i,
    ],
  },
  {
    key: "directness",
    value: "softer",
    label: "Prefer a softer tone",
    patterns: [
      /softer tone/i,
      /less direct/i,
      /warmer/i,
      /less blunt/i,
      /more nuanced/i,
      /gentler/i,
    ],
  },
  {
    key: "storytelling_style",
    value: "more_story_driven",
    label: "Prefer more story-driven posts",
    patterns: [
      /more personal/i,
      /more story/i,
      /story driven/i,
      /add an anecdote/i,
      /make it more human/i,
      /more narrative/i,
    ],
  },
  {
    key: "storytelling_style",
    value: "more_tactical",
    label: "Prefer more tactical posts",
    patterns: [
      /more tactical/i,
      /more actionable/i,
      /more practical/i,
      /more concrete takeaways/i,
      /less story/i,
      /more educational/i,
    ],
  },
];

function dedupeStrings(values: string[], limit?: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (limit && result.length >= limit) break;
  }

  return result;
}

function normalizeConfidence(value: unknown): VoiceConfidence {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeRuleList(value: unknown): VoiceRule[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { rule: item.trim(), confidence: "medium" as const };
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const rule = typeof record.rule === "string" ? record.rule.trim() : "";
      if (!rule) return null;
      return {
        rule,
        confidence: normalizeConfidence(record.confidence),
        evidence: typeof record.evidence === "string" ? record.evidence.trim() : undefined,
      };
    })
    .filter((rule): rule is VoiceRule => Boolean(rule));
}

export function cleanModelJson(text: string): string {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

export function parseModelJson<T>(text: string): T {
  return JSON.parse(cleanModelJson(text)) as T;
}

export function normalizeFormattingPreferences(input: unknown): FormattingPreferences {
  if (!input || typeof input !== "object") return { ...DEFAULT_FORMATTING_PREFERENCES };

  const record = input as Record<string, unknown>;
  return {
    uses_emojis: typeof record.uses_emojis === "boolean" ? record.uses_emojis : DEFAULT_FORMATTING_PREFERENCES.uses_emojis,
    line_break_style:
      record.line_break_style === "dense" || record.line_break_style === "spaced" || record.line_break_style === "mixed"
        ? record.line_break_style
        : DEFAULT_FORMATTING_PREFERENCES.line_break_style,
    uses_hashtags: typeof record.uses_hashtags === "boolean" ? record.uses_hashtags : DEFAULT_FORMATTING_PREFERENCES.uses_hashtags,
    hashtag_count: typeof record.hashtag_count === "number" ? record.hashtag_count : DEFAULT_FORMATTING_PREFERENCES.hashtag_count,
  };
}

export function normalizeCoreVoiceProfile(input: unknown): CoreVoiceProfile {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    tone_summary:
      typeof record.tone_summary === "string" && record.tone_summary.trim().length > 0
        ? record.tone_summary.trim()
        : "Writes like a sharp, specific human. Clear point of view, practical detail, and natural rhythm.",
    audience_and_intent:
      typeof record.audience_and_intent === "string" && record.audience_and_intent.trim().length > 0
        ? record.audience_and_intent.trim()
        : "Writing for a professional LinkedIn audience with an emphasis on credibility, clarity, and useful insight.",
    sentence_style_rules: normalizeRuleList(record.sentence_style_rules),
    vocabulary_rules: normalizeRuleList(record.vocabulary_rules),
    punctuation_rules: normalizeRuleList(record.punctuation_rules),
    structure_rules: normalizeRuleList(record.structure_rules),
    hook_rules: normalizeRuleList(record.hook_rules),
    cta_rules: normalizeRuleList(record.cta_rules),
    formatting_rules: normalizeRuleList(record.formatting_rules),
    anti_pattern_rules: normalizeRuleList(record.anti_pattern_rules),
    personality_traits: dedupeStrings(Array.isArray(record.personality_traits) ? record.personality_traits.filter((item): item is string => typeof item === "string") : [], 6),
    signature_phrases: dedupeStrings(Array.isArray(record.signature_phrases) ? record.signature_phrases.filter((item): item is string => typeof item === "string") : [], 8),
    avoid_phrases: dedupeStrings(Array.isArray(record.avoid_phrases) ? record.avoid_phrases.filter((item): item is string => typeof item === "string") : [], 12),
    formality: record.formality === "casual" || record.formality === "balanced" || record.formality === "formal" ? record.formality : "balanced",
    formatting_preferences: normalizeFormattingPreferences(record.formatting_preferences),
  };
}

export function deriveLegacyFieldsFromCore(core: CoreVoiceProfile) {
  return {
    tone_description: core.tone_summary,
    formality: core.formality,
    personality_traits: core.personality_traits,
    signature_phrases: core.signature_phrases,
    avoid_phrases: core.avoid_phrases,
    formatting_preferences: core.formatting_preferences,
  };
}

function normalizeVoiceExemplar(input: unknown): VoiceExemplar | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!text) return null;

  return {
    id: typeof record.id === "string" && record.id ? record.id : createExemplarId(),
    text,
    source_type:
      record.source_type === "user_post" ||
      record.source_type === "approved_post" ||
      record.source_type === "edited_post" ||
      record.source_type === "generated_post"
        ? record.source_type
        : "generated_post",
    topic: typeof record.topic === "string" ? record.topic : null,
    usage_note: typeof record.usage_note === "string" ? record.usage_note : null,
    quality_score: typeof record.quality_score === "number" ? record.quality_score : 50,
    created_at: typeof record.created_at === "string" ? record.created_at : new Date().toISOString(),
  };
}

function normalizeLearnedPreference(input: unknown): LearnedPreference | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const key = record.key;
  const value = record.value;
  const label = record.label;

  if (
    key !== "post_length" &&
    key !== "paragraph_density" &&
    key !== "structure_style" &&
    key !== "hook_style" &&
    key !== "cta_style" &&
    key !== "directness" &&
    key !== "storytelling_style"
  ) {
    return null;
  }

  if (typeof value !== "string" || typeof label !== "string") return null;

  return {
    key,
    value,
    label,
    evidence_count: typeof record.evidence_count === "number" ? record.evidence_count : 1,
    promoted: typeof record.promoted === "boolean" ? record.promoted : false,
    scope: "global",
    examples: dedupeStrings(Array.isArray(record.examples) ? record.examples.filter((item): item is string => typeof item === "string") : [], 5),
    source_types: Array.isArray(record.source_types)
      ? record.source_types.filter(
          (item): item is PreferenceSignalSource => item === "feedback" || item === "edit",
        )
      : [],
    first_seen_at: typeof record.first_seen_at === "string" ? record.first_seen_at : new Date().toISOString(),
    last_seen_at: typeof record.last_seen_at === "string" ? record.last_seen_at : new Date().toISOString(),
  };
}

export function normalizeProfileStats(input: unknown): VoiceProfileStats {
  if (!input || typeof input !== "object") return { ...DEFAULT_PROFILE_STATS };
  const record = input as Record<string, unknown>;
  return {
    onboarding_sample_count:
      typeof record.onboarding_sample_count === "number" ? record.onboarding_sample_count : DEFAULT_PROFILE_STATS.onboarding_sample_count,
    user_post_count: typeof record.user_post_count === "number" ? record.user_post_count : DEFAULT_PROFILE_STATS.user_post_count,
    approved_post_count:
      typeof record.approved_post_count === "number" ? record.approved_post_count : DEFAULT_PROFILE_STATS.approved_post_count,
    edited_post_count: typeof record.edited_post_count === "number" ? record.edited_post_count : DEFAULT_PROFILE_STATS.edited_post_count,
    last_distilled_at:
      typeof record.last_distilled_at === "string" || record.last_distilled_at === null
        ? (record.last_distilled_at as string | null)
        : DEFAULT_PROFILE_STATS.last_distilled_at,
  };
}

export function createExemplarId(): string {
  return `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createExemplar(
  text: string,
  source_type: VoiceExemplar["source_type"],
  options?: {
    topic?: string | null;
    usage_note?: string | null;
    quality_score?: number;
    created_at?: string;
  },
): VoiceExemplar {
  return {
    id: createExemplarId(),
    text: text.trim(),
    source_type,
    topic: options?.topic ?? null,
    usage_note: options?.usage_note ?? null,
    quality_score: options?.quality_score ?? 70,
    created_at: options?.created_at ?? new Date().toISOString(),
  };
}

export function buildCoreVoiceProfileFromLegacy(profile: VoiceProfile): CoreVoiceProfile {
  if (profile.core_voice_profile) {
    return normalizeCoreVoiceProfile(profile.core_voice_profile);
  }

  const formatRules: VoiceRule[] = [];
  const formatting = normalizeFormattingPreferences(profile.formatting_preferences);
  if (formatting.uses_emojis === false) formatRules.push({ rule: "Does not rely on emojis.", confidence: "medium" });
  if (formatting.uses_emojis === true) formatRules.push({ rule: "Uses emojis sparingly for emphasis.", confidence: "medium" });
  if (formatting.line_break_style === "spaced") formatRules.push({ rule: "Uses whitespace and line breaks to keep the post airy.", confidence: "medium" });
  if (formatting.line_break_style === "dense") formatRules.push({ rule: "Keeps paragraphs tighter with fewer breaks.", confidence: "medium" });
  if (formatting.uses_hashtags === true) formatRules.push({ rule: `Uses ${formatting.hashtag_count || 3} hashtags at the end when appropriate.`, confidence: "low" });
  if (formatting.uses_hashtags === false) formatRules.push({ rule: "Usually skips hashtags in the body copy.", confidence: "medium" });

  return normalizeCoreVoiceProfile({
    tone_summary: profile.tone_description,
    audience_and_intent: "Professional LinkedIn writing that should sound like a real person with a clear point of view.",
    sentence_style_rules: profile.personality_traits.map((trait) => ({ rule: `Bias toward a ${trait} delivery when it fits the topic.`, confidence: "low" })),
    vocabulary_rules: profile.signature_phrases.map((phrase) => ({ rule: `If it fits naturally, phrases can sound like: ${phrase}.`, confidence: "medium" })),
    punctuation_rules: [],
    structure_rules: [],
    hook_rules: [],
    cta_rules: [],
    formatting_rules: formatRules,
    anti_pattern_rules: profile.avoid_phrases.map((phrase) => ({ rule: `Avoid phrasing like: ${phrase}.`, confidence: "high" })),
    personality_traits: profile.personality_traits,
    signature_phrases: profile.signature_phrases,
    avoid_phrases: profile.avoid_phrases,
    formality: profile.formality || "balanced",
    formatting_preferences: formatting,
  });
}

export function normalizeVoiceProfile(profile: VoiceProfile): VoiceProfile {
  const core = buildCoreVoiceProfileFromLegacy(profile);
  const derived = deriveLegacyFieldsFromCore(core);
  const exemplarPosts = Array.isArray(profile.exemplar_posts)
    ? profile.exemplar_posts.map(normalizeVoiceExemplar).filter((item): item is VoiceExemplar => Boolean(item))
    : [];

  const fallbackExemplars = exemplarPosts.length > 0
    ? exemplarPosts
    : (profile.sample_posts || [])
        .filter((post) => post.trim().length > 0)
        .map((post) => createExemplar(post, "user_post", { quality_score: 90, usage_note: "Imported writing sample" }));

  return {
    ...profile,
    voice_profile_version: profile.voice_profile_version || "v2",
    core_voice_profile: core,
    tone_description: derived.tone_description,
    formality: derived.formality,
    personality_traits: derived.personality_traits,
    signature_phrases: derived.signature_phrases,
    avoid_phrases: derived.avoid_phrases,
    formatting_preferences: derived.formatting_preferences,
    exemplar_posts: mergeExemplars(fallbackExemplars, []),
    learned_preferences: Array.isArray(profile.learned_preferences)
      ? profile.learned_preferences.map(normalizeLearnedPreference).filter((item): item is LearnedPreference => Boolean(item))
      : [],
    generation_instruction_pack: profile.generation_instruction_pack || null,
    profile_stats: normalizeProfileStats(profile.profile_stats),
    sample_posts: dedupeStrings(profile.sample_posts || [], 12),
    system_prompt: profile.system_prompt || null,
  };
}

export function mergeExemplars(existing: VoiceExemplar[], additions: VoiceExemplar[], limit = EXEMPLAR_LIMIT): VoiceExemplar[] {
  const merged = [...existing, ...additions]
    .map(normalizeVoiceExemplar)
    .filter((item): item is VoiceExemplar => Boolean(item));

  const deduped = new Map<string, VoiceExemplar>();
  for (const exemplar of merged) {
    const key = exemplar.text.trim().toLowerCase();
    const current = deduped.get(key);
    if (!current || exemplar.quality_score > current.quality_score) {
      deduped.set(key, exemplar);
    }
  }

  return [...deduped.values()]
    .sort((a, b) => {
      if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
}

function getDominantPreferences(preferences: LearnedPreference[]): LearnedPreference[] {
  const promoted = preferences.filter((preference) => preference.promoted);
  const byKey = new Map<VoicePreferenceKey, LearnedPreference>();

  for (const preference of promoted) {
    const current = byKey.get(preference.key);
    if (!current) {
      byKey.set(preference.key, preference);
      continue;
    }

    if (preference.evidence_count > current.evidence_count) {
      byKey.set(preference.key, preference);
      continue;
    }

    if (preference.evidence_count === current.evidence_count && preference.last_seen_at > current.last_seen_at) {
      byKey.set(preference.key, preference);
    }
  }

  return [...byKey.values()];
}

function formatPreferenceRule(preference: LearnedPreference): string {
  switch (preference.key) {
    case "post_length":
      return preference.value === "shorter"
        ? "Default to shorter posts. Target roughly 75-120 words or about 450-700 characters, including the hook and CTA. Cut filler, get to the point fast, and stop once the core insight lands."
        : "Default to longer posts. Target roughly 140-220 words with a fuller body section, unless the current request asks for brevity.";
    case "paragraph_density":
      return preference.value === "more_spaced"
        ? "Bias toward more whitespace and more line breaks by default."
        : "Bias toward denser paragraphing and fewer line breaks by default.";
    case "structure_style":
      return preference.value === "less_structured"
        ? "Keep the structure loose and natural. Avoid rigid templates unless asked."
        : "Make the structure clearer and more deliberate by default.";
    case "hook_style":
      return preference.value === "question_led"
        ? "Default to question-led hooks when the topic allows it."
        : "Default to bold-claim or contrarian hooks when the topic allows it.";
    case "cta_style":
      return preference.value === "lighter_or_none"
        ? "Keep CTAs light, subtle, or omit them unless the prompt calls for one."
        : "Default to ending with a question-based CTA when it fits naturally.";
    case "directness":
      return preference.value === "more_direct"
        ? "Favor direct, punchy phrasing over softened or padded language."
        : "Favor a softer, more nuanced delivery over blunt phrasing.";
    case "storytelling_style":
      return preference.value === "more_story_driven"
        ? "Prefer personal moments and narrative framing over purely tactical delivery."
        : "Prefer tactical takeaways and practical framing over extended storytelling.";
    default:
      return preference.label;
  }
}

function formatRuleSection(title: string, rules: VoiceRule[]): string {
  if (rules.length === 0) return `${title}:\n- No strong rule captured yet.`;
  return `${title}:\n${rules.map((rule) => `- ${rule.rule}`).join("\n")}`;
}

export function compileGenerationInstructionPack(profile: VoiceProfile): string {
  const normalized = normalizeVoiceProfile(profile);
  const core = normalized.core_voice_profile ?? buildCoreVoiceProfileFromLegacy(normalized);
  const dominantPreferences = getDominantPreferences(normalized.learned_preferences);
  const signatureLine = core.signature_phrases.length > 0 ? core.signature_phrases.join(", ") : "none captured yet";
  const avoidLine = core.avoid_phrases.length > 0 ? core.avoid_phrases.join(", ") : "none beyond generic filler";

  const parts = [
    `<role>`,
    `You are a LinkedIn ghostwriter. Write as this specific person, not as a generic LinkedIn creator.`,
    `Always honor the user's explicit request for the current draft over any saved default.`,
    `</role>`,
    "",
    `<voice_profile>`,
    `Tone summary: ${core.tone_summary}`,
    `Audience and intent: ${core.audience_and_intent}`,
    `Formality: ${core.formality}`,
    `Personality traits: ${core.personality_traits.join(", ") || "clear, credible, human"}`,
    `Signature phrases: ${signatureLine}`,
    `Avoid phrases: ${avoidLine}`,
    formatRuleSection("Sentence style", core.sentence_style_rules),
    formatRuleSection("Vocabulary", core.vocabulary_rules),
    formatRuleSection("Punctuation", core.punctuation_rules),
    formatRuleSection("Structure", core.structure_rules),
    formatRuleSection("Hooks", core.hook_rules),
    formatRuleSection("Calls to action", core.cta_rules),
    formatRuleSection("Formatting", core.formatting_rules),
    `</voice_profile>`,
  ];

  if (dominantPreferences.length > 0) {
    parts.push(
      "",
      `<learned_defaults>`,
      `These are learned global defaults from repeated user feedback. Treat them as active instructions for new posts unless the current request explicitly asks for something different.`,
      dominantPreferences.map((preference) => `- ${formatPreferenceRule(preference)}`).join("\n"),
      `</learned_defaults>`,
    );
  }

  parts.push(
    "",
    `<anti_patterns>`,
    formatRuleSection("Avoid", core.anti_pattern_rules),
    `</anti_patterns>`,
    "",
    `<platform_defaults>`,
    LINKEDIN_POST_PRINCIPLES,
    `</platform_defaults>`,
    "",
    `<humanity_guardrails>`,
    HUMANIZER_ANTI_AI_PATTERNS,
    `</humanity_guardrails>`,
    "",
    `<output_contract>`,
    `- Output only the post text. No labels or commentary.`,
    `- Sound like the user on a strong day: specific, credible, and human.`,
    `- NEVER use em dashes (— or –). Use a comma, a period, or rewrite the sentence.`,
    `- Unless the user's current request or promoted learned preferences explicitly indicate otherwise, end with a natural call to action, usually a direct question or low-friction prompt.`,
    `- If voice rules conflict with platform defaults, voice rules win.`,
    `- If learned defaults conflict with platform defaults, learned defaults win.`,
    `- Hashtags, if used at all, belong at the end.`,
    `</output_contract>`,
  );

  return parts.join("\n");
}

function scoreInteraction(interaction: PostInteraction): number {
  const signalCount = interaction.interaction_signals?.length || 0;
  switch (interaction.interaction_type) {
    case "edit":
      return 30 + signalCount;
    case "feedback":
      return 20 + signalCount;
    case "approve":
      return 10;
    default:
      return signalCount;
  }
}

export function buildExemplarPrompt(profile: VoiceProfile): string {
  const exemplars = mergeExemplars(normalizeVoiceProfile(profile).exemplar_posts, []);
  if (exemplars.length === 0) return "";

  const parts = ["<voice_examples>"];
  for (const exemplar of exemplars) {
    parts.push(
      `Example source: ${exemplar.source_type}`,
      `Prompt: Write a LinkedIn post in this person's voice.`,
      `Response:\n${exemplar.text}`,
      "",
    );
  }
  parts.push("</voice_examples>");
  return parts.join("\n");
}

export function buildLearningContext(interactions: PostInteraction[]): string {
  if (interactions.length === 0) return "";

  const ranked = [...interactions]
    .sort((a, b) => scoreInteraction(b) - scoreInteraction(a))
    .slice(0, RECENT_INTERACTION_LIMIT);

  const parts = [
    "<recent_learning>",
    "Use these recent interactions as local guidance for the next draft. Treat direct user edits as the strongest signal.",
  ];

  for (const interaction of ranked) {
    const signalLine = interaction.interaction_signals?.length
      ? `Captured signals: ${interaction.interaction_signals.map((signal) => signal.label).join(", ")}`
      : null;

    if (interaction.interaction_type === "approve") {
      parts.push(
        `Approved post:\n${interaction.final_text}`,
        signalLine || "",
      );
      continue;
    }

    if (interaction.interaction_type === "feedback") {
      parts.push(
        `Feedback revision:`,
        `Original draft:\n${interaction.original_text || ""}`,
        `User feedback: ${interaction.feedback_text || ""}`,
        `Revision:\n${interaction.final_text}`,
        signalLine || "",
      );
      continue;
    }

    parts.push(
      `Direct user edit:`,
      `AI draft:\n${interaction.original_text || ""}`,
      `User version:\n${interaction.final_text}`,
      signalLine || "",
    );
  }

  parts.push("</recent_learning>");
  return parts.filter(Boolean).join("\n\n");
}

function addSignal(signals: VoicePreferenceSignal[], signal: VoicePreferenceSignal) {
  if (signals.some((existing) => existing.key === signal.key && existing.value === signal.value)) {
    return;
  }
  signals.push(signal);
}

function inferSignalsFromText(text: string, source: PreferenceSignalSource): VoicePreferenceSignal[] {
  const signals: VoicePreferenceSignal[] = [];

  for (const pattern of SIGNAL_PATTERNS) {
    if (pattern.patterns.some((regex) => regex.test(text))) {
      addSignal(signals, {
        key: pattern.key,
        value: pattern.value,
        label: pattern.label,
        evidence: text.trim().slice(0, 240),
        source,
      });
    }
  }

  return signals;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function lineCount(text: string): number {
  return text.split("\n").filter((line) => line.trim().length > 0).length;
}

function inferSignalsFromDiff(source: PreferenceSignalSource, originalText?: string | null, finalText?: string | null): VoicePreferenceSignal[] {
  if (!originalText || !finalText) return [];

  const signals: VoicePreferenceSignal[] = [];
  const originalWords = wordCount(originalText);
  const finalWords = wordCount(finalText);

  if (originalWords > 0 && finalWords / originalWords <= 0.8) {
    addSignal(signals, {
      key: "post_length",
      value: "shorter",
      label: "Prefer shorter posts",
      evidence: "User edit materially shortened the post.",
      source,
    });
  }

  if (originalWords > 0 && finalWords / originalWords >= 1.2) {
    addSignal(signals, {
      key: "post_length",
      value: "longer",
      label: "Prefer longer posts",
      evidence: "User edit materially expanded the post.",
      source,
    });
  }

  const originalLines = lineCount(originalText);
  const finalLines = lineCount(finalText);
  if (finalLines >= originalLines + 2) {
    addSignal(signals, {
      key: "paragraph_density",
      value: "more_spaced",
      label: "Prefer more whitespace",
      evidence: "User edit added more line breaks.",
      source,
    });
  }
  if (finalLines + 2 <= originalLines) {
    addSignal(signals, {
      key: "paragraph_density",
      value: "denser",
      label: "Prefer denser paragraphs",
      evidence: "User edit reduced line breaks.",
      source,
    });
  }

  const finalFirstLine = finalText.split("\n").find((line) => line.trim().length > 0)?.trim() || "";
  const originalFirstLine = originalText.split("\n").find((line) => line.trim().length > 0)?.trim() || "";
  if (!originalFirstLine.endsWith("?") && finalFirstLine.endsWith("?")) {
    addSignal(signals, {
      key: "hook_style",
      value: "question_led",
      label: "Prefer question-led hooks",
      evidence: "User edit changed the opening into a question.",
      source,
    });
  }

  return signals;
}

export function extractPreferenceSignals(options: {
  source: PreferenceSignalSource;
  feedbackText?: string | null;
  originalText?: string | null;
  finalText?: string | null;
}): VoicePreferenceSignal[] {
  const textSignals = options.feedbackText ? inferSignalsFromText(options.feedbackText, options.source) : [];
  const diffSignals = inferSignalsFromDiff(options.source, options.originalText, options.finalText);
  const allSignals: VoicePreferenceSignal[] = [];

  for (const signal of [...textSignals, ...diffSignals]) {
    addSignal(allSignals, signal);
  }

  return allSignals;
}

export function mergeLearnedPreferences(
  existing: LearnedPreference[],
  signals: VoicePreferenceSignal[],
  now = new Date().toISOString(),
): LearnedPreference[] {
  const merged = [...existing];

  for (const signal of signals) {
    const match = merged.find((preference) => preference.key === signal.key && preference.value === signal.value);
    if (match) {
      match.evidence_count += 1;
      match.promoted = match.evidence_count >= PROMOTION_THRESHOLD;
      match.examples = dedupeStrings([...match.examples, signal.evidence], 5);
      match.source_types = dedupeStrings([...match.source_types, signal.source]) as PreferenceSignalSource[];
      match.last_seen_at = now;
      continue;
    }

    merged.push({
      key: signal.key,
      value: signal.value,
      label: signal.label,
      evidence_count: 1,
      promoted: false,
      scope: "global",
      examples: dedupeStrings([signal.evidence], 5),
      source_types: [signal.source],
      first_seen_at: now,
      last_seen_at: now,
    });
  }

  return merged.sort((a, b) => {
    if (Number(b.promoted) !== Number(a.promoted)) return Number(b.promoted) - Number(a.promoted);
    if (b.evidence_count !== a.evidence_count) return b.evidence_count - a.evidence_count;
    return b.last_seen_at.localeCompare(a.last_seen_at);
  });
}

export function refreshVoiceProfile(profile: VoiceProfile, options?: {
  appendedSignals?: VoicePreferenceSignal[];
  appendedExemplars?: VoiceExemplar[];
  statsDelta?: Partial<Record<keyof VoiceProfileStats, number>>;
}): Partial<VoiceProfile> {
  const normalized = normalizeVoiceProfile(profile);
  const now = new Date().toISOString();
  const learnedPreferences = options?.appendedSignals?.length
    ? mergeLearnedPreferences(normalized.learned_preferences, options.appendedSignals, now)
    : normalized.learned_preferences;

  const exemplarPosts = mergeExemplars(normalized.exemplar_posts, options?.appendedExemplars || []);
  const profileStats = normalizeProfileStats(normalized.profile_stats);

  if (options?.statsDelta) {
    for (const [key, value] of Object.entries(options.statsDelta) as Array<[keyof VoiceProfileStats, number]>) {
      if (key === "last_distilled_at") continue;
      profileStats[key] = Math.max(0, (profileStats[key] as number) + value) as never;
    }
  }
  profileStats.last_distilled_at = now;

  const nextProfile: VoiceProfile = {
    ...normalized,
    learned_preferences: learnedPreferences,
    exemplar_posts: exemplarPosts,
    profile_stats: profileStats,
  };
  const generationInstructionPack = compileGenerationInstructionPack(nextProfile);

  return {
    voice_profile_version: "v2",
    exemplar_posts: exemplarPosts,
    learned_preferences: learnedPreferences,
    generation_instruction_pack: generationInstructionPack,
    system_prompt: generationInstructionPack,
    profile_stats: profileStats,
    sample_posts: exemplarPosts.map((exemplar) => exemplar.text).slice(0, 12),
    updated_at: now,
  };
}
