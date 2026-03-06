import { apiFetch } from "./api";

export interface TourStep {
  /** CSS selector within the Shadow DOM */
  selector: string;
  /** Popover title */
  title: string;
  /** Popover description */
  description: string;
  /** Which side the popover appears on relative to the target */
  side: "top" | "bottom" | "left" | "right";
  /** Padding around the spotlight cutout in px */
  spotlightPadding?: number;
}

// ── Sidebar tour steps (shown on first use after login) ──
export const SIDEBAR_TOUR_STEPS: TourStep[] = [
  {
    selector: ".sidebar-header",
    title: "Your AI writing assistant",
    description:
      "This sidebar lives on LinkedIn and helps you draft posts in your voice.",
    side: "bottom",
    spotlightPadding: 4,
  },
  {
    selector: ".settings-gear-btn",
    title: "Account menu",
    description:
      "Tap the gear to open the web create page with your profile dropdown ready.",
    side: "bottom",
    spotlightPadding: 6,
  },
  {
    selector: ".generate-form textarea",
    title: "Describe your topic",
    description:
      "Type what you want to post about, or pick a quick idea. The AI will ask follow-ups.",
    side: "top",
    spotlightPadding: 4,
  },
];

// ── Post review tour steps (shown after first generation) ──
export const POST_REVIEW_TOUR_STEPS: TourStep[] = [
  {
    selector: "#tour-post-hook",
    title: "The hook",
    description:
      "Your opening line. This is what stops the scroll — make it punchy.",
    side: "bottom",
    spotlightPadding: 4,
  },
  {
    selector: "#tour-post-cta",
    title: "The call to action",
    description:
      "End with engagement. A question or directive drives comments.",
    side: "top",
    spotlightPadding: 4,
  },
];

// ── API-backed tour flag helpers ──

// In-memory cache seeded from /api/me, so we don't re-fetch on every check
const _cache: Record<string, boolean> = {};
let _cacheLoaded = false;

/** Seed the cache from /api/me (call once at startup). */
export async function loadTourFlags(): Promise<void> {
  if (_cacheLoaded) return;
  try {
    const res = await apiFetch("/api/me");
    if (!res.ok) return;
    const data = await res.json();
    const u = data.user;
    if (u) {
      _cache.tour_toggle_seen = u.tour_toggle_seen ?? false;
      _cache.tour_sidebar_seen = u.tour_sidebar_seen ?? false;
      _cache.tour_ext_post_review_seen = u.tour_ext_post_review_seen ?? false;
      _cacheLoaded = true;
    }
  } catch {
    // Offline or not logged in — flags default to false
  }
}

async function markFlag(flag: string): Promise<void> {
  _cache[flag] = true;
  try {
    await apiFetch("/api/tour", {
      method: "PATCH",
      body: JSON.stringify({ flag }),
    });
  } catch {
    // Non-critical — silent fail
  }
}

function isSeen(flag: string): boolean {
  return _cache[flag] === true;
}

// ── Public helpers ──

export async function hasToggleTourBeenSeen(): Promise<boolean> {
  await loadTourFlags();
  return isSeen("tour_toggle_seen");
}

export async function markToggleTourSeen(): Promise<void> {
  return markFlag("tour_toggle_seen");
}

export async function hasSidebarTourBeenSeen(): Promise<boolean> {
  await loadTourFlags();
  return isSeen("tour_sidebar_seen");
}

export async function markSidebarTourSeen(): Promise<void> {
  return markFlag("tour_sidebar_seen");
}

export async function hasPostReviewTourBeenSeen(): Promise<boolean> {
  await loadTourFlags();
  return isSeen("tour_ext_post_review_seen");
}

export async function markPostReviewTourSeen(): Promise<void> {
  return markFlag("tour_ext_post_review_seen");
}
