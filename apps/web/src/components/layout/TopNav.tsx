"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@linkedin-agent/shared"

interface TopNavProps {
    userEmail?: string
    avatarUrl?: string
    name?: string
}

export function TopNav({ userEmail, avatarUrl, name }: TopNavProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false)

    const isCreatePage = pathname === "/create"
    const openProfileMenuParam = searchParams.get("openProfileMenu")

    React.useEffect(() => {
        if (pathname !== "/create") {
            setIsProfileMenuOpen(false)
            return
        }

        if (openProfileMenuParam === "1") {
            setIsProfileMenuOpen(true)
        }
    }, [pathname, openProfileMenuParam])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/")
        router.refresh()
    }

    const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : userEmail?.charAt(0).toUpperCase() || "?"

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-surface">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 md:px-8">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="font-display text-xl font-bold tracking-tight text-ink">
                            LinkedIn Agent
                        </span>
                    </Link>
                    <nav className="hidden md:flex gap-6">
                        <Link
                            href="/create"
                            className="text-sm font-medium text-ink-light transition-colors hover:text-ink"
                        >
                            Create Post
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <DropdownMenu open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative size-10 rounded-full p-0 shrink-0"
                            >
                                <Avatar className="size-10 shrink-0 overflow-hidden rounded-full border border-border">
                                    <AvatarImage src={avatarUrl} alt={name || userEmail || "User avatar"} />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-64 rounded-xl border border-border bg-surface p-3 shadow-xl"
                            align="end"
                            forceMount
                            sideOffset={8}
                        >
                            <DropdownMenuLabel className="font-normal px-2 py-2">
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold leading-tight text-ink">
                                        {name || "Account"}
                                    </p>
                                    <p className="text-xs leading-tight text-ink-muted break-all">
                                        {userEmail}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="my-2" />
                            <div className="space-y-0.5">
                                <DropdownMenuItem asChild>
                                    <Link href="/account" className="flex cursor-pointer rounded-lg px-3 py-2.5">
                                        Account
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="flex cursor-pointer rounded-lg px-3 py-2.5">
                                        Brand Guidelines Setup
                                    </Link>
                                </DropdownMenuItem>
                                {isCreatePage && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/feedback" className="flex cursor-pointer rounded-lg px-3 py-2.5">
                                            Feedback
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link href="/privacy" className="flex cursor-pointer rounded-lg px-3 py-2.5">
                                        Privacy Policy
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:bg-error-light focus:text-destructive cursor-pointer rounded-lg px-3 py-2.5"
                                    onClick={handleSignOut}
                                >
                                    Log out
                                </DropdownMenuItem>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
