// ---- Database row types (matches Supabase schema) ----

export interface UserProfile {
  id: string;
  display_name: string | null;
  linkedin_headline: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  brand_guidelines: string | null;
  created_at: string;
  updated_at: string;
}

export type VoiceConfidence = "high" | "medium" | "low";
export type VoiceProfileVersion = "v1" | "v2";
export type VoicePreferenceKey =
  | "post_length"
  | "paragraph_density"
  | "structure_style"
  | "hook_style"
  | "cta_style"
  | "directness"
  | "storytelling_style";
export type VoiceExemplarSource = "user_post" | "approved_post" | "edited_post" | "generated_post";
export type PreferenceSignalSource = "feedback" | "edit";

export interface FormattingPreferences {
  uses_emojis?: boolean;
  line_break_style?: "dense" | "spaced" | "mixed";
  uses_hashtags?: boolean;
  hashtag_count?: number;
}

export interface VoiceRule {
  rule: string;
  confidence: VoiceConfidence;
  evidence?: string;
}

export interface CoreVoiceProfile {
  tone_summary: string;
  audience_and_intent: string;
  sentence_style_rules: VoiceRule[];
  vocabulary_rules: VoiceRule[];
  punctuation_rules: VoiceRule[];
  structure_rules: VoiceRule[];
  hook_rules: VoiceRule[];
  cta_rules: VoiceRule[];
  formatting_rules: VoiceRule[];
  anti_pattern_rules: VoiceRule[];
  personality_traits: string[];
  signature_phrases: string[];
  avoid_phrases: string[];
  formality: "casual" | "balanced" | "formal";
  formatting_preferences: FormattingPreferences;
}

export interface VoiceExemplar {
  id: string;
  text: string;
  source_type: VoiceExemplarSource;
  topic?: string | null;
  usage_note?: string | null;
  quality_score: number;
  created_at: string;
}

export interface VoicePreferenceSignal {
  key: VoicePreferenceKey;
  value: string;
  label: string;
  evidence: string;
  source: PreferenceSignalSource;
}

export interface LearnedPreference {
  key: VoicePreferenceKey;
  value: string;
  label: string;
  evidence_count: number;
  promoted: boolean;
  scope: "global";
  examples: string[];
  source_types: PreferenceSignalSource[];
  first_seen_at: string;
  last_seen_at: string;
}

export interface VoiceProfileStats {
  onboarding_sample_count: number;
  user_post_count: number;
  approved_post_count: number;
  edited_post_count: number;
  last_distilled_at: string | null;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  tone_description: string | null;
  formality: "casual" | "balanced" | "formal" | null;
  personality_traits: string[];
  signature_phrases: string[];
  avoid_phrases: string[];
  formatting_preferences: FormattingPreferences;
  sample_posts: string[];
  system_prompt: string | null;
  voice_profile_version: VoiceProfileVersion | null;
  core_voice_profile: CoreVoiceProfile | null;
  exemplar_posts: VoiceExemplar[];
  learned_preferences: LearnedPreference[];
  generation_instruction_pack: string | null;
  profile_stats: VoiceProfileStats | null;
  onboarding_answers: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GeneratedPost {
  id: string;
  user_id: string;
  voice_profile_id: string | null;
  user_input: string;
  generated_text: string;
  model_used: string | null;
  tokens_used: number | null;
  status: "draft" | "approved" | "revised";
  created_at: string;
}

export interface PostInteraction {
  id: string;
  user_id: string;
  generated_post_id: string;
  voice_profile_id: string | null;
  interaction_type: "approve" | "feedback" | "edit";
  final_text: string;
  feedback_text: string | null;
  original_text: string | null;
  revision_count: number;
  interaction_signals: VoicePreferenceSignal[] | null;
  created_at: string;
}

// ---- API types ----

export interface GenerateRequest {
  topic: string;
  voice_profile_id?: string;
}

/** @deprecated Used by old 7-step onboarding. Kept for backward compat with existing voice profiles. */
export interface OnboardingAnswers {
  name: string;
  role_description: string;
  goals: string[];
  target_audience: string;
  tone_words: string[];
  writing_sample: string;
  additional_samples: string[];
}

// ---- AI-driven onboarding types ----

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProfileToolData {
  summary: string;
  confidence: "high" | "medium" | "low";
}

export interface AnalyzeRequest {
  transcript: TranscriptMessage[];
  toolData: ProfileToolData;
  userId: string;
  writingSamples?: string[];
  sessionId?: string;
}

// ---- Onboarding session types ----

export interface OnboardingSession {
  id: string;
  user_id: string;
  status: "in_progress" | "completed" | "abandoned";
  mode: "voice" | "text";
  transcript: TranscriptMessage[];
  turn_count: number;
  linkedin_import: LinkedInImportData | null;
  tool_data: ProfileToolData | null;
  writing_samples: string[];
  created_at: string;
  updated_at: string;
}

export interface LinkedInPosition {
  title: string;
  company: string;
  description: string | null;
}

export interface LinkedInImportData {
  headline: string | null;
  summary: string | null;
  industry: string | null;
  firstName: string | null;
  lastName: string | null;
  positions: LinkedInPosition[];
  skills: string[];
}

// ---- Database type for Supabase client ----

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & { id: string };
        Update: Partial<UserProfile>;
      };
      voice_profiles: {
        Row: VoiceProfile;
        Insert: Partial<VoiceProfile> & { user_id: string };
        Update: Partial<VoiceProfile>;
      };
      generated_posts: {
        Row: GeneratedPost;
        Insert: Partial<GeneratedPost> & { user_id: string; user_input: string; generated_text: string };
        Update: Partial<GeneratedPost>;
      };
      post_interactions: {
        Row: PostInteraction;
        Insert: Partial<PostInteraction> & {
          user_id: string;
          generated_post_id: string;
          interaction_type: PostInteraction["interaction_type"];
          final_text: string;
        };
        Update: Partial<PostInteraction>;
      };
    };
  };
}
