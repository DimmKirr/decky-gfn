/**
 * Steam-free replica of the Gamepad UI app page (reference:
 * .scratch/screenshots/2026-08-30/*detroit*.png) used to visually tune the GFN
 * status line without a Deck. All content is DEMO data.
 */
import { FaPlay, FaGamepad, FaCog } from "react-icons/fa";
import { GfnStatusLine } from "../src/components/GfnStatusLine";

const DEMO_HERO = "https://img.nvidiagrid.net/apps/100884811/ZZ/HERO_IMAGE_01_ed961599-cfd6-48a0-9bc2-533a93203f9e.jpg";

const page: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  background: "#0e141b",
  color: "#dcdedf",
  fontFamily: '"Motiva Sans", "Segoe UI", sans-serif',
};

const iconBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  background: "#3d4450",
  borderRadius: 2,
  color: "#dcdedf",
  fontSize: 20,
};

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      style={{
        padding: "8px 18px",
        borderRadius: 20,
        background: active ? "#3d4450" : "transparent",
        color: active ? "#fff" : "#b8bcbf",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

export function AppPagePreview() {
  return (
    <div style={page}>
      {/* Hero with DEMO logo (real pages use a transparent logo PNG) */}
      <div
        style={{
          height: "47%",
          backgroundImage: `url(${DEMO_HERO})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 48,
            bottom: 40,
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "0.02em",
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}
        >
          COUNTER-STRIKE 2
        </div>
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 48px",
          background: "rgba(25, 30, 38, 0.96)",
        }}
      >
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 44px",
            background: "#59bf40",
            border: "none",
            borderRadius: 2,
            color: "#fff",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          <FaPlay /> Play
        </button>
        <div style={{ flex: 1 }} />
        <div style={iconBtn}><FaGamepad /></div>
        <div style={iconBtn}><FaCog /></div>
      </div>

      {/* GFN status divider — the component under test */}
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
        <div style={{ width: "90%" }}>
          <GfnStatusLine store="STEAM" />
        </div>
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "6px 0 18px" }}>
        <Tab label="Activity" active />
        <Tab label="Your Stuff" />
        <Tab label="Community" />
        <Tab label="Game Info" />
      </div>

      {/* Activity content (DEMO) */}
      <div style={{ padding: "0 48px" }}>
        <h3 style={{ margin: "6px 0 12px" }}>Activity</h3>
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            color: "#8b929a",
            fontStyle: "italic",
            fontSize: 15,
          }}
        >
          Say something about this game to your friends...
        </div>
      </div>
    </div>
  );
}
