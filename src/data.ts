export type PlanetId = "youtube" | "tiktok";

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

export const PLANETS: PlanetDef[] = [
  {
    id: "youtube",
    name: "YouTube",
    tag: "Planet 1",
    unlock: "Start here. One cursed short.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    tag: "Planet 2",
    unlock: "Prestige once to unlock the For You page.",
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
      name: "Duet Chain",
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
      name: "You Are The FYP",
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
};

export const MILESTONES = [
  25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

export const PRESTIGE_AT = 1_000_000;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const SAVE_KEY = "slop-capitalist.v1";
