import { useState } from "react";

interface GenerateFormProps {
  onGenerate: (topic: string) => void;
  isLoading: boolean;
  onStop: () => void;
}

export function GenerateForm({ onGenerate, isLoading, onStop }: GenerateFormProps) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    onGenerate(topic.trim());
  };

  return (
    <form className="generate-form" onSubmit={handleSubmit}>
      <label htmlFor="topic-input">What do you want to post about?</label>
      <textarea
        id="topic-input"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. I just closed a $15M multifamily deal..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <div className="btn-row">
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !topic.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner" /> Writing...
            </>
          ) : (
            "Generate Post"
          )}
        </button>
        {isLoading && (
          <button type="button" className="btn-secondary" onClick={onStop}>
            Stop
          </button>
        )}
      </div>
    </form>
  );
}
