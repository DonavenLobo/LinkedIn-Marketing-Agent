import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { LinkedInImportData } from "@linkedin-agent/shared";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const linkedInSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  industry: z.string().nullable(),
  positions: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      description: z.string().nullable(),
    })
  ),
  skills: z.array(z.string()),
});

const EXTRACT_PROMPT = `Extract LinkedIn profile information from the provided content.
Return null for any fields you cannot confidently extract.
Focus on:
- Full name (first/last)
- Professional headline
- About/Summary section
- Work experience (title, company, description for each role)
- Education background (include as positions with title=degree, company=institution if present)
- Skills or areas of expertise
- Industry

Be thorough — extract everything you can find. Return empty arrays (not null) for positions and skills if none found.`;

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    const text = formData.get("text") as string | null;
    const screenshotFiles = formData.getAll("screenshots") as File[];

    if (!text?.trim() && screenshotFiles.length === 0) {
      return NextResponse.json(
        { error: "Please provide some profile text or at least one screenshot." },
        { status: 400, headers: corsHeaders }
      );
    }

    type TextPart = { type: "text"; text: string };
    type ImagePart = { type: "image"; image: Uint8Array; mimeType: string };
    type ContentPart = TextPart | ImagePart;

    let extracted: z.infer<typeof linkedInSchema>;

    if (screenshotFiles.length > 0) {
      const contentParts: ContentPart[] = [];

      // Add all screenshot images
      for (const file of screenshotFiles) {
        const buffer = await file.arrayBuffer();
        contentParts.push({
          type: "image",
          image: new Uint8Array(buffer),
          mimeType: (file.type || "image/jpeg") as string,
        });
      }

      // Add text prompt (with pasted text if provided)
      if (text?.trim()) {
        contentParts.push({
          type: "text",
          text: `Also consider this pasted text from the user:\n\n${text}\n\n${EXTRACT_PROMPT}`,
        });
      } else {
        contentParts.push({ type: "text", text: EXTRACT_PROMPT });
      }

      const result = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        schema: linkedInSchema,
        temperature: 0.2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: [{ role: "user", content: contentParts as any }],
      });
      extracted = result.object;
    } else {
      const result = await generateObject({
        model: anthropic("claude-sonnet-4-6"),
        schema: linkedInSchema,
        temperature: 0.2,
        prompt: `${EXTRACT_PROMPT}\n\nProfile content:\n\n${text}`,
      });
      extracted = result.object;
    }

    const importData: LinkedInImportData = {
      firstName: extracted.firstName,
      lastName: extracted.lastName,
      headline: extracted.headline,
      summary: extracted.summary,
      industry: extracted.industry,
      positions: extracted.positions.map((p) => ({
        title: p.title,
        company: p.company,
        description: p.description,
      })),
      skills: extracted.skills,
    };

    const fieldsFound: string[] = [];
    if (importData.firstName || importData.lastName) fieldsFound.push("name");
    if (importData.headline) fieldsFound.push("headline");
    if (importData.summary) fieldsFound.push("summary");
    if (importData.industry) fieldsFound.push("industry");
    if (importData.positions.length)
      fieldsFound.push(
        `${importData.positions.length} position${importData.positions.length !== 1 ? "s" : ""}`
      );
    if (importData.skills.length)
      fieldsFound.push(
        `${importData.skills.length} skill${importData.skills.length !== 1 ? "s" : ""}`
      );

    if (!fieldsFound.length) {
      return NextResponse.json(
        {
          error:
            "No LinkedIn profile information could be extracted. Please try adding more detail or a clearer screenshot.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Save to user_profiles
    await supabase
      .from("user_profiles")
      .update({ linkedin_import_data: importData, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    // Also update active in_progress session if one exists
    const { data: activeSession } = await supabase
      .from("onboarding_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .limit(1)
      .maybeSingle();

    if (activeSession) {
      await supabase
        .from("onboarding_sessions")
        .update({ linkedin_import: importData, updated_at: new Date().toISOString() })
        .eq("id", activeSession.id);
    }

    return NextResponse.json({ importedData: importData, fieldsFound }, { headers: corsHeaders });
  } catch (err) {
    console.error("LinkedIn import error:", err);
    return NextResponse.json(
      { error: "Failed to extract profile information. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
