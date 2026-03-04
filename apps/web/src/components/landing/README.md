# Landing Page: Signal Engine + Voiceprint Hologram

## Hero Parameters (SignalCore)

The WebGL hero is in `signal-core.tsx`. Key constants at the top of the file:

| Constant      | Default | What it controls                        |
|---------------|---------|-----------------------------------------|
| `NODE_COUNT`  | 1000    | Number of instanced spheres in the orb  |
| `ACCENT_COLOR`| #0a66c2 | LinkedIn blue used for pulse highlights |
| `ACCENT_GLOW` | #3b9eff | Brighter blue for peak pulse moments    |
| `BASE_COLOR`  | #d0d5dd | Neutral grey for idle nodes             |

Inside `SignalNodes`, adjust:
- **Pulse speed**: change the `1.5` divisor in `(t - pulseStartRef.current) / 1.5` (lower = faster pulse).
- **Breathing speed**: change `t * 0.6` in the breathe calculation.
- **Parallax sensitivity**: change `mousePos.current.y * 0.08` multiplier.
- **Node density/spread**: change the radius `1.8 + (Math.random() - 0.5) * 0.8`.

DPR is clamped to `[1, 1.75]` in the Canvas props. The renderer pauses when `document.hidden` is true.

## Reduced Motion Fallback

When the user has `prefers-reduced-motion: reduce` enabled:

1. **SignalCore**: the entire Three.js Canvas is replaced with a static SVG illustration of scattered nodes.
2. **VoiceprintHologram**: the scanline animation stops; the line sits at 50% opacity.
3. **DemoPostCard**: the shimmer animation is disabled.
4. **Framer Motion**: automatically respects the media query and disables transitions.

No additional configuration is needed. The detection is live (responds to system setting changes).

## Demo Generator

The deterministic post generator is in `src/lib/demo-generator.ts`. It uses a string hash of the topic + tone to select from 6 templates per tone. No API calls are made. To add templates, append functions to the `TEMPLATES` record.
