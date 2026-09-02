import { describe, expect, it } from "vitest";
import { formatCycle, formatNum, formatTime } from "./format";

describe("formatNum", () => {
  it("keeps small numbers readable", () => {
    expect(formatNum(0)).toBe("0");
    expect(formatNum(7.4)).toBe("7.4");
    expect(formatNum(999)).toBe("999");
  });

  it("uses short suffixes", () => {
    expect(formatNum(1_200)).toBe("1.2K");
    expect(formatNum(1_000_000)).toBe("1M");
    expect(formatNum(2.5e9)).toBe("2.5B");
  });
});

describe("formatTime", () => {
  it("formats idle popups", () => {
    expect(formatTime(45_000)).toBe("45s");
    expect(formatTime(125_000)).toBe("2m 5s");
    expect(formatTime(3_600_000)).toBe("1h 0m");
  });
});

describe("formatCycle", () => {
  it("keeps rank times readable", () => {
    expect(formatCycle(0.6)).toBe("0.60s");
    expect(formatCycle(0.45)).toBe("0.45s");
    expect(formatCycle(24)).toBe("24s");
  });
});
