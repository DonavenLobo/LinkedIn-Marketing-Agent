import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";
import { OnboardingEntry } from "@/components/onboarding/onboarding-entry";
import { VoiceAgentOnboarding } from "@/components/onboarding/voice-agent-onboarding";

interface OnboardingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const redoFlag = params.redo;
  const isRedo = Array.isArray(redoFlag) ? redoFlag.includes("1") : redoFlag === "1";

  const modeFlag = params.mode;
  const mode = Array.isArray(modeFlag) ? modeFlag[0] : modeFlag;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_complete && !isRedo) {
    redirect("/create");
  }

  if (mode === "text") {
    return (
      <OnboardingChat
        userId={user.id}
        redirectTo={isRedo ? "/account" : "/create"}
        isRedo={isRedo}
      />
    );
  }

  if (mode === "voice") {
    return <VoiceAgentOnboarding isRedo={isRedo} />;
  }

  // Default: show choice screen first
  return <OnboardingEntry isRedo={isRedo} />;
}

