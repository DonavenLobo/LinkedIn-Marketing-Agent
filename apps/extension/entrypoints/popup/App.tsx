import { useState, useEffect } from "react";

type Status = "loading" | "logged-out" | "needs-onboarding" | "ready";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    chrome.storage.local.get(["access_token"], async (result) => {
      if (!result.access_token) {
        setStatus("logged-out");
        return;
      }

      // Check onboarding status
      try {
        const res = await fetch("http://localhost:3000/api/me", {
          headers: { Authorization: `Bearer ${result.access_token}` },
        });
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
    });
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
          <p style={{ fontSize: 14, color: "#d97706", marginBottom: 12 }}>
            Almost there! Complete your voice setup first.
          </p>
          <button
            onClick={handleOnboarding}
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
            Complete Voice Setup
          </button>
        </div>
      )}

      {status === "ready" && (
        <div>
          <p style={{ fontSize: 14, color: "#059669", marginBottom: 8 }}>
            You're all set!
          </p>
          <p style={{ fontSize: 13, color: "#666" }}>
            Open LinkedIn to use the sidebar
          </p>
        </div>
      )}
    </div>
  );
}
