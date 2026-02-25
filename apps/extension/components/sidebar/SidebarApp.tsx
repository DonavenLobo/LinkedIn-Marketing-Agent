import { useState, useEffect, useRef } from "react";
import { getTokens } from "../../lib/auth";
import { streamGenerate, streamFeedback, approvePost, saveEdit, apiFetch } from "../../lib/api";
import { AuthGate } from "./AuthGate";
import { GenerateForm } from "./GenerateForm";
import { PostPreview } from "./PostPreview";

type Status = "loading" | "logged-out" | "needs-onboarding" | "ready";

export function SidebarApp() {
  const [status, setStatus] = useState<Status>("loading");
  const [content, setContent] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFeedbackStreaming, setIsFeedbackStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    checkStatus();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.access_token) {
        checkStatus();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Poll every 10 seconds while waiting for onboarding to complete
  useEffect(() => {
    if (status !== "needs-onboarding") return;
    const interval = setInterval(checkStatus, 10_000);
    return () => clearInterval(interval);
  }, [status]);

  async function checkStatus() {
    const { access_token } = await getTokens();
    if (!access_token) {
      setStatus("logged-out");
      return;
    }

    try {
      const res = await apiFetch("/api/me");
      if (res.status === 401) {
        setStatus("logged-out");
        return;
      }
      const data = await res.json();
      if (data.user?.onboarding_complete) {
        setStatus("ready");
      } else {
        setStatus("needs-onboarding");
      }
    } catch {
      setStatus("ready");
    }
  }

  async function handleGenerate(newTopic: string) {
    setError(null);
    setContent("");
    setPostId(null);
    setTopic(newTopic);
    setIsStreaming(true);
    abortRef.current = false;

    try {
      let accumulated = "";
      for await (const chunk of streamGenerate(newTopic, (id) => setPostId(id))) {
        if (abortRef.current) break;
        accumulated += chunk;
        setContent(accumulated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleFeedback(feedback: string) {
    if (!postId) return;
    setIsFeedbackStreaming(true);
    abortRef.current = false;
    const originalContent = content;

    try {
      let accumulated = "";
      for await (const chunk of streamFeedback(postId, originalContent, feedback, topic)) {
        if (abortRef.current) break;
        accumulated += chunk;
        setContent(accumulated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed");
      setContent(originalContent);
    } finally {
      setIsFeedbackStreaming(false);
    }
  }

  async function handleApprove() {
    if (!postId) return;
    try {
      await approvePost(postId, content);
    } catch {
      // Non-critical — don't surface to user
    }
  }

  async function handleEdit(originalText: string, editedText: string) {
    if (!postId) return;
    try {
      await saveEdit(postId, originalText, editedText);
      setContent(editedText);
    } catch {
      // Non-critical
    }
  }

  function handleStop() {
    abortRef.current = true;
  }

  if (status === "loading") {
    return (
      <div className="sidebar-content" style={{ textAlign: "center", paddingTop: 40 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-header">
        <div>
          <h1>LinkedIn Agent</h1>
          <p className="subtitle">AI-powered posts in your voice</p>
        </div>
      </div>
      <div className="sidebar-content">
        {status === "logged-out" && <AuthGate />}

        {status === "needs-onboarding" && (
          <div className="auth-gate">
            <h2>Almost there!</h2>
            <p>Complete your voice setup so I can write posts that sound like you.</p>
            <button
              className="btn-primary"
              onClick={() => window.open("http://localhost:3000/onboarding", "_blank")}
            >
              Complete Voice Setup
            </button>
            <button
              className="btn-secondary"
              style={{ marginTop: 8 }}
              onClick={checkStatus}
            >
              I&apos;m done — refresh
            </button>
          </div>
        )}

        {status === "ready" && (
          <>
            <GenerateForm
              onGenerate={handleGenerate}
              isLoading={isStreaming}
              onStop={handleStop}
            />
            {error && <div className="error-msg">{error}</div>}
            <PostPreview
              content={content}
              isStreaming={isStreaming}
              isFeedbackStreaming={isFeedbackStreaming}
              postId={postId}
              topic={topic}
              onApprove={handleApprove}
              onFeedback={handleFeedback}
              onEdit={handleEdit}
              onNewPost={() => {
                setContent("");
                setPostId(null);
                document.querySelector(".sidebar-content")?.scrollTo(0, 0);
              }}
            />
          </>
        )}
      </div>
    </>
  );
}
