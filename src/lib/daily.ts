// Daily challenge: everyone who plays today's seed faces the same disaster deck.
//
// This was a serverless route (`/api/daily`) while the game was hosted on
// Vercel. It never read server state — the seed is a pure function of the UTC
// date — so it runs client-side unchanged, which is what lets the game ship as
// a static export on GitHub Pages.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type DailyInfo = { date: string; seed: number };

export function dailyInfo(now: Date = new Date()): DailyInfo {
  const date = now.toISOString().slice(0, 10);
  return { date, seed: hashString(`alchemists-lab:${date}`) };
}
