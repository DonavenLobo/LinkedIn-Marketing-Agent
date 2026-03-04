import { useConversation } from "@elevenlabs/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProfileToolData {
  summary: string;
  confidence: "high" | "medium" | "low";
}

type Phase = "idle" | "conversation" | "writing-samples" | "building" | "done";

interface VoiceOnboardingProps {
  onComplete: () => void;
  onFallbackToWeb: () => void;
}

/** Multi-layered ring animation that emulates the web VoiceprintHologram */
function VoicePulseRings({ isSpeaking }: { isSpeaking: boolean }) {
  const rings = [0, 1, 2];
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      {rings.map((i) => (
        <motion.div
          key={i}
          className="voice-ring-layer"
          style={{
            inset: -8 * (i + 1),
          }}
          animate={
            isSpeaking
              ? {
                  scale: [1, 1.08 + i * 0.04, 1],
                  opacity: [0.4 - i * 0.1, 0.15 - i * 0.03, 0.4 - i * 0.1],
                }
              : { scale: 1, opacity: 0.12 }
          }
          transition={
            isSpeaking
              ? {
                  duration: 1.6 + i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : { duration: 0.4 }
          }
        />
      ))}
      <motion.div
        className={`voice-pulse ${isSpeaking ? "speaking" : "listening"}`}
        style={{ width: 80, height: 80 }}
        animate={
          isSpeaking
            ? { scale: [1, 1.06, 1] }
            : { scale: 1 }
        }
        transition={
          isSpeaking
            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      />
    </div>
  );
}

export function VoiceOnboarding({ onComplete, onFallbackToWeb }: VoiceOnboardingProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [toolData, setToolData] = useState<ProfileToolData | null>(null);
  const [writingSamples, setWritingSamples] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch("/api/me").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setUserId(data.user?.id || null);
      }
    }).catch(() => {});
  }, []);

  const conversation = useConversation({
    workletPaths: {
      rawAudioProcessor: chrome.runtime.getURL("elevenlabs-worklets/rawAudioProcessor.js"),
      audioConcatProcessor: chrome.runtime.getURL("elevenlabs-worklets/audioConcatProcessor.js"),
    },
    onConnect: () => {
      setPhase("conversation");
      setError(null);
    },
    onDisconnect: () => {
      if (phase === "conversation" && !toolData) {
        setPhase("idle");
      }
    },
    onMessage: (message) => {
      setTranscript((prev) => {
        const role = message.source === "user" ? "user" : "assistant";
        return [...prev, { role, content: message.message }];
      });
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setError("Voice connection error. Please try again.");
      setPhase("idle");
    },
    clientTools: {
      ready_to_build_profile: async (params: Record<string, unknown>) => {
        const data: ProfileToolData = {
          summary: (params.summary as string) || "Voice onboarding conversation",
          confidence: (params.confidence as "high" | "medium" | "low") || "medium",
        };
        setToolData(data);
        setPhase("writing-samples");
        try {
          await conversation.endSession();
        } catch {
          // Session may already be ending
        }
        return "Profile build triggered.";
      },
    },
  });

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const startConversation = useCallback(async () => {
    setError(null);
    setMicError(false);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(true);
      return;
    }

    try {
      const res = await apiFetch("/api/onboarding/voice-token");
      if (!res.ok) {
        setError("Failed to initialize voice session.");
        return;
      }
      const data = await res.json();
      await conversation.startSession({ signedUrl: data.signedUrl });
    } catch (err) {
      console.error("Start session error:", err);
      setError("Failed to start voice conversation.");
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // Already ended
    }
    if (transcript.length >= 6) {
      setToolData({
        summary: "Manual stop after voice conversation",
        confidence: transcript.length >= 10 ? "high" : "medium",
      });
      setPhase("writing-samples");
    } else {
      setPhase("idle");
    }
  }, [conversation, transcript]);

  const handleBuildProfile = useCallback(async () => {
    if (!toolData || !userId) return;
    setPhase("building");
    setError(null);

    const samples = writingSamples
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const response = await apiFetch("/api/onboarding/analyze", {
        method: "POST",
        body: JSON.stringify({
          transcript,
          toolData,
          userId,
          writingSamples: samples.length > 0 ? samples : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to build profile");
      }

      setPhase("done");
      onComplete();
    } catch (err) {
      console.error("Profile build error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("writing-samples");
    }
  }, [toolData, transcript, userId, writingSamples, onComplete]);

  // -- Idle --
  if (phase === "idle") {
    return (
      <motion.div
        className="voice-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="voice-hero">
          <motion.div
            className="voice-icon-circle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </motion.div>
          <h2>Talk to your voice coach</h2>
          <p>Have a 3-5 min chat about your LinkedIn voice. Just talk naturally.</p>
        </div>

        {micError && (
          <div className="voice-warning">
            Microphone access is needed. Please allow mic in your browser.
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <motion.button
          className="btn-primary"
          onClick={startConversation}
          style={{ width: "100%" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Start Voice Chat
        </motion.button>

        <button
          className="btn-new-post"
          onClick={onFallbackToWeb}
          style={{ marginTop: 12, color: "#999", fontSize: 12 }}
        >
          Prefer typing? Complete setup on web
        </button>
      </motion.div>
    );
  }

  // -- Conversation --
  if (phase === "conversation") {
    return (
      <motion.div
        className="voice-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="voice-visualizer">
          <VoicePulseRings isSpeaking={conversation.isSpeaking} />
          <AnimatePresence mode="wait">
            <motion.span
              key={conversation.isSpeaking ? "speaking" : "listening"}
              className="voice-status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {conversation.isSpeaking ? "Coach is speaking..." : "Listening to you..."}
            </motion.span>
          </AnimatePresence>
        </div>

        {transcript.length > 0 && (
          <div className="voice-transcript" ref={transcriptRef}>
            <AnimatePresence initial={false}>
              {transcript.map((msg, i) => (
                <motion.div
                  key={`t-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`voice-transcript-msg ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  <span className="voice-transcript-role">{msg.role === "user" ? "You" : "Coach"}:</span>{" "}
                  {msg.content}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <button className="btn-secondary" onClick={stopConversation} style={{ width: "100%", marginTop: 12 }}>
          {transcript.length >= 6 ? "I'm done, build my profile" : "End conversation"}
        </button>
      </motion.div>
    );
  }

  // -- Writing samples --
  if (phase === "writing-samples") {
    return (
      <motion.div
        className="voice-onboarding"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="voice-hero">
          <motion.div
            className="voice-icon-circle voice-icon-success"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          <h2>Great conversation!</h2>
          <p>Paste any LinkedIn posts or writing to help us match your written style too.</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <textarea
          className="feedback-textarea"
          value={writingSamples}
          onChange={(e) => setWritingSamples(e.target.value)}
          placeholder="Paste your writing here... Separate samples with a blank line."
          rows={5}
        />

        <motion.button
          className="btn-primary"
          onClick={handleBuildProfile}
          style={{ width: "100%" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {writingSamples.trim() ? "Build My Profile" : "Skip & Build Profile"}
        </motion.button>
      </motion.div>
    );
  }

  // -- Building --
  if (phase === "building") {
    return (
      <motion.div
        className="voice-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="voice-hero">
          <div className="spinner" style={{ width: 24, height: 24 }} />
          <h2>Building your voice profile...</h2>
          <p>This usually takes 15-30 seconds.</p>
        </div>
      </motion.div>
    );
  }

  // -- Done --
  return (
    <motion.div
      className="voice-onboarding"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="voice-hero">
        <motion.div
          className="voice-icon-circle voice-icon-success"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>
        <h2>You&apos;re all set!</h2>
        <p>Your voice profile is ready. Start creating posts.</p>
      </div>
    </motion.div>
  );
}
