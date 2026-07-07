# ⚗️ The Alchemist's Lab

A solo worker-placement board game of early modern alchemy, played in the browser.
Run the laboratory, gather and distill, brew potions and medicines, survive an
escalating ladder of historically real lab disasters — mercury vapor, aqua fortis,
a crucible full of molten lead — and keep your two alchemists alive long enough to
attempt the Grand Experiment.

Built with Next.js (App Router) + TypeScript + Tailwind. The rules live in a pure,
seeded, fully-tested engine (`src/lib/game/`), so every game is a deterministic
replay of its seed — which powers the `/api/daily` shared daily challenge.

## Play locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # engine rules + balance gate
```

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com/new) — zero config, no
environment variables. The daily-challenge API route runs serverless.

## Design

The game distills two years of design conversations (2024–2026): a worker-placement
engine-builder where Agricola's harvest is replaced by disaster, and the central
tension is productivity versus safety investment. Design bible in `docs/DESIGN.md`;
current slice scope in `docs/VERTICAL_SLICE.md`.

No magic: everything in the game — apparatus, ingredients, accidents, cures — is
drawn from the real material culture of early modern alchemy.
