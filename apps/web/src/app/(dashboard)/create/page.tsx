"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useCompletion } from "ai/react";
import { LinkedInPreview } from "@/components/create/linkedin-preview";
import { PostActions } from "@/components/create/post-actions";
import { PostChat } from "@/components/create/post-chat";
import { SignalCore } from "@/components/landing/signal-core";

export default function CreatePage() {
  const [topic, setTopic] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [displayContent, setDisplayContent] = useState("");
  const [chatKey, setChatKey] = useState(0);

  const { completion, isLoading, stop, setCompletion, data, complete } =
    useCompletion({
      api: "/api/generate",
      onResponse: () => {
        setPostId(null);
        setDisplayContent("");
      },
      onFinish: (_, finalCompletion) => {
        setDisplayContent(finalCompletion);
      },
    });

  // Extract postId from StreamData annotations
  const resolvedPostId = postId ?? (
    Array.isArray(data)
      ? (data.find(
          (d): d is { postId: string } =>
            typeof d === "object" && d !== null && "postId" in d
        )?.postId ?? null)
      : null
  );

  const handleReadyToGenerate = useCallback(
    async (enrichedTopic: string) => {
      setTopic(enrichedTopic);
      await complete("", { body: { topic: enrichedTopic } });
    },
    [complete]
  );

  const handleReset = useCallback(() => {
    setTopic("");
    setPostId(null);
    setDisplayContent("");
    setCompletion("");
    setChatKey((k) => k + 1);
  }, [setCompletion]);

  const handleRegenerate = useCallback(async () => {
    if (!topic) return;
    setPostId(null);
    setDisplayContent("");
    setCompletion("");
    await complete("", { body: { topic } });
  }, [topic, complete, setCompletion]);

  const previewContent = isLoading ? completion : displayContent || completion;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: Chat intake */}
      <div className="space-y-6">
        <PostChat
          key={chatKey}
          onReadyToGenerate={handleReadyToGenerate}
          onReset={handleReset}
          onStop={stop}
          isGenerating={isLoading}
        />
      </div>

      {/* Right: Preview with orb background */}
      <div className="relative min-h-[400px] lg:min-h-[480px]">
        <motion.div
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg pointer-events-none"
          initial={false}
          animate={{ opacity: previewContent ? 0 : 1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <SignalCore generating={isLoading} />
        </motion.div>
        <div
          className={`relative z-10 flex flex-col gap-4 min-h-[400px] lg:min-h-[480px] ${
            !previewContent ? "justify-center" : "justify-start"
          }`}
        >
          <LinkedInPreview content={previewContent} isLoading={isLoading} />
          {previewContent && !isLoading && (
            <PostActions
              content={previewContent}
              postId={resolvedPostId}
              topic={topic}
              onRegenerate={handleRegenerate}
              onContentUpdate={(newContent) => {
                setDisplayContent(newContent);
                setCompletion(newContent);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
