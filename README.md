# ⚗️ The Alchemist's Lab

A solo board game of early modern alchemy, played in the browser (**v2.0**).

You are two documented alchemists in the service of a **prince**. Choose your patron —
Duke Julius, Emperor Rudolf II, Landgrave Moritz, the gallows-happy Duke Friedrich, or
Rožmberk the refuge — and take their **Contract**: deliver the Work by the deadline and
you earn your independence. Run the laboratory (gather, distil, assay, brew), survive an
escalating ladder of real lab disasters (mercury vapor, aqua fortis, a crucible of molten
lead), attempt the **Chrysopoeia** — and all the while keep the court's **Suspicion** from
boiling over, or you face a **Trial**, and the gallows or the stake, as Anna Zieglerin did
in 1575. Seek an audience to calm the court; a death in the lab reads as poison.

Grounded throughout in the new historiography of alchemy — Moran, Principe, Newman, Roos,
and Nummedal (see `docs/`).

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
