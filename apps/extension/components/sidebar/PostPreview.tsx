import { useState, useRef } from "react";

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
  const [mode, setMode] = useState<Mode>("preview");
  const [feedbackText, setFeedbackText] = useState("");
  const [editText, setEditText] = useState("");
  const originalTextRef = useRef("");

  if (!content && !isStreaming) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = () => {
    onApprove();
    setApproved(true);
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
    setFeedbackText("");
    onNewPost();
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
              <button className="btn-new-post" onClick={handleNewPost}>
                New Post
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
