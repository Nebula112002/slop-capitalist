export type PlanetId = "youtube" | "tiktok" | "simulation";

export type BusinessDef = {
  id: string;
  name: string;
  blurb: string;
  icon: string;
  baseCost: number;
  costMult: number;
  cycleSec: number;
  income: number;
  managerCost: number;
  managerName: string;
};

export type PlanetDef = {
  id: PlanetId;
  name: string;
  tag: string;
  unlock: string;
};

export type RewardKind = "views" | "mult" | "title";

export type HypeShopId = "viral" | "tempo" | "managers" | "offline" | "starter";

export type ShopLevels = Record<HypeShopId, number>;

export type HypeShopItem = {
  id: HypeShopId;
  name: string;
  blurb: string;
  max: number;
  baseCost: number;
  costMult: number;
};

export type EventDef = {
  id: string;
  name: string;
  blurb: string;
  bonusMult: number;
  extraName: string;
  extraIncome: number;
  extraCycleSec: number;
  dropViews: number;
};

export type EventShopItem = {
  id: string;
  clout: number;
  name: string;
  kind: RewardKind;
  amount?: number;
  title?: string;
};

export type PassTier = {
  id: string;
  at: number;
  name: string;
  kind: RewardKind;
  amount?: number;
  title?: string;
};

export const PLANET_IDS: PlanetId[] = ["youtube", "tiktok", "simulation"];

/**
 * The ids are frozen: they are written into every save as `state.planet` and
 * used as the keys of `state.businesses`. Renaming one wipes people. Player
 * facing names live in `name` and are safe to change.
 *
 * The names are deliberately generic. This is a parody of algorithmic video
 * platforms, not a licensed product, so no real platform's trademark ships in
 * the build. See docs/LEGAL-NOTES.md.
 */
export const PLANETS: PlanetDef[] = [
  {
    id: "youtube",
    name: "The Tube",
    tag: "Planet 1",
    unlock: "Start here. One cursed short.",
  },
  {
    id: "tiktok",
    name: "The Feed",
    tag: "Planet 2",
    unlock: "Prestige once to unlock vertical video.",
  },
  {
    id: "simulation",
    name: "The Simulation",
    tag: "Planet 3",
    unlock: "Prestige twice. The agents hire you.",
  },
];

export const BUSINESSES: Record<PlanetId, BusinessDef[]> = {
  youtube: [
    {
      id: "cursed-short",
      name: "Cursed Short",
      blurb: "One weird clip. No context. You already own the first one.",
      icon: "📱",
      baseCost: 4,
      costMult: 1.07,
      cycleSec: 0.6,
      income: 1,
      managerCost: 1_000,
      managerName: "Hire a thumbnail gremlin",
    },
    {
      id: "faceless-listicle",
      name: "Faceless Listicle",
      blurb: "Top 7 things that will ruin your sleep. Stock footage.",
      icon: "📝",
      baseCost: 60,
      costMult: 1.15,
      cycleSec: 3,
      income: 60,
      managerCost: 15_000,
      managerName: "Hire a script intern",
    },
    {
      id: "ai-essay",
      name: "AI Voiceover Essay",
      blurb: "A calm man explains Rome falling, forever.",
      icon: "🎙️",
      baseCost: 720,
      costMult: 1.15,
      cycleSec: 6,
      income: 540,
      managerCost: 100_000,
      managerName: "Hire a voice model",
    },
    {
      id: "reaction-farm",
      name: "Reaction Farm",
      blurb: "Watch someone watch someone watch a clip.",
      icon: "😱",
      baseCost: 8_640,
      costMult: 1.15,
      cycleSec: 12,
      income: 4_320,
      managerCost: 500_000,
      managerName: "Hire a gasp editor",
    },
    {
      id: "agent-swarm",
      name: "Agent Swarm",
      blurb: "Fifty bots posting while you sleep. You are the pipeline.",
      icon: "🤖",
      baseCost: 103_680,
      costMult: 1.15,
      cycleSec: 24,
      income: 51_840,
      managerCost: 2_500_000,
      managerName: "Hire a swarm wrangler",
    },
  ],
  tiktok: [
    {
      id: "repost-page",
      name: "Repost Page",
      blurb: "Other people's clips. Your watermark.",
      icon: "🔁",
      baseCost: 1_000_000,
      costMult: 1.15,
      cycleSec: 1,
      income: 200_000,
      managerCost: 50_000_000,
      managerName: "Hire a stitch intern",
    },
    {
      id: "duet-chain",
      name: "Mirror Chain",
      blurb: "React, then react to the reaction. Infinite hallway.",
      icon: "🎭",
      baseCost: 15_000_000,
      costMult: 1.15,
      cycleSec: 3,
      income: 3_000_000,
      managerCost: 200_000_000,
      managerName: "Hire a duet coach",
    },
    {
      id: "shop-live",
      name: "Shop Live",
      blurb: "Sell a blender at 2am. The comments buy it.",
      icon: "🛒",
      baseCost: 180_000_000,
      costMult: 1.15,
      cycleSec: 6,
      income: 25_000_000,
      managerCost: 1_000_000_000,
      managerName: "Hire a live closer",
    },
    {
      id: "brainrot-hour",
      name: "Brainrot Hour",
      blurb: "A sound. A face. A number. That is the show.",
      icon: "🧠",
      baseCost: 2_200_000_000,
      costMult: 1.15,
      cycleSec: 12,
      income: 200_000_000,
      managerCost: 8_000_000_000,
      managerName: "Hire a sound designer",
    },
    {
      id: "fyp",
      name: "You Are The Feed",
      blurb: "The page is you. The you is the page.",
      icon: "✨",
      baseCost: 26_000_000_000,
      costMult: 1.15,
      cycleSec: 24,
      income: 2_000_000_000,
      managerCost: 50_000_000_000,
      managerName: "Hire the algorithm",
    },
  ],
  simulation: [
    {
      id: "prompt-farm",
      name: "Prompt Farm",
      blurb: "A thousand agents ask the same model for a thumbnail.",
      icon: "⌨️",
      baseCost: 1_000_000_000_000,
      costMult: 1.15,
      cycleSec: 1,
      income: 200_000_000_000,
      managerCost: 50_000_000_000_000,
      managerName: "Hire a prompt intern",
    },
    {
      id: "synth-face",
      name: "Synth Influencer",
      blurb: "No body. Just a face that never blinks on time.",
      icon: "🪞",
      baseCost: 15_000_000_000_000,
      costMult: 1.15,
      cycleSec: 3,
      income: 3_000_000_000_000,
      managerCost: 200_000_000_000_000,
      managerName: "Hire a face rigger",
    },
    {
      id: "fake-pod",
      name: "Fake Podcast",
      blurb: "Two voices. Zero guests. Infinite agreement.",
      icon: "🎧",
      baseCost: 180_000_000_000_000,
      costMult: 1.15,
      cycleSec: 6,
      income: 25_000_000_000_000,
      managerCost: 1_000_000_000_000_000,
      managerName: "Hire a laugh track",
    },
    {
      id: "agent-farm",
      name: "Agent Farm",
      blurb: "They post. They reply. They hire each other.",
      icon: "🏭",
      baseCost: 2_200_000_000_000_000,
      costMult: 1.15,
      cycleSec: 12,
      income: 200_000_000_000_000,
      managerCost: 8_000_000_000_000_000,
      managerName: "Hire a wrangler-of-wranglers",
    },
    {
      id: "the-simulation",
      name: "The Simulation",
      blurb: "You are the content. The content is a loop.",
      icon: "🌀",
      baseCost: 26_000_000_000_000_000,
      costMult: 1.15,
      cycleSec: 24,
      income: 2_000_000_000_000_000,
      managerCost: 50_000_000_000_000_000,
      managerName: "Hire the warden",
    },
  ],
};

export const EVENTS: EventDef[] = [
  {
    id: "thumbnail-friday",
    name: "Thumbnail Friday",
    blurb: "Red arrows. Open mouths. The farm gets louder.",
    bonusMult: 1.5,
    extraName: "Ragebait Thumb",
    extraIncome: 40,
    extraCycleSec: 2,
    dropViews: 2_500,
  },
  {
    id: "duet-storm",
    name: "Mirror Storm",
    blurb: "Everyone is reacting to everyone. Including the bots.",
    bonusMult: 1.75,
    extraName: "Mirror Loop",
    extraIncome: 80,
    extraCycleSec: 3,
    dropViews: 8_000,
  },
  {
    id: "agent-night",
    name: "Agent Night",
    blurb: "The intern army does not sleep. Neither does the queue.",
    bonusMult: 2,
    extraName: "Night Batch",
    extraIncome: 120,
    extraCycleSec: 2,
    dropViews: 25_000,
  },
];

export const EVENT_SHOP: EventShopItem[] = [
  { id: "sticker", clout: 5, name: "Trend Sticker", kind: "title", title: "Trend Touched" },
  { id: "nudge", clout: 40, name: "Algo Nudge", kind: "views", amount: 5_000 },
  { id: "banner", clout: 150, name: "Drop Banner", kind: "title", title: "Drop Regular" },
];

export const PASS_TIERS: PassTier[] = [
  { id: "intern", at: 10_000, name: "Intern Badge", kind: "title", title: "Thumbnail Intern" },
  { id: "gremlin", at: 100_000, name: "Gremlin Snack", kind: "views", amount: 2_000 },
  { id: "scheduler", at: 1_000_000, name: "Scheduler Pip", kind: "mult", amount: 0.05 },
  { id: "fyp", at: 10_000_000, name: "Feed Stamp", kind: "title", title: "Feed Farmer" },
  { id: "swarm", at: 100_000_000, name: "Swarm Bonus", kind: "views", amount: 2_000_000 },
  { id: "sim", at: 1_000_000_000, name: "Sim Resident", kind: "mult", amount: 0.1 },
  { id: "infinity", at: 10_000_000_000, name: "Infinity Intern", kind: "title", title: "Infinity Intern" },
];

export const MILESTONES = [
  25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

export const SPEED_MARKS = [25, 100, 400, 1000];
export const SPEED_CUT = 0.5;
export const PRESTIGE_AT = 1_000_000;
export const PRESTIGE_TIKTOK_AT = 1_000_000_000;
export const PRESTIGE_SIM_AT = 1_000_000_000_000_000;
export const PRESTIGE_LATE_SCALE = 100;
export const PRESTIGE_SCALE = 10;
export const HYPE_BASE = 10;
export const HYPE_LOG = 10;
export const HYPE_DAMP = 0.5;
export const SHOP_VIRAL_PER = 0.1;
export const SHOP_TEMPO_CUT = 0.95;
export const SHOP_MGR_CUT = 0.92;
export const SHOP_OFFLINE_MS = 2 * 60 * 60 * 1000;
export const SHOP_STARTER_EACH = 2;
export const ALGO_PRESTIGE_AT = 5;
export const MIN_CYCLE_SEC = 0.25;

export const HYPE_SHOP: HypeShopItem[] = [
  {
    id: "viral",
    name: "Go Viral",
    blurb: "+10% views per second per rank. The only global multiplier prestige still sells.",
    max: 20,
    baseCost: 5,
    costMult: 1.6,
  },
  {
    id: "tempo",
    name: "Shorter Bars",
    blurb: "Cycles 5% faster per rank. Floor is still 0.25s.",
    max: 10,
    baseCost: 8,
    costMult: 1.7,
  },
  {
    id: "managers",
    name: "Cheap Interns",
    blurb: "Managers 8% cheaper per rank.",
    max: 8,
    baseCost: 6,
    costMult: 1.65,
  },
  {
    id: "offline",
    name: "Night Shift",
    blurb: "+2 hours offline cap per rank, 8h up to 24h at max.",
    max: 8,
    baseCost: 12,
    costMult: 2,
  },
  {
    id: "starter",
    name: "Always On",
    blurb: "+2 starter copies on every farm after each prestige.",
    max: 5,
    baseCost: 15,
    costMult: 2,
  },
];

export function emptyShop(): ShopLevels {
  return { viral: 0, tempo: 0, managers: 0, offline: 0, starter: 0 };
}
export const NUDGE_PROGRESS = 0.15;
export const NUDGE_PER_CYCLE = 4;
export const NUDGE_COOLDOWN_MS = 200;
export const EVENT_PERIOD_MS = 8 * 60 * 60 * 1000;
export const CLOUT_PER_VIEWS = 10_000;
export const ALGO_AT = 3;
export const CHEST_MIN_MS = 60_000;
export const CHEST_RATE = 0.25;
export const IDLE_CHEST_BASE_MS = 4 * 60 * 60 * 1000;
export const IDLE_CHEST_PER_RANK_MS = 60 * 60 * 1000;
export const IDLE_CHEST_RATE_PER = 0.05;
export const IDLE_CHEST_MAX_RANK = 4;
export const IDLE_CHEST_UPGRADE_BASE = 200;
export const IDLE_CHEST_UPGRADE_MULT = 4;
export const SAVE_VERSION = 4;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const SAVE_KEY = "slop-capitalist.v1";
export const UI_ROUTE_KEY = "slop-capitalist.ui";
export const USER_INDEX_KEY = "slop-capitalist.users";
