import * as React from "react"
import { TopNav } from "./TopNav"
import { cn } from "@linkedin-agent/shared"

interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    userEmail?: string
    userName?: string
    avatarUrl?: string
}

export function AppShell({
    children,
    className,
    userEmail,
    userName,
    avatarUrl,
    ...props
}: AppShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-surface-subtle" {...props}>
            <TopNav userEmail={userEmail} name={userName} avatarUrl={avatarUrl} />
            <main className={cn("flex-1", className)}>
                {children}
            </main>
        </div>
    )
}
