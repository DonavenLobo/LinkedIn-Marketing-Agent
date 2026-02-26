import { useState } from "react";

const colors = {
  ink: "#1a1a1a",
  inkLight: "#4a4a4a",
  inkMuted: "#8a8a8a",
  surface: "#ffffff",
  surfaceSubtle: "#f7f7f5",
  surfaceMuted: "#eeeee9",
  border: "#e2e2dc",
  borderLight: "#efefea",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  accentLight: "#eff4ff",
  success: "#16a34a",
  successLight: "#f0fdf4",
  warning: "#d97706",
  warningLight: "#fffbeb",
};

const Section = ({ title, children, id }) => (
  <section id={id} className="mb-16">
    <h2
      style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontSize: "28px",
        fontWeight: 400,
        color: colors.ink,
        marginBottom: "8px",
        letterSpacing: "-0.02em",
      }}
    >
      {title}
    </h2>
    <div
      style={{
        width: "40px",
        height: "1.5px",
        background: colors.ink,
        marginBottom: "32px",
      }}
    />
    {children}
  </section>
);

const Swatch = ({ name, hex, large }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: large ? "12px" : "8px" }}>
    <div
      style={{
        width: large ? "48px" : "36px",
        height: large ? "48px" : "36px",
        borderRadius: "8px",
        background: hex,
        border: `1px solid ${hex === "#ffffff" ? colors.border : "transparent"}`,
        flexShrink: 0,
      }}
    />
    <div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          fontWeight: 500,
          color: colors.ink,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          color: colors.inkMuted,
        }}
      >
        {hex}
      </div>
    </div>
  </div>
);

const CodeBlock = ({ children, label }) => (
  <div style={{ marginBottom: "16px" }}>
    {label && (
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          color: colors.inkMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
    )}
    <pre
      style={{
        background: colors.surfaceSubtle,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: "8px",
        padding: "16px",
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px",
        lineHeight: 1.7,
        color: colors.inkLight,
        overflowX: "auto",
        margin: 0,
      }}
    >
      {children}
    </pre>
  </div>
);

const Note = ({ children }) => (
  <div
    style={{
      background: colors.accentLight,
      border: `1px solid ${colors.accent}20`,
      borderRadius: "8px",
      padding: "14px 16px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13px",
      lineHeight: 1.6,
      color: colors.inkLight,
      marginBottom: "20px",
    }}
  >
    {children}
  </div>
);

const SidebarPreview = () => {
  const [input, setInput] = useState("");
  return (
    <div
      style={{
        width: "320px",
        background: colors.surface,
        borderLeft: `1px solid ${colors.border}`,
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: colors.accent,
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: colors.ink,
              letterSpacing: "-0.01em",
            }}
          >
            LinkedIn Agent
          </span>
        </div>
        <span style={{ fontSize: "16px", color: colors.inkMuted, cursor: "pointer" }}>✕</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: colors.inkLight,
            marginBottom: "10px",
          }}
        >
          What's your post about?
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. AI is leveling the playing field for junior engineers..."
          style={{
            width: "100%",
            height: "80px",
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            padding: "12px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            lineHeight: 1.5,
            color: colors.ink,
            background: colors.surface,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          style={{
            marginTop: "12px",
            width: "100%",
            padding: "10px 0",
            background: colors.ink,
            color: colors.surface,
            border: "none",
            borderRadius: "8px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          Generate Post
        </button>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "14px" }}>
          {["Recent win", "Industry insight", "Lesson learned"].map((tag) => (
            <span
              key={tag}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: `1px solid ${colors.border}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                color: colors.inkLight,
                cursor: "pointer",
                background: colors.surface,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const PostPreview = () => (
  <div
    style={{
      background: colors.surface,
      border: `1px solid ${colors.borderLight}`,
      borderRadius: "10px",
      padding: "20px",
      maxWidth: "480px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: colors.surfaceMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          fontWeight: 600,
          color: colors.inkLight,
        }}
      >
        Y
      </div>
      <div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            color: colors.ink,
          }}
        >
          You
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: colors.inkMuted,
          }}
        >
          Just now
        </div>
      </div>
    </div>
    <p
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "13.5px",
        lineHeight: 1.65,
        color: colors.inkLight,
        margin: 0,
      }}
    >
      Being entry level right now is actually pretty good timing.
      <br />
      <br />
      I'm an entry level ML engineer building agentic systems. The developers around me have 10, 15, 20 years of experience. And when it comes to this stuff, we're figuring it out at roughly the same pace.
    </p>
    <div
      style={{
        display: "flex",
        gap: "16px",
        marginTop: "16px",
        paddingTop: "12px",
        borderTop: `1px solid ${colors.borderLight}`,
      }}
    >
      {["Copy", "Edit", "Post"].map((action) => (
        <button
          key={action}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: action === "Post" ? "none" : `1px solid ${colors.border}`,
            background: action === "Post" ? colors.ink : colors.surface,
            color: action === "Post" ? colors.surface : colors.inkLight,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {action}
        </button>
      ))}
    </div>
  </div>
);

const LandingHero = () => (
  <div
    style={{
      background: colors.surface,
      borderRadius: "12px",
      border: `1px solid ${colors.borderLight}`,
      padding: "48px 32px",
      textAlign: "center",
      maxWidth: "520px",
      margin: "0 auto",
    }}
  >
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "11px",
        fontWeight: 500,
        color: colors.accent,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "16px",
      }}
    >
      AI-Powered LinkedIn Content
    </div>
    <h1
      style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontSize: "36px",
        fontWeight: 400,
        color: colors.ink,
        lineHeight: 1.2,
        letterSpacing: "-0.03em",
        margin: "0 0 16px 0",
      }}
    >
      Write LinkedIn posts
      <br />
      <span style={{ color: colors.accent }}>in your voice</span>
    </h1>
    <p
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "15px",
        lineHeight: 1.6,
        color: colors.inkMuted,
        maxWidth: "380px",
        margin: "0 auto 28px auto",
      }}
    >
      Our AI learns your unique writing style, then generates authentic posts that sound like you.
    </p>
    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
      <button
        style={{
          padding: "11px 24px",
          background: colors.ink,
          color: colors.surface,
          border: "none",
          borderRadius: "8px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          letterSpacing: "-0.01em",
        }}
      >
        Get Started Free
      </button>
      <button
        style={{
          padding: "11px 24px",
          background: colors.surface,
          color: colors.ink,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Sign In
      </button>
    </div>
  </div>
);

export default function StyleGuide() {
  const [activeSection, setActiveSection] = useState("overview");

  const nav = [
    { id: "overview", label: "Overview" },
    { id: "colors", label: "Colors" },
    { id: "typography", label: "Typography" },
    { id: "components", label: "Components" },
    { id: "landing", label: "Landing Page" },
    { id: "create", label: "Create Post" },
    { id: "sidebar", label: "Sidebar Plugin" },
    { id: "tokens", label: "CSS Tokens" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.surfaceSubtle }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      {/* Side nav */}
      <nav
        style={{
          width: "200px",
          padding: "32px 24px",
          borderRight: `1px solid ${colors.borderLight}`,
          background: colors.surface,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            color: colors.ink,
            letterSpacing: "-0.01em",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: colors.ink,
            }}
          />
          Style Guide
        </div>
        {nav.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveSection(id);
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "block",
              padding: "7px 12px",
              marginBottom: "2px",
              borderRadius: "6px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: activeSection === id ? colors.ink : colors.inkMuted,
              fontWeight: activeSection === id ? 500 : 400,
              background: activeSection === id ? colors.surfaceSubtle : "transparent",
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "48px 56px",
          maxWidth: "780px",
        }}
      >
        {/* Overview */}
        <Section title="Design Direction" id="overview">
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              lineHeight: 1.7,
              color: colors.inkLight,
              marginBottom: "20px",
            }}
          >
            Your LinkedIn Agent should feel like a calm, sharp writing tool — not a noisy AI product. The design philosophy is <strong>warm minimalism</strong>: generous whitespace, restrained color, purposeful typography. Think Notion meets a well-edited journal.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            {[
              { label: "Quiet confidence", desc: "Let the content speak. No flashy gradients or animations." },
              { label: "One action per view", desc: "Each screen has one clear purpose. Reduce cognitive load." },
              { label: "Warm neutrals", desc: "Off-whites and soft grays feel approachable, not sterile." },
              { label: "Ink over color", desc: "Dark text on light surfaces. Accent color used sparingly." },
            ].map(({ label, desc }) => (
              <div
                key={label}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: colors.ink,
                    marginBottom: "4px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    color: colors.inkMuted,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
          <Note>
            <strong>Key change from current design:</strong> Replace the blue/purple Generate Post button with a dark ink button. Drop the heavy blue from the landing hero. Use accent blue only for links, tags, and micro-highlights — never as a primary CTA background.
          </Note>
        </Section>

        {/* Colors */}
        <Section title="Color Palette" id="colors">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, color: colors.inkLight, marginBottom: "20px" }}>
            A warm neutral base with a single blue accent. The palette is intentionally restrained — your user's content should be the most colorful thing on screen.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Ink
              </div>
              <Swatch name="Ink" hex="#1a1a1a" large />
              <Swatch name="Ink Light" hex="#4a4a4a" />
              <Swatch name="Ink Muted" hex="#8a8a8a" />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Surface
              </div>
              <Swatch name="White" hex="#ffffff" large />
              <Swatch name="Subtle" hex="#f7f7f5" />
              <Swatch name="Muted" hex="#eeeee9" />
              <Swatch name="Border" hex="#e2e2dc" />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Accent
              </div>
              <Swatch name="Blue" hex="#2563eb" large />
              <Swatch name="Blue Hover" hex="#1d4ed8" />
              <Swatch name="Blue Light" hex="#eff4ff" />
              <Swatch name="Success" hex="#16a34a" />
            </div>
          </div>
          <Note>
            The warm off-white tones (#f7f7f5, #eeeee9) avoid the clinical feel of pure grays. These give the app a "paper" quality that suits a writing tool.
          </Note>
        </Section>

        {/* Typography */}
        <Section title="Typography" id="typography">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "24px" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
                Display — Instrument Serif
              </div>
              <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "40px", color: colors.ink, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "12px" }}>
                Aa Bb Cc
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", color: colors.inkMuted, lineHeight: 1.5 }}>
                Used for hero headlines and section titles only. Gives warmth and editorial weight without feeling corporate. Always regular weight (400).
              </p>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
                Body — DM Sans
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "28px", color: colors.ink, lineHeight: 1.2, marginBottom: "12px" }}>
                Aa Bb Cc
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", color: colors.inkMuted, lineHeight: 1.5 }}>
                Used for all body text, labels, buttons, UI elements. Clean geometric sans-serif. Weights 400 (body), 500 (labels/buttons), 600 (headings).
              </p>
            </div>
          </div>

          <div style={{ background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: "10px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
              Type Scale
            </div>
            {[
              { size: "36px", weight: 400, font: "Instrument Serif", label: "Hero headline", tracking: "-0.03em" },
              { size: "28px", weight: 400, font: "Instrument Serif", label: "Page title", tracking: "-0.02em" },
              { size: "18px", weight: 600, font: "DM Sans", label: "Section heading", tracking: "-0.01em" },
              { size: "15px", weight: 400, font: "DM Sans", label: "Body", tracking: "0" },
              { size: "13px", weight: 500, font: "DM Sans", label: "UI label / Button", tracking: "-0.01em" },
              { size: "11px", weight: 500, font: "DM Mono", label: "Caption / Tag", tracking: "0.02em" },
            ].map(({ size, weight, font, label, tracking }) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "12px" }}>
                <span
                  style={{
                    fontFamily: `'${font}', sans-serif`,
                    fontSize: size,
                    fontWeight: weight,
                    color: colors.ink,
                    letterSpacing: tracking,
                    minWidth: "200px",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    color: colors.inkMuted,
                  }}
                >
                  {size} / {weight} / {tracking}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Components */}
        <Section title="Core Components" id="components">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, color: colors.inkLight, marginBottom: "24px" }}>
            All components use 8px border-radius, 1px borders, and subtle shadows. No heavy drop shadows or glows.
          </p>

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Buttons
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
            <button style={{ padding: "10px 20px", background: colors.ink, color: colors.surface, border: "none", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Primary Action
            </button>
            <button style={{ padding: "10px 20px", background: colors.surface, color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Secondary
            </button>
            <button style={{ padding: "10px 20px", background: "transparent", color: colors.inkLight, border: "none", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Text Link
            </button>
          </div>

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Input
          </div>
          <textarea
            readOnly
            value="e.g. AI is leveling the playing field for junior engineers..."
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "80px",
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              padding: "12px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              lineHeight: 1.5,
              color: colors.inkMuted,
              background: colors.surface,
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "24px",
              display: "block",
            }}
          />

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Quick Idea Tags
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
            {["Share a recent win", "Industry insight", "Lesson learned", "Team shoutout", "Hot take"].map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${colors.border}`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: colors.inkLight,
                  cursor: "pointer",
                  background: colors.surface,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Navigation Bar
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 24px",
              background: colors.surface,
              border: `1px solid ${colors.borderLight}`,
              borderRadius: "10px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.ink }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
                LinkedIn Agent
              </span>
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: colors.ink, fontWeight: 500, cursor: "pointer" }}>Create Post</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: colors.inkMuted, cursor: "pointer" }}>Settings</span>
            </div>
          </div>
        </Section>

        {/* Landing Page */}
        <Section title="Landing Page — Redesigned" id="landing">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, color: colors.inkLight, marginBottom: "24px" }}>
            The hero section should be simple and editorial. Instrument Serif for the headline gives it warmth. The CTA is dark ink, not blue — this keeps the page calm and professional.
          </p>
          <LandingHero />
          <div style={{ marginTop: "24px" }}>
            <Note>
              <strong>Changes from current:</strong> Replaced the heavy blue "Get Started Free" button with dark ink. Swapped the generic sans-serif headline for Instrument Serif. Added a monospaced category tag. Tightened the subhead copy. Overall: fewer colors, more whitespace, more trust.
            </Note>
          </div>
        </Section>

        {/* Create Post Page */}
        <Section title="Create Post Page — Redesigned" id="create">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, color: colors.inkLight, marginBottom: "24px" }}>
            The post creation page is the core product screen. It should feel like a clean writing environment — a single textarea, one button, and quick-idea prompts below.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Input Side
              </div>
              <div style={{ background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: "10px", padding: "24px" }}>
                <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "24px", fontWeight: 400, color: colors.ink, margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
                  Create a Post
                </h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: colors.inkMuted, margin: "0 0 16px 0" }}>
                  Enter a topic and I'll write it in your voice.
                </p>
                <textarea
                  readOnly
                  placeholder="What's on your mind?"
                  style={{ width: "100%", height: "70px", border: `1px solid ${colors.border}`, borderRadius: "8px", padding: "12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: colors.inkMuted, background: colors.surface, resize: "none", outline: "none", boxSizing: "border-box" }}
                />
                <button style={{ marginTop: "12px", padding: "10px 20px", background: colors.ink, color: colors.surface, border: "none", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                  Generate Post
                </button>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "14px" }}>
                  {["Recent win", "Insight", "Lesson"].map((t) => (
                    <span key={t} style={{ padding: "5px 10px", borderRadius: "6px", border: `1px solid ${colors.border}`, fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: colors.inkLight }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Preview Side
              </div>
              <PostPreview />
            </div>
          </div>
        </Section>

        {/* Sidebar */}
        <Section title="Sidebar Plugin — Redesigned" id="sidebar">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, color: colors.inkLight, marginBottom: "24px" }}>
            The Chrome sidebar should be 320px wide with tight spacing. It should feel native to the browser — no heavy branding, just a small dot + name in the header. Everything the user needs in one scroll-free view.
          </p>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            <SidebarPreview />
            <div style={{ flex: 1 }}>
              <Note>
                <strong>Sidebar design rules:</strong>
              </Note>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.7, color: colors.inkLight }}>
                <p style={{ marginBottom: "10px" }}>
                  <strong>Width:</strong> Fixed 320px. Chrome side panels have a minimum width constraint — don't fight it, design within it.
                </p>
                <p style={{ marginBottom: "10px" }}>
                  <strong>Header:</strong> Minimal — dot logo + app name + close button. No tabs, no navigation. The sidebar does one thing.
                </p>
                <p style={{ marginBottom: "10px" }}>
                  <strong>Input area:</strong> Compact textarea (80px height) with placeholder text. Below it, a full-width dark generate button.
                </p>
                <p style={{ marginBottom: "10px" }}>
                  <strong>Quick tags:</strong> Small pill buttons below the CTA for rapid topic selection.
                </p>
                <p style={{ marginBottom: "10px" }}>
                  <strong>Output:</strong> When a post is generated, it replaces or appears below the input area in a LinkedIn-style card preview with Copy / Edit / Post actions.
                </p>
                <p>
                  <strong>Collapse behavior:</strong> Slides in/out from right edge. No transition longer than 200ms. A small tab or icon remains visible when collapsed.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* CSS Tokens */}
        <Section title="CSS Design Tokens" id="tokens">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, color: colors.inkLight, marginBottom: "20px" }}>
            Copy these CSS custom properties into your project's root stylesheet to implement the design system consistently across all surfaces.
          </p>
          <CodeBlock label="colors + surfaces">
{`:root {
  /* Ink (text) */
  --ink: #1a1a1a;
  --ink-light: #4a4a4a;
  --ink-muted: #8a8a8a;

  /* Surfaces */
  --surface: #ffffff;
  --surface-subtle: #f7f7f5;
  --surface-muted: #eeeee9;

  /* Borders */
  --border: #e2e2dc;
  --border-light: #efefea;

  /* Accent */
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: #eff4ff;

  /* Semantic */
  --success: #16a34a;
  --success-light: #f0fdf4;
  --warning: #d97706;
  --warning-light: #fffbeb;
}`}
          </CodeBlock>
          <CodeBlock label="typography">
{`:root {
  /* Font families */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'DM Mono', 'SF Mono', monospace;

  /* Font sizes */
  --text-hero: 36px;
  --text-title: 28px;
  --text-heading: 18px;
  --text-body: 15px;
  --text-ui: 13px;
  --text-caption: 11px;

  /* Line heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Letter spacing */
  --tracking-tight: -0.03em;
  --tracking-normal: -0.01em;
  --tracking-wide: 0.05em;
}`}
          </CodeBlock>
          <CodeBlock label="spacing + radii + shadows">
{`:root {
  /* Spacing (8px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.08);

  /* Transitions */
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-fast: 150ms;
  --duration-normal: 200ms;
}`}
          </CodeBlock>
          <CodeBlock label="google fonts import">
{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@300;400;500&display=swap');`}
          </CodeBlock>
        </Section>
      </main>
    </div>
  );
}
