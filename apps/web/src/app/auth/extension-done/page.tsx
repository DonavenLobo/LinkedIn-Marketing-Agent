"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function ExtensionDonePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    async function handleTokenHandoff() {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setStatus("error");
        return;
      }

      // Put tokens in the URL hash for the extension background script to capture
      const params = new URLSearchParams({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Replace the URL so the background script's onUpdated listener catches it
      window.history.replaceState(
        null,
        "",
        `/auth/extension-done?${params.toString()}`
      );

      setStatus("success");

      // The extension background script will detect this URL, grab tokens, and close the tab
      // If it doesn't close within 3 seconds, show a manual message
    }

    handleTokenHandoff();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <p className="text-gray-600">Connecting to extension...</p>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl">&#10003;</div>
            <h1 className="text-xl font-semibold text-gray-900">You&apos;re all set!</h1>
            <p className="text-gray-600">
              This tab should close automatically. If not, you can close it manually.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-red-600">Authentication failed</h1>
            <p className="text-gray-600">Please try signing in again from the extension.</p>
          </>
        )}
      </div>
    </div>
  );
}
