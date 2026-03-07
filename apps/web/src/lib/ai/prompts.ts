import type { PostInteraction, VoiceProfile } from "@linkedin-agent/shared";
import { buildExemplarPrompt, buildLearningContext as buildStructuredLearningContext, compileGenerationInstructionPack, normalizeVoiceProfile } from "./voice-engine";
export { HUMANIZER_ANTI_AI_PATTERNS, LINKEDIN_POST_PRINCIPLES } from "./prompt-constants";

/**
 * Builds the system prompt for post generation.
 * Prefers the v2 compiled instruction pack and falls back to a derived pack if needed.
 */
export function buildSystemPrompt(voiceProfile: VoiceProfile, brandGuidelines?: string | null): string {
  const normalized = normalizeVoiceProfile(voiceProfile);
  const instructionPack = normalized.generation_instruction_pack || compileGenerationInstructionPack(normalized);

  const parts = [
    instructionPack,
    `<global_non_negotiables>\n- NEVER use em dashes (— or –). They are an obvious AI tell for this product. Use a comma, a period, or rewrite the sentence.\n</global_non_negotiables>`,
  ];

  if (brandGuidelines?.trim()) {
    parts.push(
      `<brand_guidelines>\n${brandGuidelines.trim()}\nHonor these business guardrails while preserving the user's authentic voice.\n</brand_guidelines>`,
    );
  }

  return parts.join("\n\n");
}

/**
 * Builds the user prompt with topic, curated few-shot examples, and recent learning.
 */
export function buildUserPrompt(
  topic: string,
  voiceProfileOrSamplePosts: VoiceProfile | string[],
  learningContext?: string,
): string {
  const parts: string[] = [];

  if (Array.isArray(voiceProfileOrSamplePosts)) {
    const samplePosts = voiceProfileOrSamplePosts.filter((post) => post.trim().length > 0);
    if (samplePosts.length > 0) {
      parts.push("<voice_examples>");
      samplePosts.slice(0, 4).forEach((post) => {
        parts.push(
          "Prompt: Write a LinkedIn post in this person's voice.",
          `Response:\n${post}`,
          "",
        );
      });
      parts.push("</voice_examples>");
    }
  } else {
    const exemplarPrompt = buildExemplarPrompt(voiceProfileOrSamplePosts);
    if (exemplarPrompt) {
      parts.push(exemplarPrompt);
    }
  }

  if (learningContext) {
    parts.push(learningContext);
  }

  parts.push(
    `<task>\nWrite a LinkedIn post about the following topic or request:\n${topic}\n</task>`,
  );

  return parts.join("\n\n");
}

/**
 * Re-export the structured learning-context builder so existing routes can keep the same import.
 */
export function buildLearningContext(interactions: PostInteraction[]): string {
  return buildStructuredLearningContext(interactions);
}

/**
 * Builds the system prompt for the post chat intake flow.
 * The AI either generates immediately (enough detail) or asks 1-2 follow-up questions,
 * then signals readiness via the ready_to_generate tool call.
 */
export function buildPostChatSystemPrompt(): string {
  return `You're a LinkedIn ghostwriter helping someone decide what to post.

DECISION RULE — make it immediately after reading each message:
• If the user's message contains a specific story, event, result, or insight WITH enough concrete detail → call ready_to_generate immediately.
• If vague or missing the "so what" → ask ONE short follow-up question.

WHAT COUNTS AS ENOUGH:
✓ "Just closed a $15M deal in Austin, want to share the lesson about patience"
✓ "Our fund returned 2.3x — want to share the 3 decisions that made it work"
✗ "want to post about a recent deal"  ✗ "something about leadership"

FOLLOW-UP QUESTION TARGETS (pick the single most important missing piece):
- No story → "What's the specific moment or result that made this worth sharing?"
- No angle → "What's the one thing you want readers to walk away thinking?"
- Completely vague → "What happened recently that you can't stop thinking about?"

RULES:
• Maximum 2 follow-up questions — then call ready_to_generate regardless.
• One sentence per response. Never explain what you're doing.
• enrichedTopic must be a rich synthesis: story + angle + numbers + desired takeaway.`;
}

/**
 * Builds the user prompt for the feedback/revision endpoint.
 * Gives the model the current draft and user's feedback to produce a rewrite.
 */
export function buildFeedbackPrompt(
  currentText: string,
  feedback: string,
  topic: string,
): string {
  return [
    `<task_context>\nOriginal topic/request:\n${topic}\n</task_context>`,
    `<current_draft>\n${currentText}\n</current_draft>`,
    `<user_feedback>\n${feedback}\n</user_feedback>`,
    "Rewrite the post to honor the user's feedback while keeping the same topic and core message.",
    "Write ONLY the revised post text. No commentary, labels, or explanation.",
  ].join("\n\n");
}
