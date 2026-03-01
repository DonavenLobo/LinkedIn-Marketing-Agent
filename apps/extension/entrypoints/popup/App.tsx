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
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        LinkedIn Marketing Agent
      </h1>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
        AI-powered posts in your voice
      </p>

      {status === "logged-out" && (
        <button
          onClick={handleGetStarted}
          style={{
            width: "100%",
            padding: "10px 16px",
            backgroundColor: "#0a66c2",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Get Started
        </button>
      )}

      {status === "needs-onboarding" && (
        <div>
          <p style={{ fontSize: 14, color: "#2563eb", marginBottom: 8, fontWeight: 500 }}>
            Almost there!
          </p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            Open LinkedIn and use the sidebar to complete your voice setup with a quick chat.
          </p>
          <button
            onClick={() => chrome.tabs.create({ url: "https://www.linkedin.com/feed/" })}
            style={{
              width: "100%",
              padding: "10px 16px",
              backgroundColor: "#0a66c2",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            Open LinkedIn
          </button>
          <button
            onClick={handleOnboarding}
            style={{
              width: "100%",
              padding: "8px 16px",
              backgroundColor: "transparent",
              color: "#666",
              border: "1px solid #e2e2dc",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Or complete on web instead
          </button>
        </div>
      )}

      {status === "ready" && (
        <div>
          <p style={{ fontSize: 14, color: "#059669", marginBottom: 8 }}>
            You&apos;re all set!
          </p>
          <p style={{ fontSize: 13, color: "#666" }}>
            Open LinkedIn to use the sidebar
          </p>
        </div>
      )}
    </div>
  );
}
