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
  onboarding_answers: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FormattingPreferences {
  uses_emojis?: boolean;
  line_break_style?: "dense" | "spaced" | "mixed";
  uses_hashtags?: boolean;
  hashtag_count?: number;
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
        Insert: Partial<PostInteraction> & { user_id: string; generated_post_id: string; interaction_type: PostInteraction["interaction_type"]; final_text: string };
        Update: Partial<PostInteraction>;
      };
    };
  };
}
