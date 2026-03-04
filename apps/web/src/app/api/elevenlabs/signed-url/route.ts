import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  // #region agent log
  fetch("http://127.0.0.1:7287/ingest/fedd4c53-b85c-4f17-97e0-da7859b46f68", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "258c69",
    },
    body: JSON.stringify({
      sessionId: "258c69",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "apps/web/src/app/api/elevenlabs/signed-url/route.ts:GET",
      message: "ElevenLabs env presence check",
      data: {
        hasApiKey: !!apiKey,
        hasAgentId: !!agentId,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  if (!apiKey || !agentId) {
    return NextResponse.json(
      {
        error:
          "ElevenLabs is not configured. Please set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
      },
      { status: 400 },
    );
  }

  try {
    const url = new URL(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
    );
    url.searchParams.set("agent_id", agentId);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();

      // #region agent log
      fetch("http://127.0.0.1:7287/ingest/fedd4c53-b85c-4f17-97e0-da7859b46f68", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "258c69",
        },
        body: JSON.stringify({
          sessionId: "258c69",
          runId: "pre-fix",
          hypothesisId: "H2",
          location:
            "apps/web/src/app/api/elevenlabs/signed-url/route.ts:GET:upstream-error",
          message: "ElevenLabs upstream error when fetching signed URL",
          data: {
            status: res.status,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log

      console.error("ElevenLabs signed-url error:", res.status, body);
      return NextResponse.json(
        { error: "Failed to get ElevenLabs signed URL." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { signed_url: string };

    const signedUrl = data.signed_url;

    // #region agent log
    fetch("http://127.0.0.1:7287/ingest/fedd4c53-b85c-4f17-97e0-da7859b46f68", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "258c69",
      },
      body: JSON.stringify({
        sessionId: "258c69",
        runId: "pre-fix",
        hypothesisId: "H11",
        location:
          "apps/web/src/app/api/elevenlabs/signed-url/route.ts:GET:success",
        message: "Successfully obtained ElevenLabs signed URL (shape only)",
        data: {
          hasSignedUrl: !!signedUrl,
          length: typeof signedUrl === "string" ? signedUrl.length : 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    return NextResponse.json(
      { signedUrl },
      { status: 200 },
    );
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7287/ingest/fedd4c53-b85c-4f17-97e0-da7859b46f68", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "258c69",
      },
      body: JSON.stringify({
        sessionId: "258c69",
        runId: "pre-fix",
        hypothesisId: "H3",
        location:
          "apps/web/src/app/api/elevenlabs/signed-url/route.ts:GET:catch",
        message: "Unexpected error contacting ElevenLabs",
        data: {
          errorName: err instanceof Error ? err.name : "unknown",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    console.error("Error contacting ElevenLabs:", err);
    return NextResponse.json(
      { error: "Unexpected error contacting ElevenLabs." },
      { status: 500 },
    );
  }
}

