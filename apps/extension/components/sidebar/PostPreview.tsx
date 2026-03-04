import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateHashtags } from "../../lib/api";

type Mode = "preview" | "feedback" | "editing";

interface PostPreviewProps {
  content: string;
  isStreaming: boolean;
  isFeedbackStreaming: boolean;
  postId: string | null;
  topic: string;
  onApprove: () => void;
  onFeedback: (feedback: string) => void;
  onEdit: (originalText: string, editedText: string) => void;
  onNewPost: () => void;
}

export function PostPreview({
  content,
  isStreaming,
  isFeedbackStreaming,
  postId,
  topic: _topic,
  onApprove,
  onFeedback,
  onEdit,
  onNewPost,
}: PostPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("preview");
  const [feedbackText, setFeedbackText] = useState("");
  const [editText, setEditText] = useState("");
  const [inserted, setInserted] = useState(false);
  const originalTextRef = useRef("");

  if (!content && !isStreaming) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = async () => {
    onApprove();
    setApproved(true);
    setHashtagsLoading(true);
    try {
      const tags = await generateHashtags(content);
      setHashtags(tags);
    } finally {
      setHashtagsLoading(false);
    }
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim() || !postId) return;
    onFeedback(feedbackText);
    setFeedbackText("");
    setMode("preview");
  };

  const handleStartEdit = () => {
    originalTextRef.current = content;
    setEditText(content);
    setMode("editing");
    setApproved(false);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEdit(originalTextRef.current, editText);
    setMode("preview");
    setApproved(false);
  };

  const handleNewPost = () => {
    setMode("preview");
    setApproved(false);
    setCopied(false);
    setInserted(false);
    setFeedbackText("");
    onNewPost();
  };

  const handleInsertToLinkedIn = () => {
    const postBox = document.querySelector<HTMLDivElement>(
      ".ql-editor[data-placeholder]"
    );
    if (postBox) {
      postBox.innerHTML = `<p>${content.replace(/\n/g, "</p><p>")}</p>`;
      postBox.dispatchEvent(new Event("input", { bubbles: true }));
      setInserted(true);
    } else {
      const btn = document.querySelector<HTMLButtonElement>(
        "button.share-box-feed-entry__trigger"
      );
      if (btn) {
        btn.click();
        setTimeout(() => {
          const editor = document.querySelector<HTMLDivElement>(
            ".ql-editor[data-placeholder]"
          );
          if (editor) {
            editor.innerHTML = `<p>${content.replace(/\n/g, "</p><p>")}</p>`;
            editor.dispatchEvent(new Event("input", { bubbles: true }));
            setInserted(true);
          }
        }, 600);
      }
    }
  };

  return (
    <>
      <motion.div
        className="post-preview glass-panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="post-preview-header">
          <div className="avatar">Y</div>
          <div className="post-meta">
            <div className="name">You</div>
            <div className="headline">LinkedIn Professional</div>
            <div className="time">Just now</div>
          </div>
        </div>
        <div className="post-preview-body">
          {mode === "editing" ? (
            <textarea
              className="edit-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={10}
            />
          ) : (
            <>
              {isFeedbackStreaming ? (
                <span className="feedback-streaming-text">{content}</span>
              ) : (
                (() => {
                  const paragraphs = content.split(/\n\n+/).filter(Boolean);
                  if (paragraphs.length === 0) return null;
                  return paragraphs.map((para, i) => {
                    let id: string | undefined;
                    if (i === 0) id = "tour-post-hook";
                    if (i === paragraphs.length - 1 && paragraphs.length > 1) id = "tour-post-cta";
                    return (
                      <span
                        key={i}
                        id={id}
                        style={{ display: "block", marginBottom: i < paragraphs.length - 1 ? "0.75em" : 0 }}
                      >
                        {para}
                      </span>
                    );
                  });
                })()
              )}
              {(isStreaming || isFeedbackStreaming) && <span className="cursor-blink" />}
            </>
          )}
        </div>
        <div className="post-preview-engagement">
          <span>42</span>
          <span>12 comments</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {content && !isStreaming && (
          <motion.div
            className="post-actions-area"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            {mode === "feedback" && (
              <div className="feedback-area">
                <textarea
                  className="feedback-textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What would you change? e.g. 'Make it shorter' or 'Less formal'"
                  rows={3}
                  disabled={isFeedbackStreaming}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSendFeedback();
                    }
                  }}
                />
                <div className="btn-row">
                  <button
                    className="btn-primary"
                    onClick={handleSendFeedback}
                    disabled={isFeedbackStreaming || !feedbackText.trim() || !postId}
                  >
                    {isFeedbackStreaming ? "Rewriting..." : "Send"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => { setMode("preview"); setFeedbackText(""); }}
                    disabled={isFeedbackStreaming}
                  >
                    Cancel
                  </button>
                </div>
                <p className="hint-text">Tip: Cmd+Enter to send</p>
              </div>
            )}

            {mode === "editing" && (
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button
                  className="btn-primary"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim()}
                >
                  Save Edit
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setMode("preview")}
                >
                  Cancel
                </button>
              </div>
            )}

            {mode === "preview" && (
              <>
                <div className="post-actions">
                  <motion.button
                    className="btn-approve"
                    onClick={handleApprove}
                    disabled={approved || !postId}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {approved ? "Approved" : "Approve"}
                  </motion.button>
                  <button
                    className="btn-secondary"
                    onClick={() => { setMode("feedback"); setFeedbackText(""); setApproved(false); }}
                    disabled={!postId}
                  >
                    Feedback
                  </button>
                </div>
                <div className="post-actions" style={{ marginTop: 6 }}>
                  <button
                    className="btn-secondary"
                    onClick={handleStartEdit}
                  >
                    Edit Post
                  </button>
                  <button className="btn-primary" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <motion.button
                  className="btn-insert-linkedin"
                  onClick={handleInsertToLinkedIn}
                  disabled={inserted}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {inserted ? "Inserted" : "Insert to LinkedIn"}
                </motion.button>
                <button className="btn-new-post" onClick={handleNewPost}>
                  New Post
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(approved || hashtagsLoading) && !isStreaming && (
          <motion.div
            className="hashtag-suggestions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="hashtag-suggestions-header">
              <span className="hashtag-suggestions-label font-mono">SUGGESTED HASHTAGS</span>
              {!hashtagsLoading && hashtags.length > 0 && (
                <button
                  className="copy-all-btn"
                  onClick={() => navigator.clipboard.writeText(hashtags.join(" "))}
                >
                  Copy all
                </button>
              )}
            </div>
            {hashtagsLoading ? (
              <div className="hashtag-skeleton">
                <div className="skeleton-pill" />
                <div className="skeleton-pill" />
                <div className="skeleton-pill" />
              </div>
            ) : (
              <div className="hashtag-chips">
                {hashtags.map((tag, i) => (
                  <motion.button
                    key={tag}
                    className="hashtag-chip"
                    onClick={() => navigator.clipboard.writeText(tag)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Media engagement tip */}
            <div className="media-tip">
              <span className="media-tip-label font-mono">MEDIA TIP</span>
              <div className="media-tip-list">
                <div className="media-tip-item">
                  <span className="media-dot media-dot--best" />
                  <span><strong>Video</strong> — highest engagement</span>
                </div>
                <div className="media-tip-item">
                  <span className="media-dot media-dot--great" />
                  <span><strong>Carousel</strong> — strong reach</span>
                </div>
                <div className="media-tip-item">
                  <span className="media-dot media-dot--good" />
                  <span><strong>Single image</strong> — solid boost</span>
                </div>
                <div className="media-tip-item">
                  <span className="media-dot media-dot--low" />
                  <span><strong>Text only</strong> — least reach</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
