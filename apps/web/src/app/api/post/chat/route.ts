import { streamText, StreamData, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import { buildPostChatSystemPrompt } from "@/lib/ai/prompts";

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const { user, error } = await getAuthUser(request);
  if (!user) {
    return Response.json(
      { error: error || "Not authenticated" },
      { status: 401, headers: corsHeaders }
    );
  }

  const { messages } = await request.json();
  const streamData = new StreamData();

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: buildPostChatSystemPrompt(),
    messages,
    temperature: 0.3,
    maxTokens: 200,
    maxSteps: 1,
    tools: {
      ready_to_generate: tool({
        description:
          "Call when you have enough context. Call immediately if the first message has sufficient detail.",
        parameters: z.object({
          enrichedTopic: z
            .string()
            .describe(
              "Rich synthesis: story + angle + numbers + desired takeaway."
            ),
        }),
        execute: async ({ enrichedTopic }) => {
          streamData.append({ enrichedTopic });
          return { ok: true };
        },
      }),
    },
    onFinish: () => {
      streamData.close();
    },
  });

  const response = result.toDataStreamResponse({ data: streamData });
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}
