import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PastePostsOnboarding } from "@/components/onboarding/paste-posts";

interface OnboardingPostsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OnboardingPostsPage({
  searchParams,
}: OnboardingPostsPageProps) {
  const params = await searchParams;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const redirectFlag = params.redirectTo;
  const redirectTo = Array.isArray(redirectFlag)
    ? redirectFlag[0] || "/create"
    : redirectFlag || "/create";

  const redoFlag = params.redo;
  const isRedo = Array.isArray(redoFlag)
    ? redoFlag.includes("1")
    : redoFlag === "1";

  return <PastePostsOnboarding redirectTo={redirectTo} isRedo={isRedo} />;
}

