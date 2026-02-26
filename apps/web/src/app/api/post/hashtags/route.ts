import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getAuthUser, corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { user, error } = await getAuthUser(request);
  if (!user)
    return Response.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );

  const { post_content } = await request.json();

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    temperature: 0.3,
    maxTokens: 80,
    prompt: `Analyze this LinkedIn post and generate 3–5 strategic hashtags.

HASHTAG RULES (from LinkedIn best practices):
- Total: exactly 3–5 hashtags
- Mix: 1 personal/professional niche hashtag for the author, 2–3 specific industry or topic hashtags directly relevant to the post content, 1 broader hashtag for wider discoverability
- NEVER use generic engagement hashtags: #Follow #Like #Comment #Motivation #Inspiration #Success #Business
- Make them specific: prefer #MultifamilyInvesting over #RealEstate, #PEFund over #Finance
- Return ONLY the hashtags, one per line, each starting with #. No explanation, no commentary.

Post:
${post_content}`,
  });

  const hashtags = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("#"))
    .slice(0, 5);

  return Response.json({ hashtags }, { headers: corsHeaders });
}
