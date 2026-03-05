"use client";

import { useState, useRef, useCallback } from "react";
import type { LinkedInImportData } from "@linkedin-agent/shared";

interface LinkedInImportProps {
  onImported: (data: LinkedInImportData) => void;
  onSkip: () => void;
}

export function LinkedInImport({ onImported, onSkip }: LinkedInImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<LinkedInImportData | null>(null);
  const [fieldsFound, setFieldsFound] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const validTypes = ["text/csv", "application/zip", "application/x-zip-compressed"];
    const validExts = [".csv", ".zip"];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!validTypes.includes(file.type) && !hasValidExt) {
      setError("Please upload a CSV or ZIP file from your LinkedIn export.");
      return;
    }

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

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
      setError(err instanceof Error ? err.message : "Failed to import LinkedIn data.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (importedData) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-semibold text-green-800">LinkedIn data imported</p>
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

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Speed up your setup (optional)</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Import your LinkedIn profile export so we can skip background questions and jump straight to learning your voice.
        </p>
      </div>

      <details className="text-xs text-ink-muted">
        <summary className="cursor-pointer underline underline-offset-2 hover:text-ink">
          How to export from LinkedIn
        </summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Go to LinkedIn → Settings &amp; Privacy</li>
          <li>Click "Data Privacy" → "Get a copy of your data"</li>
          <li>Select <strong>Profile</strong> and click "Request archive"</li>
          <li>LinkedIn emails you a ZIP — usually within a few minutes</li>
          <li>Upload that ZIP here</li>
        </ol>
        <p className="mt-2 text-ink-muted/80">
          The basic export includes your headline, summary, and industry. If you want your full job history and skills, request "The Works" export instead (takes longer).
        </p>
      </details>

      {error && (
        <p className="text-xs text-error" role="alert">{error}</p>
      )}

      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer ${isDragging
            ? "border-accent bg-accent-light"
            : "border-border hover:border-accent/60 hover:bg-surface-subtle"
          }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        ) : (
          <>
            <svg className="h-8 w-8 text-ink-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-ink-muted">Drop your LinkedIn ZIP or CSV here</p>
            <p className="text-xs text-ink-muted mt-1">or click to browse</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.zip"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="w-full text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Skip — I&apos;ll do it manually
      </button>
    </div>
  );
}
