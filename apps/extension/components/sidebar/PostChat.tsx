import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendPostChatMessage, type ChatMessage } from "../../lib/api";

const QUICK_IDEAS = [
  "Share a recent win",
  "Industry insight",
  "Lesson learned",
  "Hot take on market trends",
];

const PHASE_LABELS = [
  "Analysing tone...",
  "Structuring narrative...",
  "Matching your cadence...",
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
  const [phaseIndex, setPhaseLabelIndex] = useState(0);
  const hasTriggeredRef = useRef(false);

  // Cycle through phase labels while generating
  useEffect(() => {
    if (!isGenerating) {
      setPhaseLabelIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPhaseLabelIndex((i) => (i + 1) % PHASE_LABELS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isGenerating]);

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
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`msg-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`chat-bubble ${msg.role === "user" ? "chat-bubble--user" : "chat-bubble--assistant"}`}
              >
                {msg.content}
              </motion.div>
            ))}

            {/* Live streaming bubble */}
            {isStreaming && !streamingText && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="chat-bubble chat-bubble--assistant"
              >
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </motion.div>
            )}
            {isStreaming && streamingText && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="chat-bubble chat-bubble--assistant"
              >
                {streamingText}<span className="cursor-blink" />
              </motion.div>
            )}

            {/* Generating indicator — cycling phase labels */}
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="phase-label generating-indicator"
              >
                <div className="spinner" style={{ width: 14, height: 14 }} />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phaseIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {PHASE_LABELS[phaseIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quick ideas chips */}
      {showQuickIdeas && (
        <motion.div
          className="quick-ideas"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <p className="quick-ideas-label font-mono">QUICK IDEAS</p>
          <div className="quick-ideas-chips">
            {QUICK_IDEAS.map((idea, i) => (
              <motion.button
                key={idea}
                className="chip"
                disabled={isStreaming || isGenerating}
                onClick={() => sendMessage(idea)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15 + i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {idea}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="error-msg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

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
