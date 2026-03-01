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
      <div className="popup-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="popup-container">
      <h1 className="popup-title">LinkedIn Agent</h1>
      <p className="popup-subtitle">AI-powered posts in your voice</p>

      {status === "logged-out" && (
        <button className="btn-primary" onClick={handleGetStarted}>
          Get Started
        </button>
      )}

      {status === "needs-onboarding" && (
        <div className="popup-stack">
          <p className="popup-info">
            Open LinkedIn and use the sidebar to complete your voice setup with a quick chat.
          </p>
          <button
            className="btn-primary"
            onClick={() => chrome.tabs.create({ url: "https://www.linkedin.com/feed/" })}
          >
            Open LinkedIn
          </button>
          <button className="btn-secondary" onClick={handleOnboarding}>
            Or complete on web instead
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="popup-stack">
          <p className="popup-success">You&apos;re all set!</p>
          <p className="popup-hint">Open LinkedIn to use the sidebar</p>
          <button
            className="btn-secondary"
            onClick={() => chrome.tabs.create({ url: "https://www.linkedin.com/feed/" })}
          >
            Open LinkedIn
          </button>
        </div>
      )}
    </div>
  );
}
