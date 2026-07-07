import { NextResponse } from "next/server";

// Daily challenge: everyone who plays today's seed faces the same disaster deck.
export const dynamic = "force-dynamic";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function GET() {
  const date = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ date, seed: hashString(`alchemists-lab:${date}`) });
}
