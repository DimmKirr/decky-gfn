import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { GfnAppOverlay } from "../../src/components/GfnAppOverlay";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";
import { __setParams } from "../../mock/stubs/decky-ui";

const INSTALLED = [
  { gameId: "u1", title: "Counter-Strike 2", appId: 4242, path: "/x.AppImage", cmsId: "1", store: "STEAM" },
];

/** Recreate the app page's structure: a vertical stack with a tab row. */
function makeFakeAppPage(): HTMLElement {
  const stack = document.createElement("div");
  const playBar = document.createElement("div");
  playBar.textContent = "Play";
  const tabRow = document.createElement("div");
  for (const label of ["Activity", "Your Stuff", "Community", "Game Info"]) {
    const tab = document.createElement("div");
    tab.textContent = label;
    tabRow.appendChild(tab);
  }
  stack.append(playBar, tabRow);
  document.body.appendChild(stack);
  return tabRow;
}

describe("GfnAppOverlay", () => {
  it("mounts in-flow directly above the tab row with badge, description, and store icon", async () => {
    const tabRow = makeFakeAppPage();
    __setParams({ appid: "4242" });
    const services = makeFakeServices({ listInstalled: vi.fn(async () => INSTALLED) });
    renderWithServices(<GfnAppOverlay />, services);

    const overlay = await screen.findByTestId("gfn-overlay");
    expect(overlay).toHaveTextContent(/GeForce NOW/);
    expect(screen.getByLabelText("Steam")).toBeInTheDocument();
    // In document flow as the tab row's previous sibling — scrolls with the page.
    // (Query fresh: the node is recreated when React re-parents it into the portal.)
    await waitFor(() =>
      expect(
        tabRow.previousElementSibling?.querySelector('[data-testid="gfn-overlay"]'),
      ).toBeTruthy(),
    );
  });

  it("renders nothing for apps not installed by the plugin", async () => {
    makeFakeAppPage();
    __setParams({ appid: "9999" });
    const services = makeFakeServices({ listInstalled: vi.fn(async () => INSTALLED) });
    renderWithServices(<GfnAppOverlay />, services);
    await waitFor(() => expect(services.listInstalled).toHaveBeenCalled());
    expect(screen.queryByTestId("gfn-overlay")).not.toBeInTheDocument();
  });
});
