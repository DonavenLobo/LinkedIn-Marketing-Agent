/**
 * Platform defaults for strong LinkedIn posts.
 * These are starting rules, not hard constraints. Promoted user preferences
 * and explicit current-request instructions are allowed to override them.
 */
export const LINKEDIN_POST_PRINCIPLES = `
LINKEDIN PLATFORM DEFAULTS (starting point, override when the user's voice or explicit request calls for it):

LENGTH & THE "SEE MORE" FOLD
- Default sweet spot: 600-900 characters (~100-150 words) unless the user's saved preferences or current request call for a different length.
- The first ~210 characters appear before the "See more" button. Make the opening earn the click.

HOOKS
- Default to one of these if the user has not established another opening pattern: bold claim, direct question, surprising number, immediate personal moment, or contrarian take.
- Front-load the point in the first 2-3 lines.

STRUCTURE & MOBILE READABILITY
- Use short paragraphs with breathing room by default.
- Keep sentence rhythm varied. Most sentences should stay easy to scan on mobile.
- Lead with the strongest insight, then expand.

CALLS TO ACTION
- By default, include a call to action in the closing lines of the first generated draft.
- Favor low-friction CTAs: a direct question, an invitation to weigh in, or a conversational prompt.
- CTAs should feel natural, not salesy.
- Only omit the CTA if the user explicitly asks to omit it or if saved learned preferences indicate they consistently do not want one.

HASHTAGS
- If used, place them at the very end of the post.

ANTI-PATTERNS
- Do not open with "I'm excited to announce..."
- Do not include external links in the body.
- Do not write a wall of text with no spacing.
- Prefer concrete stories, observations, and lessons over generic business filler.`.trim();

/**
 * Lowest-priority anti-generic cleanup. This should reduce obvious AI tells
 * without overriding an authentic user voice profile.
 */
export const HUMANIZER_ANTI_AI_PATTERNS = `
HUMANITY GUARDRAILS (lowest priority, authentic user voice wins):

- Avoid generic throat-clearing like "In today's fast-paced world" or "It's worth noting that".
- Avoid unsupported attributions like "studies show" or "experts say" unless you name the source.
- Avoid rigid template moves like "It's not X. It's Y." unless the user's actual writing genuinely uses them.
- Avoid empty corporate filler, vague superlatives, and inflated adjectives.
- Prefer specifics over abstractions: real numbers, real moments, real stakes.
- Vary sentence rhythm and paragraph length so the post does not sound mechanically even.
- Do not end with a canned inspirational closing.
- If a line feels like something anyone on LinkedIn could have posted, make it more specific or cut it.`.trim();
