import { useState } from "react";

interface PostPreviewProps {
  content: string;
  isStreaming: boolean;
}

export function PostPreview({ content, isStreaming }: PostPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!content && !isStreaming) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {content}
          {isStreaming && <span className="cursor-blink" />}
        </div>
        <div className="post-preview-engagement">
          <span>👍❤️ 42</span>
          <span>12 comments · 5 reposts</span>
        </div>
      </div>

      {content && !isStreaming && (
        <div className="post-actions">
          <button className="btn-primary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              // Scroll back to top to re-enter topic
              document.querySelector(".sidebar-content")?.scrollTo(0, 0);
            }}
          >
            New Post
          </button>
        </div>
      )}
    </>
  );
}
