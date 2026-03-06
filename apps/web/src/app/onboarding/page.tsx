import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";
import { OnboardingEntry } from "@/components/onboarding/onboarding-entry";
import { VoiceAgentOnboarding } from "@/components/onboarding/voice-agent-onboarding";
import type { OnboardingSession, LinkedInImportData } from "@linkedin-agent/shared";

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

  const sessionIdFlag = params.sessionId;
  const sessionId = Array.isArray(sessionIdFlag) ? sessionIdFlag[0] : sessionIdFlag;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_complete, linkedin_import_data, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_complete && !isRedo) {
    redirect("/create");
  }

  const linkedInData = (profile?.linkedin_import_data as LinkedInImportData | null) ?? null;

  // Load session data if sessionId provided (voice-to-text failover)
  let sessionData: OnboardingSession | null = null;
  if (sessionId) {
    const { data: s } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    sessionData = s as OnboardingSession | null;
  }

  // Load existing in_progress session for entry page (so we can show resume option)
  let existingSession: OnboardingSession | null = null;
  if (!mode && !sessionId) {
    const { data: s } = await supabase
      .from("onboarding_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    existingSession = s as OnboardingSession | null;
  }

  if (mode === "text") {
    return (
      <OnboardingChat
        userId={user.id}
        redirectTo={isRedo ? "/account" : "/create"}
        isRedo={isRedo}
        sessionId={sessionId ?? sessionData?.id}
        initialTranscript={
          sessionData?.transcript && sessionData.transcript.length > 0
            ? sessionData.transcript
            : undefined
        }
        linkedInData={linkedInData}
      />
    );
  }

  if (mode === "voice") {
    return <VoiceAgentOnboarding isRedo={isRedo} linkedInData={linkedInData} />;
  }

  // Extract first name — cast profile to record so display_name is always accessible,
  // then fall back through auth metadata keys (LinkedIn OAuth may use 'name' or 'full_name')
  const profileRecord = profile as Record<string, unknown> | null;
  const rawName =
    (profileRecord?.display_name as string | null) ||
    (user.user_metadata?.full_name as string | null) ||
    (user.user_metadata?.name as string | null) ||
    "";
  const userName = rawName.split(" ")[0] || user.email?.split("@")[0] || "there";

  // Default: show choice screen first
  return <OnboardingEntry isRedo={isRedo} existingSession={existingSession} linkedInData={linkedInData} userName={userName} />;
}
