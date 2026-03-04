import { redirect } from "next/navigation";

export default function AccountRebuildRedirectPage() {
  // For now, send users to onboarding in redo mode.
  // Onboarding will handle auth + redirecting back to /account after completion.
  redirect("/onboarding?redo=1");
}

