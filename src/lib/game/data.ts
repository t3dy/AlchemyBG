import type { DisasterCard, FurnitureTile, ResearchUpgrade, Resources } from "./types";

export const MAX_ROUNDS = 10;
export const WIN_VP = 12;
export const GRAND_TRANSMUTATION_ROUND = 9;

export const STARTING_RESOURCES: Resources = {
  ingredients: 4,
  metals: 2,
  gold: 2,
  medicine: 1,
  potions: 0,
  advancedPotions: 0,
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
    flavor: "The crucible is the forge where all things are tried and tested.",
    flavorSource: "Paracelsus",
  },
  {
    id: "alembic",
    name: "Alembic",
    emoji: "⚗️",
    description: "Distill: gain 2 Metals and 1 Gold (sickened: 1 Metal, no Gold). Advanced Distillation adds +1 Metal.",
    passive: false,
    flavor: "Let the cooling of the metal temper the heat of the alchemist's toil.",
    flavorSource: "Al-Kindi",
  },
  {
    id: "workbench",
    name: "Workbench",
    emoji: "🪑",
    description: "Gather: gain 3 Ingredients (2 if the worker is sickened).",
    passive: false,
    flavor: "In the crucible of our labors, wisdom is born of practice.",
    flavorSource: "Nicholas Flamel",
  },
  {
    id: "researchDesk",
    name: "Research Desk",
    emoji: "📜",
    description: "Research: pay 1 Ingredient to unlock the next upgrade (+1 VP each).",
    passive: false,
    flavor: "From the desk of the scholar, insights into the mysteries of nature emerge.",
    flavorSource: "Albertus Magnus",
  },
  {
    id: "fumeHood",
    name: "Fume Hood",
    emoji: "🌬️",
    description: "Passive: negates the first sickening effect each round.",
    passive: true,
    flavor: "In the clear air of the fume hood, the alchemist's spirit may thrive untainted.",
    flavorSource: "Hermes Trismegistus",
  },
  {
    id: "safetyShower",
    name: "Safety Shower",
    emoji: "🚿",
    description: "Passive: one free healing step each round during the Healing phase.",
    passive: true,
    flavor: "Let the cleansing waters wash away the marks of our follies.",
    flavorSource: "Roger Bacon",
  },
  {
    id: "neutralizationStation",
    name: "Neutralization Station",
    emoji: "🧂",
    description: "Passive: cancel one acid disaster entirely, once per game.",
    passive: true,
    flavor: "The alchemist's art is not just in creation but in the remedy of its missteps.",
    flavorSource: "Theophrastus",
  },
];

export const RESEARCH_TRACK: ResearchUpgrade[] = [
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
  {
    id: "advancedDistillation",
    name: "Advanced Distillation",
    emoji: "⚗️",
    description: "The Alembic yields +1 Metal.",
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
    preventionText: "Line the vessels: pay 1 Metal.",
    preventionCost: { metals: 1 },
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
    preventionText: "Seal the retort with lead: pay 1 Metal.",
    preventionCost: { metals: 1 },
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
    preventionText: "Reinforce the vessel: pay 2 Metals.",
    preventionCost: { metals: 2 },
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
