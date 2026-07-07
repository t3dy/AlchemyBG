import type { DisasterCard, FurnitureId, FurnitureTile, ResearchUpgrade, Resources } from "./types";

export const MAX_ROUNDS = 10;
export const WIN_VP = 8;
export const GRAND_TRANSMUTATION_ROUND = 9;

// Historically documented alchemists, drawn from the AlchemyTimelineMap database
// (C:\Dev\ALCHEMYTIMELINEMAP\data\seed_data.json — all SCHOLARSHIP_BASED entries).
// Two are drawn per game. Pairings across eras are a game convention, not a claim.
export interface WorkerPersona {
  slug: string; // AlchemyTimelineMap person slug
  name: string;
  era: string;
  bio: string;
}

export const WORKER_ROSTER: WorkerPersona[] = [
  {
    slug: "zosimos-of-panopolis",
    name: "Zosimos",
    era: "Late Antique",
    bio: "Zosimos of Panopolis, 3rd c. — earliest systematic alchemical writer; craft practice meets Greek philosophy.",
  },
  {
    slug: "jabir-ibn-hayyan",
    name: "Jabir",
    era: "Medieval",
    bio: "Jabir ibn Hayyan, 8th–9th c. — corpus that shaped practical chemistry for a millennium; the Latin West's 'Geber'.",
  },
  {
    slug: "al-razi",
    name: "al-Razi",
    era: "Medieval",
    bio: "al-Razi, 9th–10th c. — Persian physician-alchemist; advanced systematic distillation and metallurgical work.",
  },
  {
    slug: "al-kindi",
    name: "al-Kindi",
    era: "Medieval",
    bio: "al-Kindi, 9th c. — Baghdad philosopher and polymath who engaged alchemy critically.",
  },
  {
    slug: "gerard-of-cremona",
    name: "Gerard",
    era: "Medieval",
    bio: "Gerard of Cremona, 12th c. — Toledo translator who carried Arabic alchemical treatises into Latin.",
  },
  {
    slug: "roger-bacon",
    name: "Roger Bacon",
    era: "Medieval",
    bio: "Roger Bacon, 13th c. — English Franciscan natural philosopher engaged with alchemy and experiment.",
  },
  {
    slug: "paracelsus",
    name: "Paracelsus",
    era: "Early Modern",
    bio: "Paracelsus, 1493–1541 — Swiss physician; pioneered medical alchemy and pharmaceutical preparation.",
  },
  {
    slug: "tycho-brahe",
    name: "Tycho",
    era: "Early Modern",
    bio: "Tycho Brahe, 1546–1601 — ran the Uraniborg laboratory; medicamenta tria rather than transmutation.",
  },
  {
    slug: "michael-maier",
    name: "Maier",
    era: "Early Modern",
    bio: "Michael Maier, 1568–1622 — German court physician and alchemist; author of Atalanta Fugiens.",
  },
];

// The board starts EMPTY. Openings are gold-allocation puzzles: this stock buys
// two cheap tiles, or one expensive tile plus operating capital.
export const STARTING_RESOURCES: Resources = {
  ingredients: 4,
  metals: 3,
  gold: 8,
  medicine: 3,
  potions: 0,
  advancedPotions: 0,
};

// The five tiles a player can construct directly onto their empty board. The two
// safety tiles (safetyShower, neutralizationStation) are NOT here — they are earned
// down the Research Desk tech path, keeping research a distinct strategic lane.
export const BASE_BUILDABLE: FurnitureId[] = [
  "workbench",
  "alembic",
  "crucible",
  "researchDesk",
  "fumeHood",
];

// Build costs, priced by the shadow-price model (docs/BALANCE_MODEL.md) so that no
// single opening dominates: cheap tiles pay off slowly, dear tiles pay off faster.
export const BUILD_COST: Record<FurnitureId, Partial<Resources>> = {
  workbench: { gold: 1 },
  fumeHood: { gold: 2 },
  crucible: { gold: 2, metals: 1 },
  alembic: { gold: 2 },
  researchDesk: { gold: 2 },
  // Safety tiles are placed for free the instant their research completes.
  safetyShower: {},
  neutralizationStation: {},
};

export interface Recipe {
  id: "potion" | "medicine" | "advancedPotion";
  name: string;
  emoji: string;
  cost: Partial<Resources>;
  yields: keyof Resources;
  vpNote: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "potion",
    name: "Potion",
    emoji: "🧪",
    cost: { ingredients: 2, metals: 1 },
    yields: "potions",
    vpNote: "1 VP",
  },
  {
    id: "medicine",
    name: "Medicine",
    emoji: "💊",
    cost: { ingredients: 1, gold: 1 },
    yields: "medicine",
    vpNote: "heals wounds",
  },
  {
    id: "advancedPotion",
    name: "Advanced Potion",
    emoji: "✨",
    cost: { potions: 1, metals: 1 },
    yields: "advancedPotions",
    vpNote: "2 VP",
  },
];

export const FURNITURE: FurnitureTile[] = [
  {
    id: "crucible",
    name: "Crucible",
    emoji: "🔥",
    description: "Brew a recipe: Potion (2🌿+1⛏️), Medicine (1🌿+1🪙), or Advanced Potion (1🧪+1⛏️).",
    passive: false,
    flavor:
      "Hessian crucibles, fired above 1,300°C, unknowingly synthesized mullite — world-renowned resistance to thermal shock.",
    flavorSource: "UCL/Cardiff crucible archaeology",
  },
  {
    id: "alembic",
    name: "Alembic",
    emoji: "⚗️",
    description: "Distill: gain 2 Metals and 1 Gold (sickened: 1 Metal, no Gold). Advanced Distillation adds +1 Metal.",
    passive: false,
    flavor:
      "Separating the volatile from the fixed by heat and condensation, in alembic and cucurbit — the central operation of the art.",
    flavorSource: "distillation, AlchemyTimelineMap",
  },
  {
    id: "workbench",
    name: "Workbench",
    emoji: "🪑",
    description: "Gather: gain 3 Ingredients (2 if the worker is sickened).",
    passive: false,
    flavor:
      "Knowledge resident in hands and senses: craft mastery the treatises could not fully write down.",
    flavorSource: "artisanal epistemology (P. Smith)",
  },
  {
    id: "researchDesk",
    name: "Research Desk",
    emoji: "📜",
    description: "Research: pay 1 Ingredient to unlock the next upgrade (+1 VP each).",
    passive: false,
    flavor:
      "In Toledo, Gerard of Cremona turned Arabic treatises on distillation and acids into Latin — and Europe's labs changed.",
    flavorSource: "translation movement, 12th c.",
  },
  {
    id: "fumeHood",
    name: "Fume Hood",
    emoji: "🌬️",
    description: "Passive: negates the first sickening effect each round.",
    passive: true,
    flavor:
      "Excavated glass and crucibles from Tycho's Uraniborg lab carry mercury and lead — the air of the workshop was not kind.",
    flavorSource: "Uraniborg excavation, 1988–90",
  },
  {
    id: "safetyShower",
    name: "Safety Shower",
    emoji: "🚿",
    description: "Passive: one free healing step each round during the Healing phase.",
    passive: true,
    flavor:
      "Operational chemistry was empirically successful — and empirically dangerous. Recovery was part of the craft.",
    flavorSource: "operational chemistry, AlchemyTimelineMap",
  },
  {
    id: "neutralizationStation",
    name: "Neutralization Station",
    emoji: "🧂",
    description: "Passive: cancel one acid disaster entirely, once per game.",
    passive: true,
    flavor:
      "Acid production reached the Latin West through translated Arabic treatises; so did the means of taming it.",
    flavorSource: "Gerard of Cremona transmission",
  },
];

// Ordered so research pays off economically FIRST (Advanced Distillation), making a
// research-led opening a real engine choice rather than a purely defensive one.
export const RESEARCH_TRACK: ResearchUpgrade[] = [
  {
    id: "advancedDistillation",
    name: "Advanced Distillation",
    emoji: "⚗️",
    description: "The Alembic yields +1 Metal.",
  },
  {
    id: "safetyShower",
    name: "Safety Shower",
    emoji: "🚿",
    description: "Adds the Safety Shower tile: one free healing step per round.",
  },
  {
    id: "neutralizationStation",
    name: "Neutralization Station",
    emoji: "🧂",
    description: "Adds the Neutralization Station: cancel one acid disaster per game.",
  },
];

// Ids of disasters the Neutralization Station can cancel.
export const ACID_DISASTERS = new Set(["hydrochloricSpill", "nitricBurn", "sodiumHydroxideSplash"]);

// 12-card deck. The deck is built in escalation-ladder order:
// rounds 1-4 draw minor, 5-8 major, 9-10 catastrophic.
export const DISASTERS: DisasterCard[] = [
  // ── Minor ────────────────────────────────────────────────
  {
    id: "sulphurFire",
    name: "Sulphur Fire",
    emoji: "🔥",
    severity: "minor",
    effectText: "Choking fumes: one working alchemist becomes Sickened.",
    preventionText: "Smother it with sand: pay 1 Ingredient.",
    preventionCost: { ingredients: 1 },
    flavor: "The brimstone catches, and a blue flame licks the rafters.",
  },
  {
    id: "sodiumHydroxideSplash",
    name: "Sodium Hydroxide Splash",
    emoji: "🧫",
    severity: "minor",
    effectText: "Caustic burn: one working alchemist becomes Injured.",
    preventionText: "Douse with diluted vinegar: pay 1 Gold.",
    preventionCost: { gold: 1 },
    flavor: "The lye bites deeper than any blade.",
  },
  {
    id: "leadContamination",
    name: "Lead Contamination",
    emoji: "🩹",
    severity: "minor",
    effectText: "Tainted stores: lose 2 Ingredients.",
    preventionText: "Line the vessels: pay 2 Metals.",
    preventionCost: { metals: 2 },
    flavor: "A sweetness in the wine that should not be there.",
  },
  {
    id: "equipmentFailure",
    name: "Equipment Failure",
    emoji: "⚙️",
    severity: "minor",
    effectText: "The Workbench jams and is unusable next round.",
    preventionText: "Pay 1 Gold for repairs.",
    preventionCost: { gold: 1 },
    flavor: "The bellows wheeze, the clamps slip, the work waits.",
  },
  // ── Major ────────────────────────────────────────────────
  {
    id: "hydrochloricSpill",
    name: "Hydrochloric Acid Spill",
    emoji: "🫗",
    severity: "major",
    effectText: "One working alchemist becomes Injured and you lose 1 Ingredient.",
    preventionText: "Neutralize with soda stock: pay 1 Gold.",
    preventionCost: { gold: 1 },
    flavor: "The caustic fumes eat away at both flesh and fabric.",
  },
  {
    id: "mercuryVapor",
    name: "Mercury Vapor Leak",
    emoji: "☿",
    severity: "major",
    effectText: "Quicksilver haze: every working alchemist becomes Sickened.",
    preventionText: "Seal the retort with lead and pay to vent the vapors: 1 Metal and 1 Gold.",
    preventionCost: { metals: 1, gold: 1 },
    flavor: "The toxic mercury seeps into every crevice, contaminating all it touches.",
  },
  {
    id: "chlorineGas",
    name: "Chlorine Gas",
    emoji: "☁️",
    severity: "major",
    effectText: "Green cloud: every alchemist's condition worsens one step.",
    preventionText: "Wet cloths over every face: pay 2 Ingredients.",
    preventionCost: { ingredients: 2 },
    flavor: "The poisonous gas chokes and debilitates, leaving them gasping for breath.",
  },
  {
    id: "arsenicExposure",
    name: "Arsenic Exposure",
    emoji: "☠️",
    severity: "major",
    effectText: "One working alchemist becomes Sickened and you lose 1 Potion.",
    preventionText: "Prophylactic dose: pay 1 Medicine.",
    preventionCost: { medicine: 1 },
    flavor: "The poison seeps into every concoction, rendering them useless.",
  },
  // ── Catastrophic ─────────────────────────────────────────
  {
    id: "crucibleExplosion",
    name: "Crucible Explosion",
    emoji: "💥",
    severity: "catastrophic",
    effectText: "Molten spray: one working alchemist becomes Critical; the Crucible is unusable next round.",
    preventionText: "Swap in a Hessian crucible, proof against thermal shock: pay 2 Gold and 1 Metal.",
    preventionCost: { gold: 2, metals: 1 },
    flavor: "The blast sends molten metal everywhere, sparing no one.",
  },
  {
    id: "nitricBurn",
    name: "Nitric Acid Burn",
    emoji: "🧪",
    severity: "catastrophic",
    effectText: "Aqua fortis erupts: one working alchemist becomes Critical.",
    preventionText: "Milk and soda bath: pay 1 Gold and 1 Ingredient.",
    preventionCost: { gold: 1, ingredients: 1 },
    flavor: "A sudden eruption of acid renders both flesh and elixir useless.",
  },
  {
    id: "dimethylmercury",
    name: "Dimethylmercury Incident",
    emoji: "🧤",
    severity: "catastrophic",
    effectText: "A drop through the glove: one alchemist becomes Critical.",
    preventionText: "Immediate chelation: pay 1 Medicine.",
    preventionCost: { medicine: 1 },
    flavor: "The highly toxic spill leaves a trail of sickness and delay.",
  },
  {
    id: "fumeBackflow",
    name: "Fume Backflow",
    emoji: "🌫️",
    severity: "catastrophic",
    effectText: "The hood reverses: every working alchemist becomes Sickened. The Fume Hood cannot negate this.",
    preventionText: "Vent the chimney flue: pay 2 Ingredients.",
    preventionCost: { ingredients: 2 },
    flavor: "The lingering stench saps the vitality of any who enter.",
  },
];

export const DISASTER_BY_ID = new Map(DISASTERS.map((d) => [d.id, d]));
export const FURNITURE_BY_ID = new Map(FURNITURE.map((f) => [f.id, f]));
