import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      {/* Nav */}
      <header className="border-b border-[#e2e2dc] bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="LinkedIn Agent" width={24} height={24} />
            <span className="text-sm font-semibold text-[#1a1a1a] tracking-[-0.01em]">
              LinkedIn Agent
            </span>
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-[#e2e2dc] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:bg-[#f7f7f5] transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="mb-4 inline-block font-mono text-[11px] font-medium text-[#2563eb] uppercase tracking-[0.08em]">
          AI-Powered LinkedIn Content
        </div>
        <h1
          className="text-5xl text-[#1a1a1a] leading-[1.2] tracking-[-0.03em] sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Write LinkedIn posts
          <br />
          <span className="text-[#2563eb]">in your voice</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[15px] text-[#8a8a8a] leading-[1.6]">
          Our AI learns your unique writing style through a quick conversation, then generates authentic LinkedIn posts that sound like you.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-[#1a1a1a] px-8 py-3 text-sm font-medium text-white hover:bg-[#333] transition tracking-[-0.01em]"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-[#e2e2dc] px-8 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-[#f7f7f5] transition"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h2
          className="text-center text-[28px] text-[#1a1a1a] tracking-[-0.02em] mb-12"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
        >
          How it works
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Quick voice setup",
              desc: "Have a conversation with our onboarding agent. Takes 10 minutes.",
            },
            {
              step: "02",
              title: "AI learns your style",
              desc: "Our AI analyzes your tone, vocabulary, and formatting preferences.",
            },
            {
              step: "03",
              title: "Generate posts",
              desc: "Enter a topic — get a LinkedIn post that sounds authentically you.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-[10px] border border-[#efefea] bg-white p-6"
            >
              <div
                className="mb-3 text-[11px] font-medium text-[#8a8a8a] tracking-[0.05em]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {item.step}
              </div>
              <h3 className="text-[15px] font-semibold text-[#1a1a1a] tracking-[-0.01em]">
                {item.title}
              </h3>
              <p className="mt-2 text-[13px] text-[#8a8a8a] leading-[1.6]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#e2e2dc] py-8 text-center">
        <span
          className="text-[11px] text-[#8a8a8a] tracking-[0.02em]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Built for the IVS Hackathon 2026
        </span>
      </footer>
    </main>
  );
}
