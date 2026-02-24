"use client";

import { useState } from "react";

interface PostActionsProps {
  content: string;
  onRegenerate: () => void;
}

export function PostActions({ content, onRegenerate }: PostActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleCopy}
        className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
      >
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
      <button
        onClick={onRegenerate}
        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
      >
        Regenerate
      </button>
    </div>
  );
}
