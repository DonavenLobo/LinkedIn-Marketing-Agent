# Adding to Tour Component for Web and Extension

This plan outlines the implementation of an interactive guided tour using `driver.js`. The tour will assist users the first time they visit the web page and the first time they use the extension. It will also include a specific workflow to highlight the "Hook" and "Call to Action (CTA)" of a newly generated LinkedIn post.

## User Review Required
No breaking changes. This relies on `driver.js` which is a lightweight vanilla JS library.
Does the proposed approach for highlighting the hook (first paragraph) and CTA (last paragraph) align with your expectations?

## Proposed Changes

We will use `driver.js` because it is lightweight, framework-agnostic, and integrates seamlessly into both Next.js (Web) and WXT/React (Extension) environments.

### 1. Dependency Installation
- Run `pnpm add driver.js` in `<root>/apps/web` and `<root>/apps/extension`.

---

### Web Application (`apps/web`)

#### [NEW] [tour.ts](file:///Users/donavenlobo/Documents/Hackathon%20-%20IVS/Idea%201%20-%20LinkedIn%20Marketing%20Agent/LinkedIn-Marketing-Agent/apps/web/src/lib/tour.ts)
- Create a utility file to initialize and configure `driver.js` for the web app.
- Provide a function `startWebTour()` that defines the steps for the landing page (e.g., highlighting Navigation, Hero section, and CTA buttons).
- Use `localStorage` to ensure the tour only auto-plays the first time a user visits.

#### [MODIFY] [page.tsx](file:///Users/donavenlobo/Documents/Hackathon%20-%20IVS/Idea%201%20-%20LinkedIn%20Marketing%20Agent/LinkedIn-Marketing-Agent/apps/web/src/app/page.tsx)
- Add specific `id` attributes to key elements (e.g., `#tour-hero`, `#tour-how-it-works`, `#tour-login-btn`).
- Import `startWebTour` and trigger it in a `useEffect` on mount.

---

### Browser Extension (`apps/extension`)

#### [NEW] [tour.ts](file:///Users/donavenlobo/Documents/Hackathon%20-%20IVS/Idea%201%20-%20LinkedIn%20Marketing%20Agent/LinkedIn-Marketing-Agent/apps/extension/lib/tour.ts)
- Create a utility for the extension's tour logic.
- `startExtensionTour()`: Highlights standard sidebar areas (`.sidebar-header`, `.settings-gear-btn`, `.generate-form textarea`).
- `startPostReviewTour()`: A separate tour that highlights the hook and CTA within the generated post.

#### [MODIFY] [SidebarApp.tsx](file:///Users/donavenlobo/Documents/Hackathon%20-%20IVS/Idea%201%20-%20LinkedIn%20Marketing%20Agent/LinkedIn-Marketing-Agent/apps/extension/components/sidebar/SidebarApp.tsx)
- Trigger `startExtensionTour()` when the app status becomes `ready` (using `chrome.storage` to track if it's the first time).
- Add a "Help / Tour" button to retrigger tours manually.

#### [MODIFY] [PostPreview.tsx](file:///Users/donavenlobo/Documents/Hackathon%20-%20IVS/Idea%201%20-%20LinkedIn%20Marketing%20Agent/LinkedIn-Marketing-Agent/apps/extension/components/sidebar/PostPreview.tsx)
- Update the rendering of `content`. Instead of rendering the string as one block, split it by `\n` and wrap each line in a `<span>` or `<div>`.
- Assign `id="tour-post-hook"` to the first non-empty paragraph/line.
- Assign `id="tour-post-cta"` to the last non-empty paragraph/line.
- In `useEffect`, watch the `isStreaming` state. Once generation finishes (`isStreaming` becomes false and `content` exists), trigger `startPostReviewTour()` if it hasn't been shown yet.

## Verification Plan

### Automated Tests
- Since this relies on layout and DOM elements, no new automated unit tests are required. We will rely on Next.js and WXT build checks (`pnpm build`).

### Manual Verification
1. **Web App First Visit**: Open `localhost:3000` in an incognito window and verify the tour runs automatically, highlighting the hero section and CTA.
2. **Web App Replay**: Refresh the page—ensure the tour doesn't auto-play again.
3. **Extension First Open**: Open the extension sidebar and verify the initial setup tour runs.
4. **Post Generation**: Type a message to generate a post. Once the generated post finishes streaming, verify the second tour starts, correctly highlighting the generated Hook and then the CTA. 
5. **Feedback Loop**: Verify the tour suggests clicking "Feedback" if the user dislikes the hook or CTA.
