import { describe, expect, it } from "vitest";
import { pickFlavor, resetFlavorSession } from "./flavor";

describe("flavor picker", () => {
  it("never repeats the same line twice in a row when another exists", () => {
    resetFlavorSession();
    const first = pickFlavor("manager", { name: "Cursed Short" }, () => 0);
    const second = pickFlavor("manager", { name: "Cursed Short" }, () => 0);
    expect(first).not.toBe(second);
  });

  it("spends a rare line only once per kind", () => {
    resetFlavorSession();
    const rare = pickFlavor("manager", { name: "Cursed Short" }, () => 0.78);
    expect(rare).toContain("intern");
    const later = pickFlavor("manager", { name: "Cursed Short" }, () => 0.78);
    expect(later).not.toContain("intern");
  });

  it("fills tokens and stays off the cringe lines", () => {
    resetFlavorSession();
    const line = pickFlavor("buy-bulk", { n: 12, name: "Cursed Short" }, () => 0);
    expect(line).toContain("12");
    expect(line.toLowerCase()).not.toContain("slop thickens");
    expect(line.toLowerCase()).not.toContain("look away");
  });

  it("banks Hype on prestige instead of a fake +Nx viral toast", () => {
    resetFlavorSession();
    const line = pickFlavor("prestige", { gain: "10.0", name: "TikTok" }, () => 0);
    expect(line).toContain("TikTok");
    expect(line).toContain("10.0");
    expect(line).toContain("Hype");
    expect(line).not.toMatch(/\+10\.0x/);
    expect(line.toLowerCase()).not.toContain("permanent +");
  });
});
