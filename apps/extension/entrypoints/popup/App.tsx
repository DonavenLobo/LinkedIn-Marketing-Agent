import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { getTokens } from "../../lib/auth";

type Status = "loading" | "logged-out" | "needs-onboarding" | "ready";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    async function checkStatus() {
      const { access_token } = await getTokens();
      if (!access_token) {
        setStatus("logged-out");
        return;
      }

      try {
        // apiFetch handles automatic token refresh on 401
        const res = await apiFetch("/api/me");
        if (res.status === 401) {
          // Refresh also failed — session fully expired, re-login required
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
        // API not reachable — assume ready if token exists
        setStatus("ready");
      }
    }

    checkStatus();
  }, []);

  const handleGetStarted = () => {
    chrome.tabs.create({ url: "http://localhost:3000/auth/login?from=extension" });
  };

  const handleOnboarding = () => {
    chrome.tabs.create({ url: "http://localhost:3000/onboarding" });
  };

  if (status === "loading") {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p className="status-hint">Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 className="title">LinkedIn Marketing Agent</h1>
      <p className="subtitle">AI-powered posts in your voice</p>

      {status === "logged-out" && (
        <button className="btn-primary" onClick={handleGetStarted}>
          Get Started
        </button>
      )}

      {status === "needs-onboarding" && (
        <div>
          <p className="status-warning">Almost there! Complete your voice setup first.</p>
          <button className="btn-primary" onClick={handleOnboarding}>
            Complete Voice Setup
          </button>
        </div>
      )}

      {status === "ready" && (
        <div>
          <p className="status-success">You&apos;re all set!</p>
          <p className="status-hint">Open LinkedIn to use the sidebar</p>
        </div>
      )}
    </div>
  );
}
