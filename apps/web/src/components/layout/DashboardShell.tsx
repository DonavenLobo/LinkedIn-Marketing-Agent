"use client";

import { AppShell } from "./AppShell";
import { PageShell } from "./PageShell";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  avatarUrl?: string;
}

export function DashboardShell({
  children,
  userEmail,
  userName,
  avatarUrl,
}: DashboardShellProps) {
  return (
    <AppShell userEmail={userEmail} userName={userName} avatarUrl={avatarUrl}>
      <PageShell>{children}</PageShell>
    </AppShell>
  );
}
