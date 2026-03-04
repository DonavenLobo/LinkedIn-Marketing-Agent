import ReactDOM from "react-dom/client";
import { SidebarApp } from "../components/sidebar/SidebarApp";
import sidebarCss from "../assets/sidebar.css?inline";

export default defineContentScript({
  matches: ["https://www.linkedin.com/*"],
  cssInjectionMode: "manual",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "linkedin-agent-sidebar",
      position: "overlay",
      zIndex: 2147483647,
      onMount: (container, shadow) => {
        // Load DM Sans + DM Mono fonts into Shadow DOM (can't use @import in inlined CSS)
        const fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap";
        shadow.appendChild(fontLink);

        // Inject hand-written CSS into Shadow DOM
        const style = document.createElement("style");
        style.textContent = sidebarCss;
        shadow.appendChild(style);

        // Create wrapper with sidebar + toggle
        const wrapper = document.createElement("div");
        wrapper.id = "sidebar-wrapper";
        container.appendChild(wrapper);

        const root = ReactDOM.createRoot(wrapper);
        root.render(<SidebarRoot />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

function SidebarRoot() {
  const [collapsed, setCollapsed] = useState(true);
  const [showToggleTour, setShowToggleTour] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show toggle tour on first load
  useEffect(() => {
    hasToggleTourBeenSeen().then((seen) => {
      if (!seen) {
        setTimeout(() => setShowToggleTour(true), 1000);
      }
    });
  }, []);

  const handleToggleClick = () => {
    if (showToggleTour) {
      setShowToggleTour(false);
      markToggleTourSeen();
    }
    setCollapsed(!collapsed);
  };

  return (
    <>
      <button
        className={`sidebar-toggle ${collapsed ? "collapsed" : ""}`}
        onClick={handleToggleClick}
      >
        {collapsed ? "◀" : "▶"}
      </button>

      {showToggleTour && collapsed && (
        <>
          <div className="toggle-tour-pulse" />
          <div className="toggle-tour-tooltip" onClick={() => { setShowToggleTour(false); markToggleTourSeen(); }}>
            <div className="toggle-tour-bubble">
              <p>Click to open your AI writing assistant</p>
            </div>
            <div className="toggle-tour-arrow" />
          </div>
        </>
      )}

      <div ref={containerRef} className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
        <SidebarApp containerRef={containerRef} />
      </div>
    </>
  );
}

// Need these imports for the SidebarRoot component
import { useState, useRef, useEffect } from "react";
import { hasToggleTourBeenSeen, markToggleTourSeen } from "../lib/tour";
