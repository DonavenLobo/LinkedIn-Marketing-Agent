import { useState, useEffect, useRef } from "react";
import { getTokens } from "../../lib/auth";
import { streamGenerate, streamFeedback, approvePost, saveEdit, apiFetch } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { AuthGate } from "./AuthGate";
import { PostChat } from "./PostChat";
import { PostPreview } from "./PostPreview";
import { SettingsPanel } from "./SettingsPanel";
import { VoiceOnboarding } from "./VoiceOnboarding";

type Status = "loading" | "logged-out" | "needs-onboarding" | "ready";

export function SidebarApp() {
  const [status, setStatus] = useState<Status>("loading");
  const [content, setContent] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFeedbackStreaming, setIsFeedbackStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
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
        {status === "ready" && (
          <button
            className="settings-gear-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Brand guidelines"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
      </div>
      <div className="sidebar-content">
        {showSettings && status === "ready" && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
        {status === "logged-out" && <AuthGate />}

        {status === "needs-onboarding" && (
          <VoiceOnboarding
            onComplete={() => {
              checkStatus();
            }}
            onFallbackToWeb={() => {
              window.open(`${API_URL}/onboarding`, "_blank");
            }}
          />
        )}

        {status === "ready" && (
          <>
            <PostChat
              onReadyToGenerate={handleGenerate}
              isGenerating={isStreaming}
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
