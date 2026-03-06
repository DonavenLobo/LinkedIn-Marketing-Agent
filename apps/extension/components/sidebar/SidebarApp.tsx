import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTokens } from "../../lib/auth";
import { streamGenerate, streamFeedback, approvePost, saveEdit, apiFetch } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { AuthGate } from "./AuthGate";
import { PostChat } from "./PostChat";
import { PostPreview } from "./PostPreview";
import { SettingsPanel } from "./SettingsPanel";
import { TourOverlay } from "./TourOverlay";
import {
  SIDEBAR_TOUR_STEPS,
  POST_REVIEW_TOUR_STEPS,
  hasSidebarTourBeenSeen,
  markSidebarTourSeen,
  hasPostReviewTourBeenSeen,
  markPostReviewTourSeen,
} from "../../lib/tour";

type Status = "loading" | "logged-out" | "needs-onboarding" | "ready";

interface SidebarAppProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function SidebarApp({ containerRef }: SidebarAppProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [content, setContent] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFeedbackStreaming, setIsFeedbackStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const abortRef = useRef(false);

  // Tour state
  const [showSidebarTour, setShowSidebarTour] = useState(false);
  const [showPostTour, setShowPostTour] = useState(false);
  const hasShownPostTourRef = useRef(false);
  const prevStreamingRef = useRef(false);

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

  // Trigger sidebar tour on first "ready"
  useEffect(() => {
    if (status === "ready") {
      hasSidebarTourBeenSeen().then((seen) => {
        if (!seen) {
          setTimeout(() => setShowSidebarTour(true), 600);
        }
      });
    }
  }, [status]);

  // Trigger post review tour after first generation completes
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && content) {
      if (!hasShownPostTourRef.current) {
        hasPostReviewTourBeenSeen().then((seen) => {
          if (!seen) {
            hasShownPostTourRef.current = true;
            setTimeout(() => setShowPostTour(true), 500);
          }
        });
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, content]);

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
    setChatCollapsed(true);
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
          <p className="subtitle font-mono">AI-powered posts in your voice</p>
        </div>
        {status === "ready" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              className="header-icon-btn"
              onClick={() => window.open(`${API_URL}/create`, "_blank")}
              title="Open web dashboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button
              className="tour-help-btn"
              onClick={() => setShowSidebarTour(true)}
              title="Take a tour"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
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
          </div>
        )}
      </div>
      <div className="sidebar-content">
        {showSettings && status === "ready" && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}

        <AnimatePresence mode="wait">
          {status === "logged-out" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AuthGate />
            </motion.div>
          )}

          {status === "needs-onboarding" && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="onboarding-redirect">
                <div className="onboarding-redirect-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a9 9 0 1 0 9 9" />
                    <path d="M12 7v5l3 3" />
                    <path d="M17 3h4v4" />
                    <path d="M21 3l-5 5" />
                  </svg>
                </div>
                <h2 className="onboarding-redirect-title">Set up your voice profile</h2>
                <p className="onboarding-redirect-desc">
                  Complete a quick onboarding on the web — upload your LinkedIn data and have a short
                  conversation so we can learn how you write. Takes about 3 minutes.
                </p>
                <button
                  className="btn-primary onboarding-redirect-btn"
                  onClick={() => window.open(`${API_URL}/onboarding`, "_blank")}
                >
                  Open onboarding →
                </button>
                <p className="onboarding-redirect-hint">
                  This page will update automatically once you're done.
                </p>
              </div>
            </motion.div>
          )}

          {status === "ready" && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {(content || isStreaming) && (
                <button
                  className={`chat-history-toggle ${chatCollapsed ? "collapsed" : ""}`}
                  onClick={() => setChatCollapsed(!chatCollapsed)}
                >
                  <span>Chat History</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              <div className={`chat-section ${chatCollapsed ? "chat-section--collapsed" : ""}`}>
                <PostChat
                  key={chatKey}
                  onReadyToGenerate={handleGenerate}
                  isGenerating={isStreaming}
                />
              </div>
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
                  setTopic("");
                  setError(null);
                  setChatKey((k) => k + 1);
                  setChatCollapsed(false);
                  document.querySelector(".sidebar-content")?.scrollTo(0, 0);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tour overlays */}
      {showSidebarTour && containerRef.current && (
        <TourOverlay
          steps={SIDEBAR_TOUR_STEPS}
          containerEl={containerRef.current}
          onComplete={() => {
            setShowSidebarTour(false);
            markSidebarTourSeen();
          }}
        />
      )}
      {showPostTour && containerRef.current && (
        <TourOverlay
          steps={POST_REVIEW_TOUR_STEPS}
          containerEl={containerRef.current}
          onComplete={() => {
            setShowPostTour(false);
            markPostReviewTourSeen();
          }}
        />
      )}
    </>
  );
}
