"use client";

import { motion } from "framer-motion";
import { HopeAvatar } from "./HopeAvatar";

export type AgentMode = "idle" | "listening" | "speaking";
export type Status = "idle" | "connecting" | "connected" | "ended" | "error";

interface HopeVoiceStateRingProps {
  agentMode: AgentMode;
  status: Status;
}

export function HopeVoiceStateRing({ agentMode, status }: HopeVoiceStateRingProps) {
  const isActive = agentMode === "listening" || agentMode === "speaking";

  const ringVariant =
    agentMode === "speaking"
      ? {
          scale: 1.15,
          opacity: 1,
          transition: {
            duration: 0.75,
            repeat: Infinity,
            repeatType: "reverse",
          },
        }
      : agentMode === "listening"
        ? {
            scale: 1.08,
            opacity: 0.75,
            transition: {
              duration: 1.1,
              repeat: Infinity,
              repeatType: "reverse",
            },
          }
        : {
            scale: 1,
            opacity: status === "connected" ? 0.4 : 0.25,
            transition: { duration: 0.3 },
          };

  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full border border-accent/40"
        animate={ringVariant}
      />

      <div className="absolute h-10 w-10 rounded-full bg-accent/5 blur-xl" />

      <HopeAvatar size="md" active={isActive} />
    </div>
  );
}

