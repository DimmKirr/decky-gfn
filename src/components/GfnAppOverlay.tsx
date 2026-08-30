import { useParams } from "@decky/ui";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useServices } from "../services";
import { GfnStatusLine } from "./GfnStatusLine";
import type { InstalledGame } from "../core/types";

/**
 * Find the app page's tab row (Activity / Your Stuff / Community / Game Info)
 * and climb to the child of the nearest vertically-stacking ancestor — the
 * element to insert our line before, structurally (no hashed class names).
 */
function findTabRowSlot(): { parent: HTMLElement; before: HTMLElement } | null {
  const divs = [...document.querySelectorAll("div")].filter((d) => {
    const t = d.textContent ?? "";
    return t.includes("Activity") && t.includes("Game Info") && t.length < 120;
  });
  let node = divs[divs.length - 1] as HTMLElement | undefined;
  if (!node) return null;
  while (node.parentElement) {
    const style = getComputedStyle(node.parentElement);
    const vertical =
      node.parentElement.children.length > 1 &&
      (style.display !== "flex" || style.flexDirection === "column");
    if (vertical) break;
    node = node.parentElement;
  }
  return node.parentElement ? { parent: node.parentElement, before: node } : null;
}

// Fallback when no tab row is found: the gap between action bar and tabs.
const fixedStyle: React.CSSProperties = {
  position: "fixed",
  top: "52%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 7000,
  width: "90%",
  pointerEvents: "none",
};

export function GfnAppOverlay() {
  const { appid } = useParams<{ appid: string }>();
  const services = useServices();
  const [entry, setEntry] = useState<InstalledGame | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.listInstalled().then((list) => {
      if (cancelled) return;
      setEntry(list.find((g) => String(g.appId) === appid) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [services, appid]);

  useEffect(() => {
    if (!entry) return;
    const container = document.createElement("div");
    container.style.cssText = "width:92%;margin:4px auto 10px;";
    let tries = 0;
    const tryMount = () => {
      const slot = findTabRowSlot();
      if (slot) {
        slot.parent.insertBefore(container, slot.before);
        setAnchor(container);
        return true;
      }
      return false;
    };
    if (!tryMount()) {
      // The page tree renders asynchronously — retry briefly before falling back.
      const timer = setInterval(() => {
        if (tryMount() || ++tries > 20) clearInterval(timer);
      }, 250);
      return () => {
        clearInterval(timer);
        container.remove();
        setAnchor(null);
      };
    }
    return () => {
      container.remove();
      setAnchor(null);
    };
  }, [entry]);

  if (!entry) return null;

  const line = (
    <div data-testid="gfn-overlay" style={{ width: "100%" }}>
      <GfnStatusLine store={entry.store} />
    </div>
  );

  if (anchor) return createPortal(line, anchor);
  return <div style={fixedStyle}>{line}</div>;
}
