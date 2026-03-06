"use client";

import { FormEvent, useState } from "react";
import { Button } from "@linkedin-agent/shared";
import { toast } from "sonner";

type ThreePointRating = "bad" | "okay" | "good";
type AdoptionRating = "not_really" | "maybe" | "absolutely";

const threePointOptions: Array<{ label: string; value: ThreePointRating }> = [
  { label: "Bad", value: "bad" },
  { label: "Okay", value: "okay" },
  { label: "Good", value: "good" },
];

const adoptionOptions: Array<{ label: string; value: AdoptionRating }> = [
  { label: "Not Really", value: "not_really" },
  { label: "Maybe", value: "maybe" },
  { label: "Absolutely", value: "absolutely" },
];

function RatingQuestion<T extends string>({
  prompt,
  value,
  onChange,
  options,
}: {
  prompt: string;
  value: T | null;
  onChange: (nextValue: T) => void;
  options: Array<{ label: string; value: T }>;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium leading-5 text-ink">{prompt}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition ${
                isSelected
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-border bg-surface text-ink-light hover:bg-surface-subtle"
              }`}
            >
              <input
                type="radio"
                name={prompt}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function FeedbackPage() {
  const [onboardingRating, setOnboardingRating] = useState<ThreePointRating | null>(null);
  const [generatedPostsRating, setGeneratedPostsRating] = useState<ThreePointRating | null>(null);
  const [wouldUseRating, setWouldUseRating] = useState<AdoptionRating | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setOnboardingRating(null);
    setGeneratedPostsRating(null);
    setWouldUseRating(null);
    setNotes("");
  };

  const canSubmit =
    onboardingRating !== null &&
    generatedPostsRating !== null &&
    wouldUseRating !== null &&
    !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onboardingRating || !generatedPostsRating || !wouldUseRating) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_rating: onboardingRating,
          generated_posts_rating: generatedPostsRating,
          would_use_if_resolved_rating: wouldUseRating,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to submit feedback");
      }

      toast.success("Thanks for the feedback");
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="font-display text-3xl text-ink">Product Feedback</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Quick 1-minute check-in so we can improve your onboarding and post generation experience.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <RatingQuestion
            prompt="How was the onboarding?"
            value={onboardingRating}
            onChange={setOnboardingRating}
            options={threePointOptions}
          />

          <RatingQuestion
            prompt="How was the generated posts?"
            value={generatedPostsRating}
            onChange={setGeneratedPostsRating}
            options={threePointOptions}
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-5 text-ink">
              Is there anything that would be helpful to have or issues you are experiencing?
            </legend>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Optional details"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              disabled={isSubmitting}
            />
          </fieldset>

          <RatingQuestion
            prompt="If certain issues and requested features are resolved, would you use this?"
            value={wouldUseRating}
            onChange={setWouldUseRating}
            options={adoptionOptions}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Submitting..." : "Submit feedback"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
