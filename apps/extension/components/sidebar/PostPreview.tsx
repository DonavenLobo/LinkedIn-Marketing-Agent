import { useState, useRef } from "react";
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
      <div className="post-preview">
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
              ) : content}
              {(isStreaming || isFeedbackStreaming) && <span className="cursor-blink" />}
            </>
          )}
        </div>
        <div className="post-preview-engagement">
          <span>👍❤️ 42</span>
          <span>12 comments · 5 reposts</span>
        </div>
      </div>

      {content && !isStreaming && (
        <div className="post-actions-area">
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
                  {isFeedbackStreaming ? "Rewriting…" : "Send"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { setMode("preview"); setFeedbackText(""); }}
                  disabled={isFeedbackStreaming}
                >
                  Cancel
                </button>
              </div>
              <p className="hint-text">Tip: ⌘+Enter to send</p>
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
                <button
                  className="btn-approve"
                  onClick={handleApprove}
                  disabled={approved || !postId}
                >
                  {approved ? "Approved ✓" : "Approve"}
                </button>
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
              <button
                className="btn-insert-linkedin"
                onClick={handleInsertToLinkedIn}
                disabled={inserted}
              >
                {inserted ? "Inserted ✓" : "Insert to LinkedIn"}
              </button>
              <button className="btn-new-post" onClick={handleNewPost}>
                New Post
              </button>
            </>
          )}
        </div>
      )}

      {(approved || hashtagsLoading) && !isStreaming && (
        <div className="hashtag-suggestions">
          <div className="hashtag-suggestions-header">
            <span className="hashtag-suggestions-label">SUGGESTED HASHTAGS</span>
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
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  className="hashtag-chip"
                  onClick={() => navigator.clipboard.writeText(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Media engagement tip */}
          <div className="media-tip">
            <span className="media-tip-label">MEDIA TIP</span>
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
        </div>
      )}
    </>
  );
}
