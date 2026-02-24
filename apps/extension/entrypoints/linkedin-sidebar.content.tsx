import ReactDOM from "react-dom/client";
import { SidebarApp } from "../components/sidebar/SidebarApp";
import sidebarCss from "../assets/sidebar.css?inline";

export default defineContentScript({
  matches: ["https://www.linkedin.com/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "linkedin-agent-sidebar",
      position: "overlay",
      zIndex: 2147483647,
      onMount: (container, shadow) => {
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

  return (
    <>
      <button
        className={`sidebar-toggle ${collapsed ? "collapsed" : ""}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? "◀" : "▶"}
      </button>
      <div className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
        <SidebarApp />
      </div>
    </>
  );
}

// Need this import for the useState in SidebarRoot
import { useState } from "react";
