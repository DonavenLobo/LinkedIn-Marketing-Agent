import { useState, useEffect, useRef } from "react";
import { getTokens } from "../../lib/auth";
import { streamGenerate, apiFetch } from "../../lib/api";
import { AuthGate } from "./AuthGate";
import { GenerateForm } from "./GenerateForm";
import { PostPreview } from "./PostPreview";

type Status = "loading" | "logged-out" | "needs-onboarding" | "ready";

export function SidebarApp() {
  const [status, setStatus] = useState<Status>("loading");
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
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
      // apiFetch already attempted a token refresh on 401.
      // If still 401, the refresh token is also expired — show login.
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
      // If API unreachable, assume ready if token exists
      setStatus("ready");
    }
  }

  async function handleGenerate(topic: string) {
    setError(null);
    setContent("");
    setIsStreaming(true);
    abortRef.current = false;

    try {
      let accumulated = "";
      for await (const chunk of streamGenerate(topic)) {
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
            <PostPreview content={content} isStreaming={isStreaming} />
          </>
        )}
      </div>
    </>
  );
}
