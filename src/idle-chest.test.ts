import { describe, expect, it } from "vitest";
import {
  CHEST_MIN_MS,
  CHEST_RATE,
  IDLE_CHEST_BASE_MS,
  IDLE_CHEST_MAX_RANK,
  IDLE_CHEST_PER_RANK_MS,
  IDLE_CHEST_RATE_PER,
} from "./data";
import {
  chestUpgradeCost,
  clampChestRank,
  fillIdleChest,
  idleChestDurationMs,
  idleChestRate,
  shouldOfferIdleChest,
} from "./idle-chest";

describe("idle chest ranks", () => {
  it("starts at 4h and 25% of manager VPS", () => {
    expect(idleChestDurationMs(0)).toBe(IDLE_CHEST_BASE_MS);
    expect(idleChestRate(0)).toBe(CHEST_RATE);
    const preview = fillIdleChest(2 * 60 * 60 * 1000, 0, 100);
    expect(preview.views).toBeCloseTo(100 * 2 * 60 * 60 * CHEST_RATE);
    expect(preview.capped).toBe(false);
  });

  it("grows duration and rate per rank, then clamps", () => {
    expect(idleChestDurationMs(1)).toBe(IDLE_CHEST_BASE_MS + IDLE_CHEST_PER_RANK_MS);
    expect(idleChestRate(2)).toBeCloseTo(CHEST_RATE + IDLE_CHEST_RATE_PER * 2);
    expect(clampChestRank(99)).toBe(IDLE_CHEST_MAX_RANK);
    expect(idleChestDurationMs(99)).toBe(IDLE_CHEST_BASE_MS + IDLE_CHEST_PER_RANK_MS * IDLE_CHEST_MAX_RANK);
  });

  it("caps fill at the current duration and ignores short away time", () => {
    const long = fillIdleChest(24 * 60 * 60 * 1000, 0, 10);
    expect(long.fillMs).toBe(IDLE_CHEST_BASE_MS);
    expect(long.capped).toBe(true);
    expect(shouldOfferIdleChest(fillIdleChest(CHEST_MIN_MS - 1, 0, 1000))).toBe(false);
    expect(shouldOfferIdleChest(fillIdleChest(CHEST_MIN_MS, 0, 1000))).toBe(true);
    expect(chestUpgradeCost(0)).toBe(200);
    expect(chestUpgradeCost(1)).toBe(800);
  });
});
