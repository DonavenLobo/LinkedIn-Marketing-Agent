"use client";

import { useState } from "react";
import { useCompletion } from "ai/react";
import { LinkedInPreview } from "@/components/create/linkedin-preview";
import { PostActions } from "@/components/create/post-actions";

export default function CreatePage() {
  const [topic, setTopic] = useState("");

  const { completion, input, setInput, handleSubmit, isLoading, stop } =
    useCompletion({
      api: "/api/generate",
      body: { topic },
      onFinish: () => {
        // Post saved server-side in the onFinish callback
      },
    });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    // useCompletion needs `input` set — we pass topic via body
    setInput(topic);
    handleSubmit(e);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: Input */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create a Post</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter a topic and I&apos;ll write a LinkedIn post in your voice.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700"
            >
              What do you want to post about?
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. I just closed a $15M multifamily acquisition in Austin..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Writing..." : "Generate Post"}
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={stop}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Stop
              </button>
            )}
          </div>
        </form>

        {/* Quick topic suggestions */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">
            QUICK IDEAS
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Share a recent win",
              "Industry insight",
              "Lesson learned",
              "Team shoutout",
              "Hot take on market trends",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setTopic(suggestion)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="space-y-4">
        <LinkedInPreview content={completion} isLoading={isLoading} />
        {completion && !isLoading && (
          <PostActions content={completion} onRegenerate={() => {
            setInput(topic);
            const form = document.querySelector("form");
            if (form) form.requestSubmit();
          }} />
        )}
      </div>
    </div>
  );
}
