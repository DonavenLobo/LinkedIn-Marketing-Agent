import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { OnboardingWrapper } from "@/components/onboarding/onboarding-wrapper";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_complete) {
    redirect("/create");
  }

  return <OnboardingWrapper userId={user.id} />;
}
