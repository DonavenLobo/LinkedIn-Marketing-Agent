import type { VoiceProfile, PostInteraction } from "@linkedin-agent/shared";

/**
 * Research-backed best practices for effective LinkedIn text posts.
 * Injected into the system prompt as platform strategy guidance.
 * NOTE: Voice profile settings (emojis, tone, etc.) always take precedence over these principles.
 */
export const LINKEDIN_POST_PRINCIPLES = `
LINKEDIN PLATFORM PRINCIPLES (text posts only):

LENGTH & THE "SEE MORE" FOLD
- Sweet spot: 1,200-1,800 characters (~200-300 words). Over 2,000 sees diminishing returns; max is 3,000.
- The first ~210 characters appear before the "See more" button. This is your most valuable real estate. Treat it like a headline — it must earn the click.

HOOK FORMULAS (pick one that fits the topic and voice):
- Surprising stat or data point: lead with a number that challenges assumptions
- Contrarian take: "Everything you've been told about X is wrong"
- Personal story opener: "I got fired 3 years ago..." (specific, vulnerable, immediate)
- Direct question: "What's the one thing you'd change about X?"
- Bold declarative claim: "You don't need a content calendar. You need a content philosophy."

STRUCTURE & MOBILE FORMATTING
- Front-load the key message in the first 2-3 lines
- Short paragraphs: 1-2 sentences max, with a blank line between each
- Short sentences: aim for under 12 words for scanability on mobile
- White space is your friend — even long posts should feel light and airy
- Simple, accessible language; no jargon unless the audience genuinely expects it

CALLS TO ACTION
- Question-based: "What's your biggest challenge with [topic]?"
- Debate-sparking: "Agree or disagree? Drop your take below."
- Low-friction: "Drop a comment if this resonates"
- CTAs should feel conversational and natural, never salesy or transactional

HASHTAGS
- Place hashtags at the very end of the post, never scattered throughout the body
- Avoid generic engagement hashtags (#Follow, #Like, #Comment)

ANTI-PATTERNS (never do these)
- Never open with "I'm excited to announce..." — it's the most overused phrase on LinkedIn
- Never include external links in the post body (LinkedIn's algorithm suppresses reach for outbound links)
- Never write walls of text with no line breaks
- Storytelling and personal lessons outperform generic business advice — humanize the message`.trim();

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

  // Platform strategy principles (voice profile rules above take precedence)
  parts.push(`\n${LINKEDIN_POST_PRINCIPLES}`);

  parts.push(
    "\nIMPORTANT RULES:",
    "- Write ONLY the post text. No titles, labels, or meta-commentary.",
    "- Sound human and authentic, never robotic or corporate.",
    "- NEVER use em dashes (— or –). They are a dead giveaway of AI writing. Use a comma, period, or rewrite the sentence instead.",
  );

  return parts.join("\n");
}

/**
 * Builds the user prompt with topic, optional few-shot examples, and optional learning context.
 */
export function buildUserPrompt(
  topic: string,
  samplePosts: string[],
  learningContext?: string
): string {
  const parts: string[] = [];

  if (samplePosts.length > 0) {
    parts.push("Here are examples of posts in my voice:\n");
    samplePosts.forEach((post, i) => {
      parts.push(`Example ${i + 1}:\n${post}\n`);
    });
    parts.push("---\n");
  }

  if (learningContext) {
    parts.push(learningContext);
  }

  parts.push(
    `Write a LinkedIn post about the following topic: ${topic}`
  );

  return parts.join("\n");
}

/**
 * Transforms recent post interactions into a few-shot learning context block.
 * Injected into buildUserPrompt so approved posts, feedback revisions, and edits
 * progressively improve voice mimicking over time.
 */
export function buildLearningContext(interactions: PostInteraction[]): string {
  if (interactions.length === 0) return "";

  const parts: string[] = [
    "--- VOICE LEARNING FROM PAST INTERACTIONS ---",
    "The user has provided feedback on previous posts. Use these signals to better match their voice:\n",
  ];

  for (const interaction of interactions.slice(0, 8)) {
    switch (interaction.interaction_type) {
      case "approve":
        parts.push(
          `APPROVED POST (the user was happy with this — match this style and tone):\n${interaction.final_text}\n`
        );
        break;
      case "feedback":
        parts.push(
          `FEEDBACK EXAMPLE:\n` +
          `Original draft: ${interaction.original_text}\n` +
          `User's feedback: "${interaction.feedback_text}"\n` +
          `Revised version they accepted: ${interaction.final_text}\n`
        );
        break;
      case "edit":
        parts.push(
          `EDIT EXAMPLE (the user manually changed the text — pay close attention to what they changed and why):\n` +
          `AI wrote: ${interaction.original_text}\n` +
          `User changed it to: ${interaction.final_text}\n`
        );
        break;
    }
  }

  parts.push("--- END VOICE LEARNING ---\n");
  return parts.join("\n");
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
  topic: string
): string {
  return [
    `Here is a LinkedIn post I generated about: ${topic}\n`,
    `Current version:\n${currentText}\n`,
    `The user wants these changes: "${feedback}"\n`,
    `Rewrite the post incorporating their feedback while keeping the same topic and core message.`,
    `Write ONLY the revised post text. No commentary, labels, or explanation.`,
  ].join("\n");
}
