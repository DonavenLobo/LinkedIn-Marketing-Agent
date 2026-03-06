import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

// ── API helpers ──

async function fetchTourFlags(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch("/api/me");
    if (!res.ok) return {};
    const data = await res.json();
    return {
      tour_create_seen: data.user?.tour_create_seen ?? false,
      tour_post_review_seen: data.user?.tour_post_review_seen ?? false,
    };
  } catch {
    return {};
  }
}

async function markTourSeen(flag: string): Promise<void> {
  try {
    await fetch("/api/tour", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flag }),
    });
  } catch {
    // Non-critical — silent fail
  }
}

// ── Create page tour (first time on /create) ──
const createPageSteps: DriveStep[] = [
  {
    element: "#tour-create-chat",
    popover: {
      title: "Describe your topic",
      description:
        "Tell the AI what you want to post about. It'll ask a few follow-ups to nail your angle.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-quick-ideas",
    popover: {
      title: "Quick ideas",
      description:
        "Not sure what to write? Pick one of these to get started instantly.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-preview-area",
    popover: {
      title: "Post preview",
      description:
        "Your generated post appears here in a LinkedIn-style preview, streamed in real time.",
      side: "left",
      align: "start",
    },
  },
];

export async function startCreatePageTour() {
  if (typeof window === "undefined") return;

  const flags = await fetchTourFlags();
  if (flags.tour_create_seen) return;

  setTimeout(() => {
    const tourDriver = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 10,
      popoverClass: "la-tour-popover",
      steps: createPageSteps,
      onDestroyed: () => {
        markTourSeen("tour_create_seen");
      },
    });

    tourDriver.drive();
  }, 800);
}

// ── Post review tour (hook + CTA + edit + approve, after first generation) ──
const postReviewSteps: DriveStep[] = [
  {
    element: "#tour-post-hook",
    popover: {
      title: "The hook",
      description:
        "Your opening line. This is what stops the scroll — make it punchy.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-post-cta",
    popover: {
      title: "The call to action",
      description:
        "End with engagement. A question or directive drives comments.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#tour-edit-pencil",
    popover: {
      title: "Edit inline",
      description:
        "Click the pencil to edit the post directly inside the preview. No separate editor needed.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#tour-post-actions",
    popover: {
      title: "Approve to teach your AI",
      description:
        "Hit Approve once you're happy with a post. This signals to your agent what great content looks like for you — improving every future post.",
      side: "top",
      align: "start",
    },
  },
];

// Cache the post review flag so we don't re-fetch every time isLoading toggles
let _postReviewSeenCache: boolean | null = null;

export async function startPostReviewTour() {
  if (typeof window === "undefined") return;

  if (_postReviewSeenCache === null) {
    const flags = await fetchTourFlags();
    _postReviewSeenCache = flags.tour_post_review_seen ?? false;
  }

  if (_postReviewSeenCache) return;

  setTimeout(() => {
    if (!document.querySelector("#tour-post-hook")) return;

    _postReviewSeenCache = true;

    const tourDriver = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 10,
      popoverClass: "la-tour-popover",
      steps: postReviewSteps,
      onDestroyed: () => {
        markTourSeen("tour_post_review_seen");
      },
    });

    tourDriver.drive();
  }, 600);
}

export async function hasPostReviewTourBeenSeen(): Promise<boolean> {
  if (typeof window === "undefined") return true;

  if (_postReviewSeenCache !== null) return _postReviewSeenCache;

  const flags = await fetchTourFlags();
  _postReviewSeenCache = flags.tour_post_review_seen ?? false;
  return _postReviewSeenCache;
}
