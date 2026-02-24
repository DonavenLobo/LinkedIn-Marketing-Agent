import { getTokens } from "./auth";

const API_URL = "http://localhost:3000";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { access_token } = await getTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (access_token) {
    headers["Authorization"] = `Bearer ${access_token}`;
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

/**
 * Parse Vercel AI SDK Data Stream Protocol.
 * Lines starting with `0:` contain JSON-encoded text chunks.
 */
export async function* streamGenerate(
  topic: string
): AsyncGenerator<string, void, unknown> {
  const response = await apiFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Generation failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      // Data stream protocol: text chunks are prefixed with "0:"
      if (line.startsWith("0:")) {
        try {
          const text = JSON.parse(line.slice(2));
          if (typeof text === "string") {
            yield text;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.startsWith("0:")) {
    try {
      const text = JSON.parse(buffer.slice(2));
      if (typeof text === "string") {
        yield text;
      }
    } catch {
      // Skip
    }
  }
}
