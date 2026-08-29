import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QamPanel } from "../../src/components/QamPanel";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";

describe("QamPanel", () => {
  it("opens the catalog page", async () => {
    const services = makeFakeServices();
    renderWithServices(<QamPanel />, services);
    await userEvent.click(screen.getByRole("button", { name: /browse catalog/i }));
    expect(services.openCatalog).toHaveBeenCalled();
  });

  it("lists installed games and navigates to them", async () => {
    const services = makeFakeServices({
      listInstalled: vi.fn(async () => [
        { gameId: "u1", title: "CS2", appId: 7, path: "/x", cmsId: "1", store: "STEAM" },
      ]),
    });
    renderWithServices(<QamPanel />, services);
    const item = await screen.findByRole("button", { name: /CS2/ });
    await userEvent.click(item);
    expect(services.navigateToApp).toHaveBeenCalledWith(7);
  });
});
