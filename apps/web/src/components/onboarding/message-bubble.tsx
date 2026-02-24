"use client";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAssistant
            ? "bg-white text-gray-900 shadow-sm border border-gray-100"
            : "bg-blue-600 text-white"
        }`}
      >
        {message.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>
            {line.startsWith("**") && line.endsWith("**")
              ? <strong>{line.slice(2, -2)}</strong>
              : line.includes("**")
              ? renderBold(line)
              : line || <br />}
          </p>
        ))}
      </div>
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
