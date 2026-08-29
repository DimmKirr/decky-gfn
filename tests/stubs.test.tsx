import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ButtonItem, PanelSection } from "@decky/ui";
import { __setCallable, callable } from "../mock/stubs/decky-api";

describe("decky stubs", () => {
  it("renders @decky/ui stand-ins", async () => {
    let clicked = false;
    render(
      <PanelSection title="T">
        <ButtonItem onClick={() => (clicked = true)}>Go</ButtonItem>
      </PanelSection>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(clicked).toBe(true);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("routes callables through the registry", async () => {
    __setCallable("add", (a: number, b: number) => a + b);
    const add = callable<[number, number], number>("add");
    expect(await add(2, 3)).toBe(5);
  });
});
