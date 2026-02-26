import { getTokens, refreshTokens } from "./auth";

const API_URL = "http://localhost:3000";

async function makeRequest(
  path: string,
  options: RequestInit,
  token: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${path}`, { ...options, headers });
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { access_token } = await getTokens();

  let response = await makeRequest(path, options, access_token);

  // On 401, attempt a token refresh once and retry.
  if (response.status === 401) {
    const newToken = await refreshTokens();
    if (newToken) {
      response = await makeRequest(path, options, newToken);
    }
  }

  return response;
}

/**
 * Shared stream line parser. Yields text chunks (0: lines).
 * Calls onAnnotation for data annotation lines (2: lines) — used to extract postId.
 */
async function* parseDataStream(
  response: Response,
  onAnnotation?: (annotation: Record<string, unknown>) => void
): AsyncGenerator<string, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = function* (line: string): Generator<string> {
    if (line.startsWith("0:")) {
      try {
        const text = JSON.parse(line.slice(2));
        if (typeof text === "string") yield text;
      } catch {
        // Skip malformed lines
      }
    } else if (line.startsWith("2:") && onAnnotation) {
      try {
        const annotations = JSON.parse(line.slice(2));
        if (Array.isArray(annotations)) {
          for (const ann of annotations) {
            if (ann && typeof ann === "object") {
              onAnnotation(ann as Record<string, unknown>);
            }
          }
        }
      } catch {
        // Skip malformed annotation lines
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      yield* processLine(line);
    }
  }

  if (buffer) {
    yield* processLine(buffer);
  }
}

/**
 * Stream a new post generation.
 * Yields text chunks. Calls onPostId when the saved post ID arrives via stream data.
 */
export async function* streamGenerate(
  topic: string,
  onPostId?: (postId: string) => void
): AsyncGenerator<string, void, unknown> {
  const response = await apiFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Generation failed");
  }

  yield* parseDataStream(response, (ann) => {
    if (typeof ann.postId === "string" && onPostId) {
      onPostId(ann.postId);
    }
  });
}

/**
 * Stream a feedback-driven rewrite of an existing post.
 * Yields text chunks of the revised post.
 */
export async function* streamFeedback(
  generatedPostId: string,
  currentText: string,
  feedback: string,
  topic: string
): AsyncGenerator<string, void, unknown> {
  const response = await apiFetch("/api/post/feedback", {
    method: "POST",
    body: JSON.stringify({
      generated_post_id: generatedPostId,
      feedback,
      current_text: currentText,
      topic,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Feedback failed");
  }

  yield* parseDataStream(response);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a message in the post chat intake flow.
 * Streams AI response chunks via onChunk; calls onReadyToGenerate when the
 * ready_to_generate tool fires (via the 2: annotation channel).
 */
export async function sendPostChatMessage(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onReadyToGenerate: (enrichedTopic: string) => void
): Promise<void> {
  const response = await apiFetch("/api/post/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Chat failed" }));
    throw new Error(err.error || "Chat failed");
  }

  for await (const chunk of parseDataStream(response, (ann) => {
    if (typeof ann.enrichedTopic === "string") {
      onReadyToGenerate(ann.enrichedTopic);
    }
  })) {
    onChunk(chunk);
  }
}

/** Record that the user approved a post as-is. */
export async function approvePost(
  generatedPostId: string,
  finalText: string
): Promise<void> {
  await apiFetch("/api/post/approve", {
    method: "POST",
    body: JSON.stringify({ generated_post_id: generatedPostId, final_text: finalText }),
  });
}

/** Record manual edits the user made to a generated post. */
export async function saveEdit(
  generatedPostId: string,
  originalText: string,
  editedText: string
): Promise<void> {
  await apiFetch("/api/post/edit", {
    method: "POST",
    body: JSON.stringify({
      generated_post_id: generatedPostId,
      original_text: originalText,
      edited_text: editedText,
    }),
  });
}
