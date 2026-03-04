"use client";

import { useState } from "react";
import { VoiceOnboarding } from "./voice-onboarding";
import { OnboardingChat } from "./onboarding-chat";

interface OnboardingWrapperProps {
  userId: string;
}

export function OnboardingWrapper({ userId }: OnboardingWrapperProps) {
  const [mode, setMode] = useState<"voice" | "text">("voice");

  if (mode === "text") {
    return <OnboardingChat userId={userId} />;
  }

  return (
    <VoiceOnboarding
      userId={userId}
      onFallbackToText={() => setMode("text")}
    />
  );
}
