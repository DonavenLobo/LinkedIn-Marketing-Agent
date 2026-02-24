"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { ONBOARDING_GOALS, TONE_WORDS } from "@linkedin-agent/shared";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: readonly string[] | string[];
  multiSelect?: boolean;
}

type Step =
  | "name"
  | "role"
  | "goals"
  | "audience"
  | "tone"
  | "sample"
  | "more_samples"
  | "analyzing"
  | "done";

const STEP_QUESTIONS: Record<string, string> = {
  name: "Hey there! 👋 Let's get your voice profile set up. What should I call you?",
  role: "Tell me about what you do, {name}. What's your role and industry?",
  goals: "What are you hoping to achieve on LinkedIn? Pick all that apply:",
  audience: "Who are you trying to reach with your posts? Describe your ideal audience.",
  tone: "Pick the words that describe how you want to come across:",
  sample:
    "This is the most important step! Share a professional win you're proud of, or paste a LinkedIn post you've written before. The more natural your voice, the better I can mimic it.",
  more_samples:
    "Want to paste 1-2 more posts or examples? This helps me nail your voice even better. Type 'skip' to move on.",
};

interface OnboardingChatProps {
  userId: string;
}

export function OnboardingChat({ userId }: OnboardingChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>("name");
  const [isTyping, setIsTyping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Collected answers
  const [answers, setAnswers] = useState({
    name: "",
    role_description: "",
    goals: [] as string[],
    target_audience: "",
    tone_words: [] as string[],
    writing_sample: "",
    additional_samples: [] as string[],
  });

  // Multi-select state for goals and tone steps
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Show initial message
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: STEP_QUESTIONS.name,
          },
        ]);
        setIsTyping(false);
      }, 800);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const addAssistantMessage = (
    content: string,
    options?: readonly string[] | string[],
    multiSelect?: boolean
  ) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "assistant",
          content,
          options: options ? [...options] : undefined,
          multiSelect,
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSubmit = async (overrideValue?: string) => {
    const value = overrideValue || input.trim();
    if (!value && selectedOptions.length === 0) return;

    const userMessage = selectedOptions.length > 0 ? selectedOptions.join(", ") : value;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: "user", content: userMessage },
    ]);
    setInput("");

    // Process based on current step
    switch (step) {
      case "name": {
        const name = value;
        setAnswers((prev) => ({ ...prev, name }));
        setStep("role");
        addAssistantMessage(STEP_QUESTIONS.role.replace("{name}", name));
        break;
      }
      case "role": {
        setAnswers((prev) => ({ ...prev, role_description: value }));
        setStep("goals");
        addAssistantMessage(
          STEP_QUESTIONS.goals,
          ONBOARDING_GOALS,
          true
        );
        break;
      }
      case "goals": {
        const goals = selectedOptions.length > 0 ? selectedOptions : [value];
        setAnswers((prev) => ({ ...prev, goals }));
        setSelectedOptions([]);
        setStep("audience");
        addAssistantMessage(STEP_QUESTIONS.audience);
        break;
      }
      case "audience": {
        setAnswers((prev) => ({ ...prev, target_audience: value }));
        setStep("tone");
        addAssistantMessage(STEP_QUESTIONS.tone, TONE_WORDS, true);
        break;
      }
      case "tone": {
        const toneWords = selectedOptions.length > 0 ? selectedOptions : [value];
        setAnswers((prev) => ({ ...prev, tone_words: toneWords }));
        setSelectedOptions([]);
        setStep("sample");
        addAssistantMessage(STEP_QUESTIONS.sample);
        break;
      }
      case "sample": {
        setAnswers((prev) => ({ ...prev, writing_sample: value }));
        setStep("more_samples");
        addAssistantMessage(STEP_QUESTIONS.more_samples);
        break;
      }
      case "more_samples": {
        if (value.toLowerCase() === "skip" || value.toLowerCase() === "no") {
          // Start analysis
          await analyzeVoice(answers);
        } else {
          setAnswers((prev) => ({
            ...prev,
            additional_samples: [...prev.additional_samples, value],
          }));
          addAssistantMessage(
            "Got it! Paste another, or type 'skip' to finish."
          );
        }
        break;
      }
    }
  };

  const analyzeVoice = async (finalAnswers: typeof answers) => {
    setStep("analyzing");
    setAnalyzing(true);
    addAssistantMessage(
      "Analyzing your voice and creating your profile... This takes about 10 seconds. ✨"
    );

    try {
      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers, userId }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();

      setStep("done");
      setAnalyzing(false);

      const summary = [
        `Your voice profile is ready, ${finalAnswers.name}! Here's what I captured:`,
        "",
        `**Tone:** ${result.voice_profile.tone_description}`,
        `**Style:** ${result.voice_profile.formality}`,
        `**Traits:** ${result.voice_profile.personality_traits.join(", ")}`,
        "",
        "Let's go write some posts! 🚀",
      ].join("\n");

      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), role: "assistant", content: summary },
      ]);

      // Redirect after a short delay
      setTimeout(() => router.push("/create"), 3000);
    } catch {
      setAnalyzing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "assistant",
          content:
            "Sorry, something went wrong analyzing your voice. Let me try again...",
        },
      ]);
      setStep("more_samples");
    }
  };

  const toggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const currentMessage = messages[messages.length - 1];
  const showMultiSelect =
    currentMessage?.multiSelect && currentMessage?.options;

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Voice Profile Setup
        </h1>
        <p className="text-sm text-gray-500">
          Step{" "}
          {["name", "role", "goals", "audience", "tone", "sample", "more_samples"].indexOf(step) + 1 || 7}{" "}
          of 7
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Multi-select options */}
      {showMultiSelect && step !== "analyzing" && step !== "done" && (
        <div className="px-6 pb-2">
          <div className="flex flex-wrap gap-2">
            {currentMessage.options!.map((option) => (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  selectedOptions.includes(option)
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {selectedOptions.length > 0 && (
            <button
              onClick={() => handleSubmit()}
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Continue with {selectedOptions.length} selected
            </button>
          )}
        </div>
      )}

      {/* Input */}
      {step !== "analyzing" && step !== "done" && !showMultiSelect && (
        <div className="border-t bg-white px-6 py-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                step === "sample" || step === "more_samples"
                  ? "Paste your post or writing sample here..."
                  : "Type your answer..."
              }
              rows={step === "sample" || step === "more_samples" ? 4 : 1}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim()}
              className="self-end rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Analyzing spinner */}
      {analyzing && (
        <div className="border-t bg-white px-6 py-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-500">Creating your voice profile...</p>
        </div>
      )}
    </div>
  );
}
