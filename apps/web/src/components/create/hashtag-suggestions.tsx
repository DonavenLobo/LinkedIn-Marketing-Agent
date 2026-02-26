"use client";
import { useState, useEffect } from "react";

interface HashtagSuggestionsProps {
  postContent: string;
  postId: string;
}

export function HashtagSuggestions({ postContent, postId: _postId }: HashtagSuggestionsProps) {
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/post/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_content: postContent }),
    })
      .then((r) => r.json())
      .then((data) => setHashtags(data.hashtags ?? []))
      .finally(() => setIsLoading(false));
  }, [postContent]);

  const copyTag = async (tag: string) => {
    await navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(hashtags.join(" "));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className="rounded-lg border border-[#e2e2dc] bg-[#f7f7f5] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#4a4a4a] uppercase tracking-wide">
          Suggested Hashtags
        </p>
        {!isLoading && hashtags.length > 0 && (
          <button onClick={copyAll} className="text-xs text-[#2563eb] hover:underline">
            {copiedAll ? "Copied!" : "Copy all"}
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-[#eeeee9] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {hashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => copyTag(tag)}
              className="rounded-full border border-[#e2e2dc] bg-white px-3 py-1 text-xs text-[#2563eb] hover:border-[#2563eb] transition"
            >
              {copiedTag === tag ? "Copied!" : tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
