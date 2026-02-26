"use client";

interface LinkedInPreviewProps {
  content: string;
  isLoading: boolean;
  userName?: string;
  userHeadline?: string;
  avatarUrl?: string;
}

export function LinkedInPreview({
  content,
  isLoading,
  userName = "You",
  userHeadline = "LinkedIn Professional",
}: LinkedInPreviewProps) {
  if (!content && !isLoading) {
    return (
      <div className="rounded-[10px] border-2 border-dashed border-[#e2e2dc] p-8 text-center">
        <p className="text-sm text-[#8a8a8a]">
          Your LinkedIn post preview will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[#efefea] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Post header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <div className="h-12 w-12 rounded-full bg-[#eeeee9] flex items-center justify-center text-[#4a4a4a] font-semibold text-lg flex-shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1a1a1a]">{userName}</p>
          <p className="text-xs text-[#8a8a8a]">{userHeadline}</p>
          <p className="text-xs text-[#8a8a8a]">Just now · 🌐</p>
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 py-3">
        <div className="text-sm leading-relaxed text-[#4a4a4a] whitespace-pre-wrap">
          {content}
          {isLoading && (
            <span className="inline-block w-0.5 h-4 bg-[#1a1a1a] animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>

      {/* Engagement bar */}
      <div className="border-t border-[#efefea] px-4 py-1">
        <div className="flex items-center gap-1 text-xs text-[#8a8a8a] py-1">
          <span>👍❤️</span>
          <span className="ml-1">You and 42 others</span>
          <span className="ml-auto">12 comments · 5 reposts</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-[#efefea] flex">
        {["Like", "Comment", "Repost", "Send"].map((action) => (
          <button
            key={action}
            className="flex-1 py-2.5 text-xs font-medium text-[#8a8a8a] hover:bg-[#f7f7f5] transition"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
