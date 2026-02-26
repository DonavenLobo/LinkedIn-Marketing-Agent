import { useState, useRef } from "react";
import { sendPostChatMessage, type ChatMessage } from "../../lib/api";

const QUICK_IDEAS = [
  "Share a recent win",
  "Industry insight",
  "Lesson learned",
  "Hot take on market trends",
];

interface PostChatProps {
  onReadyToGenerate: (enrichedTopic: string) => void;
  isGenerating: boolean;
}

export function PostChat({ onReadyToGenerate, isGenerating }: PostChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasTriggeredRef = useRef(false);

  async function sendMessage(userContent: string) {
    if (!userContent.trim() || isStreaming || isGenerating) return;

    setError(null);
    const userMessage: ChatMessage = { role: "user", content: userContent };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    let accumulated = "";
    let toolFired = false;

    try {
      await sendPostChatMessage(
        nextMessages,
        (chunk) => {
          accumulated += chunk;
          setStreamingText(accumulated);
        },
        (enrichedTopic) => {
          toolFired = true;
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            // Show a synthetic "working on it" bubble then hand off
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Got it — writing your post now..." },
            ]);
            setStreamingText("");
            onReadyToGenerate(enrichedTopic);
          }
        }
      );

      // If no tool fired, the streamed text was a follow-up question — persist it
      if (!toolFired && accumulated) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated },
        ]);
        setStreamingText("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const showQuickIdeas = messages.length === 0 && !isStreaming && !isGenerating;

  return (
    <div className="generate-form">
      {/* Message history */}
      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-bubble ${msg.role === "user" ? "chat-bubble--user" : "chat-bubble--assistant"}`}
            >
              {msg.content}
            </div>
          ))}

          {/* Live streaming bubble */}
          {isStreaming && !streamingText && (
            <div className="chat-bubble chat-bubble--assistant">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}
          {isStreaming && streamingText && (
            <div className="chat-bubble chat-bubble--assistant">
              {streamingText}<span className="cursor-blink" />
            </div>
          )}

          {/* Generating indicator */}
          {isGenerating && (
            <div className="generating-indicator">
              <div className="spinner" style={{ width: 14, height: 14 }} />
              Writing your post...
            </div>
          )}
        </div>
      )}

      {/* Quick ideas chips */}
      {showQuickIdeas && (
        <div className="quick-ideas">
          <p className="quick-ideas-label">QUICK IDEAS</p>
          <div className="quick-ideas-chips">
            {QUICK_IDEAS.map((idea) => (
              <button
                key={idea}
                className="chip"
                disabled={isStreaming || isGenerating}
                onClick={() => sendMessage(idea)}
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="error-msg">{error}</div>}

      {/* Input */}
      {!isGenerating && (
        <form onSubmit={handleSubmit} style={{ marginTop: messages.length > 0 ? 8 : 0 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={isStreaming}
            placeholder={
              messages.length === 0
                ? "What would you like to post about?\n\ne.g. I just closed a $15M multifamily deal..."
                : "Type your response..."
            }
            rows={2}
          />
          <div className="btn-row">
            <button
              type="submit"
              className="btn-primary"
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? "..." : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
