"use client";

import { useState, useRef } from "react";
import type { LinkedInImportData } from "@linkedin-agent/shared";

interface LinkedInImportProps {
  onImported: (data: LinkedInImportData) => void;
  onSkip: () => void;
}

interface ScreenshotEntry {
  file: File;
  previewUrl: string;
}

export function LinkedInImport({ onImported, onSkip }: LinkedInImportProps) {
  const [pasteText, setPasteText] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<LinkedInImportData | null>(null);
  const [fieldsFound, setFieldsFound] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newEntries: ScreenshotEntry[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setScreenshots((prev) => [...prev, ...newEntries]);
    // Reset so the same files can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!pasteText.trim() && screenshots.length === 0) return;
    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    if (pasteText.trim()) formData.append("text", pasteText);
    for (const entry of screenshots) {
      formData.append("screenshots", entry.file);
    }

    try {
      const res = await fetch("/api/onboarding/linkedin-import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Upload failed");
      }

      const data = await res.json() as { importedData: LinkedInImportData; fieldsFound: string[] };
      setImportedData(data.importedData);
      setFieldsFound(data.fieldsFound);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract profile info.");
    } finally {
      setIsUploading(false);
    }
  };

  if (importedData) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-semibold text-green-800">Profile info extracted</p>
        </div>
        {fieldsFound.length > 0 && (
          <p className="text-xs text-green-700">
            Found: {fieldsFound.join(", ")}
          </p>
        )}
        <div className="text-xs text-green-700 space-y-0.5">
          {importedData.headline && <p>Headline: {importedData.headline}</p>}
          {importedData.industry && <p>Industry: {importedData.industry}</p>}
          {importedData.positions[0] && (
            <p>Current role: {importedData.positions[0].title} at {importedData.positions[0].company}</p>
          )}
          {importedData.skills.length > 0 && (
            <p>Skills: {importedData.skills.slice(0, 5).join(", ")}{importedData.skills.length > 5 ? "..." : ""}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onImported(importedData)}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Continue with this data →
        </button>
      </div>
    );
  }

  const canSubmit = pasteText.trim().length > 0 || screenshots.length > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Speed up your setup (optional)</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Share some info from your LinkedIn profile so the agent already knows who you are.
          Just copy-paste from your profile page, or upload screenshots — or both.
        </p>
      </div>

      {error && (
        <p className="text-xs text-error" role="alert">{error}</p>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-ink">Paste your profile info</label>
        <textarea
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none resize-none"
          rows={8}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={`Paste helpful info from your LinkedIn profile page.\n\nSome good ones are your Name, Headline, and About section\n\n Feel free to share whatever else you think may be good background on you! (e.g. experiences, education history, referrals, etc.)`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-ink">
          Screenshots{" "}
          <span className="text-ink-muted font-normal">(optional — upload one or more photos of your profile)</span>
        </label>

        {screenshots.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {screenshots.map((entry, i) => (
              <div key={i} className="relative">
                <img
                  src={entry.previewUrl}
                  alt={`Screenshot ${i + 1}`}
                  className="h-20 w-20 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveScreenshot(i)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white text-xs hover:opacity-90 leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border text-ink-muted hover:border-accent hover:text-ink transition-colors"
              title="Add more screenshots"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}

        {screenshots.length === 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs text-ink-muted hover:border-accent hover:text-ink transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Click to upload screenshots of your LinkedIn profile
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleScreenshotChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isUploading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Extracting profile info...
            </span>
          ) : (
            "Continue with this info →"
          )}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          Skip — I&apos;ll do it manually
        </button>
      </div>
    </div>
  );
}
