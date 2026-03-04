import * as React from "react";
import { cn } from "@linkedin-agent/shared";

interface AuthShellProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function AuthShell({ children, className, ...props }: AuthShellProps) {
    return (
        <div
            className={cn(
                "flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8",
                className
            )}
            {...props}
        >
            <div className="w-full max-w-md space-y-8">{children}</div>
        </div>
    );
}
