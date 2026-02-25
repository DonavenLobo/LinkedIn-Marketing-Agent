import type { VoiceProfile } from "@linkedin-agent/shared";

/**
 * Builds the system prompt for post generation.
 * This is the key module to iterate on — currently uses the voice profile's
 * stored system_prompt plus few-shot examples from sample_posts.
 *
 * Future: accept a "case folder" of curated tone/voice examples.
 */
export function buildSystemPrompt(voiceProfile: VoiceProfile): string {
  const parts: string[] = [];

  // Use the AI-generated system prompt from onboarding
  if (voiceProfile.system_prompt) {
    parts.push(voiceProfile.system_prompt);
  } else {
    // Fallback if no system prompt exists
    parts.push(
      `You are a LinkedIn ghostwriter. Write posts that sound like this person:`,
      `Tone: ${voiceProfile.tone_description || "professional and authentic"}`,
      `Style: ${voiceProfile.formality || "balanced"}`,
      `Traits: ${voiceProfile.personality_traits?.join(", ") || "professional"}`
    );
  }

  // Formatting instructions
  const fmt = voiceProfile.formatting_preferences;
  const formatInstructions: string[] = [];
  if (fmt?.uses_emojis === false) formatInstructions.push("Do NOT use emojis.");
  if (fmt?.uses_emojis === true) formatInstructions.push("Use emojis sparingly for emphasis.");
  if (fmt?.line_break_style === "spaced") formatInstructions.push("Use line breaks between ideas for readability.");
  if (fmt?.line_break_style === "dense") formatInstructions.push("Keep paragraphs together, minimal line breaks.");
  if (fmt?.uses_hashtags === true) formatInstructions.push(`Include ${fmt.hashtag_count || 3} relevant hashtags at the end.`);
  if (fmt?.uses_hashtags === false) formatInstructions.push("Do NOT include hashtags.");

  if (formatInstructions.length > 0) {
    parts.push("\nFORMATTING:\n" + formatInstructions.join("\n"));
  }

  // Phrases to avoid
  if (voiceProfile.avoid_phrases?.length > 0) {
    parts.push(
      `\nNEVER use these phrases: ${voiceProfile.avoid_phrases.join(", ")}`
    );
  }

  // Signature phrases to incorporate naturally
  if (voiceProfile.signature_phrases?.length > 0) {
    parts.push(
      `\nNaturally incorporate phrases like: ${voiceProfile.signature_phrases.join(", ")}`
    );
  }

  parts.push(
    "\nIMPORTANT RULES:",
    "- Write ONLY the post text. No titles, labels, or meta-commentary.",
    "- Keep posts between 100-300 words (LinkedIn sweet spot).",
    "- Open with a strong hook (first line matters most).",
    "- End with a question or call-to-action to drive engagement.",
    "- Sound human and authentic, never robotic or corporate.",
    "- NEVER use em dashes (— or –). They are a dead giveaway of AI writing. Use a comma, period, or rewrite the sentence instead.",
  );

  return parts.join("\n");
}

/**
 * Builds the user prompt with topic and optional few-shot examples.
 */
export function buildUserPrompt(
  topic: string,
  samplePosts: string[]
): string {
  const parts: string[] = [];

  if (samplePosts.length > 0) {
    parts.push("Here are examples of posts in my voice:\n");
    samplePosts.forEach((post, i) => {
      parts.push(`Example ${i + 1}:\n${post}\n`);
    });
    parts.push("---\n");
  }

  parts.push(
    `Write a LinkedIn post about the following topic: ${topic}`
  );

  return parts.join("\n");
}
