import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* Top nav */}
      <header className="border-b border-[#e2e2dc] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/create" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="LinkedIn Agent" width={22} height={22} />
            <span className="text-sm font-semibold text-[#1a1a1a] tracking-[-0.01em]">
              LinkedIn Agent
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/create"
              className="text-sm font-medium text-[#1a1a1a] hover:text-[#4a4a4a] transition"
            >
              Create Post
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
