"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCompletion } from "ai/react";
import { LinkedInPreview } from "@/components/create/linkedin-preview";
import { PostActions } from "@/components/create/post-actions";
import { PostChat } from "@/components/create/post-chat";
import { SignalCore } from "@/components/landing/signal-core";
import { startCreatePageTour, startPostReviewTour, hasPostReviewTourBeenSeen } from "@/lib/tour";

export default function CreatePage() {
  const [topic, setTopic] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [displayContent, setDisplayContent] = useState("");
  const [chatKey, setChatKey] = useState(0);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const prevLoadingRef = useRef(false);

  // Create page tour on first visit
  useEffect(() => {
    startCreatePageTour();
  }, []);

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
      setChatCollapsed(true);
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
    setChatCollapsed(false);
  }, [setCompletion]);

  const handleRegenerate = useCallback(async () => {
    if (!topic) return;
    setPostId(null);
    setDisplayContent("");
    setCompletion("");
    await complete("", { body: { topic } });
  }, [topic, complete, setCompletion]);

  // Post review tour after first generation completes
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && (displayContent || completion)) {
      hasPostReviewTourBeenSeen().then((seen) => {
        if (!seen) startPostReviewTour();
      });
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, displayContent, completion]);

  const previewContent = isLoading ? completion : displayContent || completion;

  return (
    <div className="flex gap-4 items-start">
      {/* Left: Chat intake — collapses when generation starts */}
      <motion.div
        id="tour-create-chat"
        className="space-y-6 overflow-hidden flex-shrink-0"
        animate={{
          width: chatCollapsed ? 0 : "50%",
          opacity: chatCollapsed ? 0 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        style={{ minWidth: 0 }}
      >
        <PostChat
          key={chatKey}
          onReadyToGenerate={handleReadyToGenerate}
          onReset={handleReset}
          onStop={stop}
          isGenerating={isLoading}
        />
      </motion.div>

      {/* Chat toggle — shown once a post exists, toggles collapse/expand */}
      {(previewContent || isLoading) && (
        <motion.button
          onClick={() => setChatCollapsed((c) => !c)}
          className="self-start mt-2 flex-shrink-0 flex items-center justify-center rounded-full w-7 h-7 bg-surface border border-border text-ink-muted hover:text-ink hover:border-accent transition shadow-sm"
          title={chatCollapsed ? "Show chat" : "Hide chat"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.svg
            className="h-3.5 w-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: chatCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M10 3L5 8l5 5" />
          </motion.svg>
        </motion.button>
      )}

      {/* Right: Preview — flex-1 so it takes remaining space, content centered at max-width */}
      <div id="tour-preview-area" className="flex-1 min-w-0">
        <div className="mx-auto w-full max-w-xl">
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
              <LinkedInPreview
                content={previewContent}
                isLoading={isLoading}
                postId={resolvedPostId}
                onContentUpdate={(newContent) => {
                  setDisplayContent(newContent);
                  setCompletion(newContent);
                }}
              />
              {previewContent && !isLoading && (
                <PostActions
                  content={previewContent}
                  postId={resolvedPostId}
                  topic={topic}
                  onRegenerate={handleRegenerate}
                  onStartAnotherDraft={handleReset}
                  onContentUpdate={(newContent) => {
                    setDisplayContent(newContent);
                    setCompletion(newContent);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
