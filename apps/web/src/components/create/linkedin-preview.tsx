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
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">
          Your LinkedIn post preview will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Post header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{userHeadline}</p>
          <p className="text-xs text-gray-400">Just now · 🌐</p>
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 py-3">
        <div className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
          {content}
          {isLoading && (
            <span className="inline-block w-1 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>

      {/* Engagement bar */}
      <div className="border-t border-gray-100 px-4 py-1">
        <div className="flex items-center gap-1 text-xs text-gray-500 py-1">
          <span>👍❤️</span>
          <span className="ml-1">You and 42 others</span>
          <span className="ml-auto">12 comments · 5 reposts</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-gray-100 flex">
        {["Like", "Comment", "Repost", "Send"].map((action) => (
          <button
            key={action}
            className="flex-1 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
