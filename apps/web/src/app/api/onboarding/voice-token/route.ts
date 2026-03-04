import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { user, error } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    return NextResponse.json(
      { error: "Voice onboarding is not configured" },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
    url.searchParams.set("agent_id", agentId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("ElevenLabs signed URL error:", errBody);
      return NextResponse.json(
        { error: "Failed to initialize voice session" },
        { status: 502, headers: corsHeaders }
      );
    }

    const data = await response.json();

    return NextResponse.json(
      { signedUrl: data.signed_url, agentId },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Voice token error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
