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

  // Drag state
  const [toggleTop, setToggleTop] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("la-toggle-top");
      return saved ? parseInt(saved, 10) : -1; // -1 = use CSS default (50%)
    } catch { return -1; }
  });
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartTopRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const currentTopRef = useRef(toggleTop);

  // Show toggle tour on first load
  useEffect(() => {
    hasToggleTourBeenSeen().then((seen) => {
      if (!seen) {
        setTimeout(() => setShowToggleTour(true), 1000);
      }
    });
  }, []);

  const getToggleTop = () => {
    return toggleTop === -1 ? window.innerHeight / 2 : toggleTop;
  };

  const handleToggleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartYRef.current = e.clientY;
    dragStartTopRef.current = getToggleTop();

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = ev.clientY - dragStartYRef.current;
      if (Math.abs(deltaY) > 5) {
        hasDraggedRef.current = true;
        const newTop = Math.max(32, Math.min(window.innerHeight - 96, dragStartTopRef.current + deltaY));
        currentTopRef.current = newTop;
        setToggleTop(newTop);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (hasDraggedRef.current) {
        try {
          localStorage.setItem("la-toggle-top", String(currentTopRef.current));
        } catch { /* non-critical */ }
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleToggleClick = () => {
    if (hasDraggedRef.current) return;
    if (showToggleTour) {
      setShowToggleTour(false);
      markToggleTourSeen();
    }
    setCollapsed(!collapsed);
  };

  const toggleStyle: React.CSSProperties = toggleTop === -1
    ? {}
    : { top: `${toggleTop}px`, transform: "none" };

  return (
    <>
      <button
        className={`sidebar-toggle ${collapsed ? "collapsed" : ""}`}
        onMouseDown={handleToggleMouseDown}
        onClick={handleToggleClick}
        style={toggleStyle}
      >
        {collapsed ? "◀" : "▶"}
      </button>

      {showToggleTour && collapsed && (
        <>
          <div className="toggle-tour-pulse" style={toggleStyle} />
          <div
            className="toggle-tour-tooltip"
            style={toggleStyle}
            onClick={() => { setShowToggleTour(false); markToggleTourSeen(); }}
          >
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
