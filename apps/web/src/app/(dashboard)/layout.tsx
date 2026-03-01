import { createSupabaseServer } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | undefined;
  let avatarUrl: string | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();

    displayName = profile?.display_name ?? user.user_metadata?.full_name ?? undefined;
    avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? undefined;
  }

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={displayName}
      avatarUrl={avatarUrl}
    >
      {children}
    </DashboardShell>
  );
}
