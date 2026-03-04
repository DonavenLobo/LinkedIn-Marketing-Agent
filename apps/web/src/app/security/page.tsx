import Link from "next/link";

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-surface-subtle">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 md:px-8 text-center">
        <h1 className="font-display text-4xl text-ink tracking-tight">
          Security &amp; Privacy
        </h1>
        <p className="mt-4 text-base text-ink-muted leading-relaxed max-w-xl mx-auto">
          This page is coming soon. We take data privacy seriously and will publish
          our full security documentation here.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="text-sm font-medium text-accent hover:text-accent-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
