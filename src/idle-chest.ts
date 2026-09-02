import {
  CHEST_MIN_MS,
  CHEST_RATE,
  IDLE_CHEST_BASE_MS,
  IDLE_CHEST_MAX_RANK,
  IDLE_CHEST_PER_RANK_MS,
  IDLE_CHEST_RATE_PER,
  IDLE_CHEST_UPGRADE_BASE,
  IDLE_CHEST_UPGRADE_MULT,
} from "./data";

export type IdleChestPreview = {
  rank: number;
  durationMs: number;
  rate: number;
  fillMs: number;
  fillPct: number;
  remainingMs: number;
  views: number;
  capped: boolean;
};

export function clampChestRank(raw: number): number {
  return Math.min(IDLE_CHEST_MAX_RANK, Math.max(0, Math.floor(Number(raw) || 0)));
}

export function idleChestDurationMs(rank = 0): number {
  return IDLE_CHEST_BASE_MS + IDLE_CHEST_PER_RANK_MS * clampChestRank(rank);
}

export function idleChestRate(rank = 0): number {
  return CHEST_RATE + IDLE_CHEST_RATE_PER * clampChestRank(rank);
}

export function chestUpgradeCost(rank: number): number {
  return Math.round(IDLE_CHEST_UPGRADE_BASE * IDLE_CHEST_UPGRADE_MULT ** clampChestRank(rank));
}

export function fillIdleChest(awayMs: number, rank: number, idleVps: number): IdleChestPreview {
  const safeRank = clampChestRank(rank);
  const durationMs = idleChestDurationMs(safeRank);
  const rate = idleChestRate(safeRank);
  const fillMs = Math.min(Math.max(0, awayMs), durationMs);
  const fillPct = durationMs > 0 ? fillMs / durationMs : 0;
  return {
    rank: safeRank,
    durationMs,
    rate,
    fillMs,
    fillPct,
    remainingMs: Math.max(0, durationMs - fillMs),
    views: Math.max(0, idleVps) * (fillMs / 1000) * rate,
    capped: awayMs >= durationMs && durationMs > 0,
  };
}

export function shouldOfferIdleChest(preview: IdleChestPreview): boolean {
  return preview.fillMs >= CHEST_MIN_MS && preview.views > 0;
}
