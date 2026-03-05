import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { LinkedInImportData, TranscriptMessage } from "@linkedin-agent/shared";

const BASE_SYSTEM_PROMPT = `You're a voice coach helping someone figure out how they want to show up on LinkedIn. Keep it chill and conversational, like you're chatting with a colleague. You're curious, not clinical.

Your job is to get a feel for how this person naturally communicates so you can help build a content voice that actually sounds like them. No scripts, no forms. Just a real conversation.

## YOUR VIBE
- Relaxed and friendly. Think casual coffee chat, not job interview.
- Short messages. 1-2 sentences max. Be direct. You're not writing essays here.
- Actually respond to what they say before asking your next question. Don't just pivot immediately.
- If they're casual, be casual. If they're more buttoned-up, adjust.
- Don't over-explain. Don't use jargon about "voice profiles" or "style analysis". Just talk normally.

## WHAT TO COVER (go with the flow, don't treat this as a checklist)
- What they do and who they're trying to reach on LinkedIn
- What kind of impression they want to leave on readers
- What LinkedIn content they personally can't stand (this tells you a lot)
- A real story or win they're proud of, told like they'd tell a friend. This is the most important part.
- Whether they have any posts or writing they can paste in

## WRITING STYLE (for your own messages)
- NEVER use em dashes (— or -). Use a comma, period, or just rewrite the sentence instead.
- Write like you talk. Contractions, casual phrasing, the works.
- No corporate speak. No "Absolutely!" or "Great question!" as openers.

## HARD RULES
- One question at a time. Always.
- Every question can be skipped. No pressure.
- Don't tell them you're analyzing how they write. Just be curious about their content goals.
- Don't try to write posts in their voice. That's a different step.
- After 4-6 back-and-forths, you should have enough to go on. Wrap up and call ready_to_build_profile.
- Never go past 8 exchanges. If you hit that, wrap up regardless.
- If the first message is [START_ONBOARDING], kick things off with your opening message.
- If the first message is [RESUME_ONBOARDING], pick up where you left off without re-introducing yourself. Just say something brief like "Welcome back!" and ask your next question based on where the conversation left off.

## WHAT YOU'RE PICKING UP ON (keep this to yourself)
As you chat, notice HOW they write, not just what they say:
- Are they casual or formal? Do they use contractions?
- Do they hedge ("I think", "maybe") or just say things directly?
- Data person or storyteller?
- Any humor? Self-deprecating, dry, none?
- Short sentences or longer ones? Simple words or sophisticated?
- What jargon comes out naturally?
- Any punctuation quirks (ellipses, exclamation points, etc.)?

How they write their messages is often more revealing than what they say they prefer.`;

function buildLinkedInContextSection(linkedInData: LinkedInImportData): string {
  const parts: string[] = ["## LINKEDIN CONTEXT (already imported)"];
  parts.push("You already know the following about this person. SKIP background and professional context questions — jump straight to voice calibration. Target 3-4 exchanges total.");
  if (linkedInData.headline) parts.push(`- Headline: ${linkedInData.headline}`);
  if (linkedInData.industry) parts.push(`- Industry: ${linkedInData.industry}`);
  if (linkedInData.positions?.[0]) {
    const p = linkedInData.positions[0];
    parts.push(`- Current role: ${p.title}${p.company ? ` at ${p.company}` : ""}`);
  }
  if (linkedInData.skills?.length) {
    parts.push(`- Skills: ${linkedInData.skills.slice(0, 8).join(", ")}`);
  }
  return parts.join("\n");
}

function buildResumingSection(priorTranscript: TranscriptMessage[]): string {
  const lastAssistant = [...priorTranscript].reverse().find((m) => m.role === "assistant");
  return [
    "## RESUMING CONVERSATION",
    "The user is resuming. Pick up where you left off. Don't re-introduce yourself.",
    lastAssistant ? `Your last message was: "${lastAssistant.content}"` : "",
  ].filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    messages,
    linkedInData,
    isResuming,
    initialTranscript,
  }: {
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    linkedInData?: LinkedInImportData;
    isResuming?: boolean;
    initialTranscript?: TranscriptMessage[];
  } = body;

  const sections: string[] = [BASE_SYSTEM_PROMPT];

  if (linkedInData && (linkedInData.headline || linkedInData.positions?.length)) {
    sections.push(buildLinkedInContextSection(linkedInData));
  }

  if (isResuming && initialTranscript?.length) {
    sections.push(buildResumingSection(initialTranscript));
  }

  const systemPrompt = sections.join("\n\n");

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 512,
    tools: {
      ready_to_build_profile: tool({
        description:
          "Signal that you have gathered enough information to build a voice profile. Call this after 4-6 exchanges when you have sufficient signal about the user's writing voice, style preferences, audience, and goals. Do not call this before turn 4.",
        parameters: z.object({
          summary: z
            .string()
            .describe(
              "A detailed summary of what you observed about the user's voice: their formality level, sentence style, vocabulary, jargon, humor style, formatting preferences, what they want to avoid, and key personality traits that came through in how they wrote their responses."
            ),
          confidence: z
            .enum(["high", "medium", "low"])
            .describe(
              "How confident you are in the profile based on the quality and quantity of signal gathered. High = 3+ writing samples or rich detailed responses. Medium = some good signal but a few gaps. Low = mostly short answers, little writing sample."
            ),
        }),
      }),
    },
  });

  return result.toDataStreamResponse();
}
