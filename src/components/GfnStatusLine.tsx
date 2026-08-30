import { StoreIcon, storeLabel } from "./stores";

const ruleStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "rgba(255, 255, 255, 0.12)",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#b8bcbf",
};

/** Native-style status divider ("STEAM CLOUD: UP TO DATE") in GFN colors. */
export function GfnStatusLine({ store }: { store: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
      <div style={ruleStyle} />
      <div style={labelStyle}>
        <span
          style={{
            padding: "1px 6px", borderRadius: 3, background: "#76b900",
            color: "#0e141b", fontWeight: 700, fontSize: 11, letterSpacing: 0,
          }}
        >
          GFN
        </span>
        <span>GeForce NOW: ready to stream</span>
        <span
          style={{
            display: "flex", alignItems: "center", gap: 5,
            opacity: 0.6, textTransform: "none", letterSpacing: 0,
          }}
        >
          <StoreIcon store={store} /> {storeLabel(store)} copy · no download
        </span>
      </div>
      <div style={ruleStyle} />
    </div>
  );
}
