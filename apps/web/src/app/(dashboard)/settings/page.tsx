"use client";

import { useState, useEffect, useCallback } from "react";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const [guidelines, setGuidelines] = useState("");
  const [savedGuidelines, setSavedGuidelines] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const val = data.brand_guidelines ?? "";
        setGuidelines(val);
        setSavedGuidelines(val);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = guidelines !== savedGuidelines;

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_guidelines: guidelines }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const val = data.brand_guidelines ?? "";
      setSavedGuidelines(val);
      setGuidelines(val);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [guidelines]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1a1a1a] tracking-[-0.01em]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">
          Configure how your posts are generated.
        </p>
      </div>

      <div className="rounded-xl border border-[#e2e2dc] bg-white p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-[#1a1a1a]">
            Brand &amp; Company Guidelines
          </h2>
          <span className="rounded-full bg-[#f0f0eb] px-2 py-0.5 text-[11px] font-medium text-[#6b6b6b]">
            Optional
          </span>
        </div>
        <p className="text-sm text-[#6b6b6b] mb-4">
          Rules the AI will follow when generating posts. These supplement your
          voice profile — they won&apos;t change how you sound, just what you
          can and can&apos;t say.
        </p>

        {loading ? (
          <div className="h-40 rounded-lg border border-[#e2e2dc] bg-[#f7f7f5] animate-pulse" />
        ) : (
          <textarea
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            rows={8}
            placeholder={`Examples:\n- Always refer to the company as "Acme Corp", never "Acme"\n- Never mention internal project code names\n- Include our tagline "Building tomorrow, today" when relevant\n- Don't discuss ongoing acquisitions or deals in progress\n- Always capitalize "Fund III" (not "fund 3" or "Fund 3")`}
            className="w-full rounded-lg border border-[#e2e2dc] bg-[#f7f7f5] px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#b0b0a8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] resize-y min-h-[120px] transition"
          />
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-[#6b6b6b]">
            {saveState === "saved" && (
              <span className="text-green-600">Settings saved</span>
            )}
            {saveState === "error" && (
              <span className="text-red-600">Failed to save. Try again.</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveState === "saving"}
            className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saveState === "saving" ? "Saving..." : "Save Guidelines"}
          </button>
        </div>
      </div>
    </div>
  );
}
