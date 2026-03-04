import * as React from "react";
import { cn } from "@linkedin-agent/shared";

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function PageShell({ children, className, ...props }: PageShellProps) {
    return (
        <div
            className={cn(
                "mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-8",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
