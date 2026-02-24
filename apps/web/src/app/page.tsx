import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero */}
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="mb-6 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          AI-Powered LinkedIn Content
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Write LinkedIn posts
          <br />
          <span className="text-blue-600">in your voice</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Stop staring at a blank page. Our AI learns your unique writing style
          through a quick conversation, then generates authentic LinkedIn posts
          that sound like you — not a robot.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-12">
          How it works
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Quick voice setup",
              desc: "Answer a few questions and paste a writing sample. Takes 2 minutes.",
            },
            {
              step: "2",
              title: "AI learns your style",
              desc: "Our AI analyzes your tone, vocabulary, and formatting preferences.",
            },
            {
              step: "3",
              title: "Generate posts",
              desc: "Enter a topic — get a LinkedIn post that sounds authentically you.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        Built for the IVS Hackathon 2026
      </footer>
    </main>
  );
}
