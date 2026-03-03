import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — LinkedIn Agent",
  description: "Privacy policy for the LinkedIn Marketing Agent app and Chrome extension.",
};

export default function PrivacyPage() {
  const lastUpdated = "March 2, 2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors">
            ← LinkedIn Agent
          </Link>
          <span className="text-xs text-gray-400">Last updated {lastUpdated}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl font-normal text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-gray-500 mb-10">
          LinkedIn Marketing Agent (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the app&rdquo;) is committed to protecting your privacy.
          This policy explains what data we collect, how we use it, and your rights.
        </p>

        <div className="space-y-10">
          <Section title="1. What We Collect">
            <p>We collect the minimum data needed to provide the service:</p>
            <ul>
              <li>
                <strong>Account information</strong> — your name and email address, obtained via Google OAuth when you sign in.
              </li>
              <li>
                <strong>Voice profile data</strong> — writing samples and tone preferences you provide during onboarding, used to personalize generated content.
              </li>
              <li>
                <strong>Generated posts</strong> — LinkedIn post drafts created through the app, stored so you can review and edit them.
              </li>
              <li>
                <strong>Authentication tokens</strong> — session tokens stored locally in your browser (web) or in Chrome&apos;s local storage (extension) to keep you signed in.
              </li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> collect browsing history, read your LinkedIn messages, access your LinkedIn connections, or track activity outside of the app.
            </p>
          </Section>

          <Section title="2. How We Use Your Data">
            <ul>
              <li>To authenticate you and maintain your session across the web app and Chrome extension.</li>
              <li>To generate LinkedIn post drafts that match your personal writing style and voice.</li>
              <li>To improve your voice profile over time as you approve or edit generated posts.</li>
              <li>To provide customer support if you contact us.</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> sell your data, share it with advertisers, or use it to train AI models beyond your own personalized experience.
            </p>
          </Section>

          <Section title="3. Chrome Extension Permissions">
            <p>The Chrome extension requests the following permissions:</p>
            <ul>
              <li>
                <strong>activeTab / tabs</strong> — used solely to detect when you are on LinkedIn so the sidebar can be injected. No tab history is recorded or transmitted.
              </li>
              <li>
                <strong>storage</strong> — used to store your authentication token locally on your device so you remain signed in between browser sessions.
              </li>
              <li>
                <strong>Host access to linkedin.com</strong> — required to inject the sidebar UI into LinkedIn pages. We do not read, modify, or transmit any LinkedIn page content.
              </li>
            </ul>
          </Section>

          <Section title="4. Third-Party Services">
            <p>We use the following third-party services to operate the product:</p>
            <ul>
              <li>
                <strong>Supabase</strong> — database and authentication provider. Your data is stored in a Supabase-managed PostgreSQL database.
                See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase&apos;s Privacy Policy</a>.
              </li>
              <li>
                <strong>Anthropic (Claude)</strong> — AI model used to generate LinkedIn post drafts. Your voice profile and post topics are sent to Anthropic&apos;s API to produce content.
                See <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">Anthropic&apos;s Privacy Policy</a>.
              </li>
              <li>
                <strong>Google OAuth</strong> — used for sign-in only. We receive your name and email; we do not access your Google Drive, Gmail, or any other Google services.
                See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
              </li>
              <li>
                <strong>Vercel</strong> — cloud platform hosting the web application.
                See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel&apos;s Privacy Policy</a>.
              </li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>
              Your account data and voice profile are retained for as long as your account is active.
              Generated posts are stored until you delete them or close your account.
              You may request deletion of your data at any time by contacting us (see Section 7).
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              All data is transmitted over HTTPS. Authentication tokens are stored locally on your device and are never logged server-side.
              We follow industry-standard practices to protect your information, but no method of transmission or storage is 100% secure.
            </p>
          </Section>

          <Section title="7. Your Rights & Contact">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction or deletion of your data.</li>
              <li>Withdraw consent at any time by uninstalling the extension and deleting your account.</li>
            </ul>
            <p className="mt-3">
              To exercise these rights or ask questions about this policy, contact us at{" "}
              <a href="mailto:denshimdon@gmail.com">denshimdon@gmail.com</a>.
            </p>
          </Section>

          <Section title="8. Changes to This Policy">
            <p>
              We may update this policy as the product evolves. Material changes will be communicated via email or an in-app notice.
              The &ldquo;Last updated&rdquo; date at the top of this page reflects the most recent revision.
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} LinkedIn Marketing Agent. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800">
        {children}
      </div>
    </section>
  );
}
