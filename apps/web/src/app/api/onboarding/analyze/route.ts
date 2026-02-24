import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { OnboardingAnswers } from "@linkedin-agent/shared";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { answers, userId } = body as {
      answers: OnboardingAnswers;
      userId: string;
    };

    if (!answers || !userId) {
      return NextResponse.json(
        { error: "Missing answers or userId" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS for this server-side operation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build the analysis prompt
    const analysisPrompt = `You are a voice analysis expert. Analyze the following onboarding answers from a LinkedIn user and create a detailed voice profile.

USER ANSWERS:
- Name: ${answers.name}
- Role/Industry: ${answers.role_description}
- LinkedIn Goals: ${answers.goals.join(", ")}
- Target Audience: ${answers.target_audience}
- Desired Tone: ${answers.tone_words.join(", ")}
- Writing Sample: ${answers.writing_sample}
${answers.additional_samples.length > 0 ? `- Additional Samples:\n${answers.additional_samples.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}` : ""}

Based on this, create a JSON voice profile with these fields:
{
  "tone_description": "2-3 sentence natural language description of their writing voice",
  "formality": "casual" | "balanced" | "formal",
  "personality_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "signature_phrases": ["phrases they naturally use, extracted from samples"],
  "avoid_phrases": ["generic LinkedIn cliches to avoid based on their style"],
  "formatting_preferences": {
    "uses_emojis": boolean,
    "line_break_style": "dense" | "spaced" | "mixed",
    "uses_hashtags": boolean,
    "hashtag_count": number
  },
  "system_prompt": "A detailed ghostwriter instruction (3-4 paragraphs) that captures this person's exact voice, style, vocabulary, and preferences. This prompt will be used as a system message when generating LinkedIn posts. Include specific instructions about tone, sentence structure, vocabulary level, formatting habits, and what makes their voice unique."
}

Respond ONLY with valid JSON, no markdown formatting or code blocks.`;

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: analysisPrompt,
      temperature: 0.3,
    });

    // Parse the AI response
    let voiceData;
    try {
      // Strip any markdown code blocks if present
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      voiceData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse voice analysis" },
        { status: 500 }
      );
    }

    // Store voice profile in database
    const { data: voiceProfile, error: insertError } = await supabase
      .from("voice_profiles")
      .insert({
        user_id: userId,
        name: "Default",
        is_active: true,
        tone_description: voiceData.tone_description,
        formality: voiceData.formality,
        personality_traits: voiceData.personality_traits || [],
        signature_phrases: voiceData.signature_phrases || [],
        avoid_phrases: voiceData.avoid_phrases || [],
        formatting_preferences: voiceData.formatting_preferences || {},
        sample_posts: [
          answers.writing_sample,
          ...answers.additional_samples,
        ].filter(Boolean),
        system_prompt: voiceData.system_prompt,
        onboarding_answers: answers as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert voice profile:", insertError);
      return NextResponse.json(
        { error: "Failed to save voice profile" },
        { status: 500 }
      );
    }

    // Mark onboarding as complete
    await supabase
      .from("user_profiles")
      .update({
        onboarding_complete: true,
        display_name: answers.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return NextResponse.json({ voice_profile: voiceProfile });
  } catch (error) {
    console.error("Onboarding analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
