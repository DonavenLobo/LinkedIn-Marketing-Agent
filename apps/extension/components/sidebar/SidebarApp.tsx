import { useState, useEffect, useRef } from "react";
import { getTokens } from "../../lib/auth";
import { streamGenerate } from "../../lib/api";
import { AuthGate } from "./AuthGate";
import { GenerateForm } from "./GenerateForm";
import { PostPreview } from "./PostPreview";

export function SidebarApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    checkAuth();

    // Re-check auth when storage changes (e.g., after login in another tab)
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.access_token) {
        checkAuth();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  async function checkAuth() {
    const { access_token } = await getTokens();
    setIsAuthenticated(!!access_token);
    setLoading(false);
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

  if (loading) {
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
        {!isAuthenticated ? (
          <AuthGate />
        ) : (
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
