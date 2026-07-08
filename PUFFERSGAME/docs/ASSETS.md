# Puffers — Free Pixel-Art Asset Shortlist

Curated 2026-07 for a **pixel-art** look, **anything free-to-use** (license flagged per
item), prioritizing **characters** and **apparatus/furnaces**. "Free to use commercially"
matters because the game deploys publicly.

## License legend
- **CC0** — public domain; no attribution, commercial OK. Safest.
- **CraftPix-Free** — commercial OK, **no attribution required** (credit appreciated),
  **no reselling the assets themselves**.
- **Free-credit** — free to use, author asks for a credit.
- **Paid** — premium; listed only where it's the clear best fit (usually cheap PWYW).

> ⚠️ **Integration note.** The published Artifact builds run under a strict CSP that blocks
> external images, so any sprite must be **embedded as a base64 data-URI** at build time
> (the `build.mjs` step can inline them). Downloading from itch.io / OpenGameArt is
> gated (they 403 automated fetchers), so integrating a pack means either dropping the
> downloaded files into `PUFFERSGAME/assets/` or pointing me at a direct/GitHub-mirror URL.

---

## Characters (gnomes, alchemists, homunculus)

| Asset | License | What's in it | Fit |
|---|---|---|---|
| [OpenGameArt — **Gnomes** (Stendhal)](https://opengameart.org/content/gnomes) | **CC0** | Actual gnome sprites, 24×32 & 48×64, idle + 4-direction walk | ★ Best literal-gnome match; reskin hats per gnome |
| [LuizMelo — **Wizard Pack**](https://luizmelo.itch.io/wizard-pack) | **CC0** | Animated robed mage: idle, move, attack, hit, death | Great for a "master alchemist" or the homunculus's summoner |
| [CraftPix — **Free Pixel Wizard 2D Art**](https://free-game-assets.itch.io/free-wizard-sprite-sheets-pixel-art) | **CraftPix-Free** | 3 wizard characters, animated | Alt alchemist roster |
| [Mattz Art — **Wizard 2D Pixel Art**](https://xzany.itch.io/wizard-2d-pixel-art) | Free-credit | Clean animated wizard | Alt, cohesive with LuizMelo style |
| [Kenney — **Pixel Platformer**](https://kenney.nl/assets/pixel-platformer) / [**Redux**](https://kenney.nl/assets/platformer-art-pixel-redux) | **CC0** | 200 / 900 assets incl. generic characters | Reskin as gnomes; also great for UI/tiles |

## Apparatus, furnaces & bellows

| Asset | License | What's in it | Fit |
|---|---|---|---|
| [CraftPix — **Blacksmith Craft** game assets](https://free-game-assets.itch.io/blacksmith-craft-pixel-art-game-assets) | **CraftPix-Free** (PWYW) | Forge building, **stove**, objects, animated blacksmith | ★ Furnace + **hand bellows** — the core of our board |
| [CraftPix — **Alchemy Items Pixel Art**](https://free-game-assets.itch.io/alchemy-items-pixel-art) | **CraftPix-Free** (PWYW ~$0.60) | ~48 items: flasks, potions, alembic-like vessels | ★ Alembic/retort/aludel glassware + progress icons |
| [Anokolisa — **Pixel Crawler: Sawmill & Furnace**](https://anokolisa.itch.io/free-pixel-art-asset-pack-topdown-tileset-rpg-16x16-sprites) | Free-credit | 16×16 top-down tileset with an **animated furnace** | Furnace glow/animation frames |
| [Seliel the Shaper — **Alchemy Gear**](https://seliel-the-shaper.itch.io/potion-pack) | **Paid** ($12.99) | Premium alchemy-lab objects (alembics, stills), 32px | Best-looking if we invest; matches a "master" tier |
| [Seliel the Shaper — **Smithing Gear**](https://seliel-the-shaper.itch.io/smithing-gear) | **Paid** | Big forge with hot coals + **hand-operated bellows** | Premium bellows/furnace |
| [Viajante dos Sonhos — **Blacksmith Return** free sprites](https://viasonhos.itch.io/blacksmith-return-free-use-sprites-13) | Free-use | Blacksmith/forge sprites | Extra forge bits |

## Where to browse more
- [itch.io — free CC0 pixel art](https://itch.io/game-assets/free/tag-cc0/tag-pixel-art) ·
  [alchemy tag](https://itch.io/game-assets/free/tag-alchemy) ·
  [potion tag](https://itch.io/game-assets/free/tag-potion)
- [OpenGameArt — CC0 resources](https://opengameart.org/content/cc0-resources) ·
  [Good CC0 art](https://opengameart.org/content/good-cc0-art)
- [Kenney — all pixel assets (CC0)](https://kenney.nl/assets/tag:pixel)

---

## Recommended cohesive set (all free-to-use, no purchase)
1. **Gnomes** → OpenGameArt *Gnomes* (CC0), one hat-colour per worker.
2. **Homunculus** → recolour a gnome sickly-green + a glass-dome overlay (keeps it on-model
   with the current wobble), or LuizMelo *Wizard* shrunk.
3. **Furnace + bellows** → CraftPix *Blacksmith Craft* (forge stove + hand bellows).
4. **Glassware** (alembic/retort/aludel) → CraftPix *Alchemy Items*.
5. **Furnace flame animation** → Anokolisa furnace frames (credit in a `CREDITS.md`).

This mixes only CC0 + CraftPix-Free + one credited pack — clean to ship. If we later want a
single unified art voice, **Seliel the Shaper**'s Alchemy + Smithing gear ($~26 total) is
the premium upgrade path.
