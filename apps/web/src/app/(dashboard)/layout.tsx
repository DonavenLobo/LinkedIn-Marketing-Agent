import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/create" className="text-lg font-bold text-gray-900">
            LinkedIn Agent
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/create"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
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
