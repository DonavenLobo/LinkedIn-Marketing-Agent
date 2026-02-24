import { useState, useEffect } from "react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(["access_token"], (result) => {
      setIsLoggedIn(!!result.access_token);
      setLoading(false);
    });
  }, []);

  const handleGetStarted = () => {
    chrome.tabs.create({ url: "http://localhost:3000/auth/login?from=extension" });
  };

  if (loading) {
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
      {isLoggedIn ? (
        <div>
          <p style={{ fontSize: 14, color: "#059669", marginBottom: 8 }}>
            ✓ You're logged in
          </p>
          <p style={{ fontSize: 13, color: "#666" }}>
            Open LinkedIn to use the sidebar
          </p>
        </div>
      ) : (
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
    </div>
  );
}
