import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TourStep } from "../../lib/tour";

interface TourOverlayProps {
  steps: TourStep[];
  onComplete: () => void;
  containerEl: HTMLElement;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function computePopoverPosition(
  rect: TargetRect,
  side: TourStep["side"]
): React.CSSProperties {
  const GAP = 12;
  switch (side) {
    case "bottom":
      return {
        position: "absolute",
        top: rect.top + rect.height + GAP,
        left: 8,
        right: 8,
      };
    case "top":
      return {
        position: "absolute",
        top: Math.max(8, rect.top - GAP),
        left: 8,
        right: 8,
        transform: "translateY(-100%)",
      };
    case "left":
      return {
        position: "absolute",
        top: rect.top,
        right: `calc(100% - ${rect.left - GAP}px)`,
      };
    case "right":
      return {
        position: "absolute",
        top: rect.top,
        left: rect.left + rect.width + GAP,
      };
  }
}

export function TourOverlay({ steps, onComplete, containerEl }: TourOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const hasMeasuredRef = useRef(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const measureTarget = useCallback(() => {
    if (!containerEl || !step) return;
    const el = containerEl.querySelector(step.selector);
    const contentEl = containerEl.querySelector(".sidebar-content") as HTMLElement | null;

    hasMeasuredRef.current = true;

    if (!el) {
      // Element not found — clear rect so fallback popover renders
      setTargetRect(null);
      return;
    }

    // Scroll element into view before measuring, but keep manual scrolling available.
    if (contentEl?.contains(el)) {
      (el as HTMLElement).scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    }

    const updateRect = () => {
      const containerRect = containerEl.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const padding = step.spotlightPadding ?? 4;

      setTargetRect({
        top: elRect.top - containerRect.top - padding,
        left: elRect.left - containerRect.left - padding,
        width: elRect.width + padding * 2,
        height: elRect.height + padding * 2,
      });
    };

    updateRect();
    window.setTimeout(updateRect, 220);
  }, [containerEl, step]);

  useEffect(() => {
    hasMeasuredRef.current = false;
    measureTarget();
    window.addEventListener("resize", measureTarget);
    const content = containerEl?.querySelector(".sidebar-content");
    content?.addEventListener("scroll", measureTarget);
    return () => {
      window.removeEventListener("resize", measureTarget);
      content?.removeEventListener("scroll", measureTarget);
    };
  }, [measureTarget, containerEl]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  // Fallback position when element not found — render popover near top so user can still skip/advance
  const fallbackPopoverStyle: React.CSSProperties = {
    position: "absolute",
    top: 80,
    left: 8,
    right: 8,
  };

  const popoverStyle = targetRect
    ? computePopoverPosition(targetRect, step.side)
    : fallbackPopoverStyle;

  return (
    <div className="tour-overlay">
      {/* SVG mask with spotlight cutout — omit cutout when element not found */}
      <svg className="tour-mask" onClick={onComplete}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <motion.rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                ry="8"
                fill="black"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Spotlight border ring — only when element found */}
      {targetRect && (
        <motion.div
          className="tour-spotlight-ring"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: 1,
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}

      {/* Popover tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="tour-popover glass-panel"
          style={popoverStyle}
          initial={{ opacity: 0, y: step.side === "top" ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="tour-popover-header">
            <span className="tour-step-counter font-mono">
              {currentStep + 1} of {steps.length}
            </span>
            <button className="tour-skip-btn" onClick={onComplete}>
              Skip
            </button>
          </div>
          <h3 className="tour-title">{step.title}</h3>
          <p className="tour-description">{step.description}</p>
          <div className="tour-btn-row">
            {!isFirst && (
              <button className="btn-secondary tour-btn" onClick={handlePrev}>
                Back
              </button>
            )}
            <button className="btn-primary tour-btn" onClick={handleNext}>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
