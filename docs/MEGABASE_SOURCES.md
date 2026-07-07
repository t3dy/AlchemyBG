# Provenance — where this design came from

Every mechanic traces to Ted's own LLM conversations, archived in
`C:\Dev\megabase\megabase.db` (query `messages_fts` / join `conversations`).
Catalog entry of record: `C:\Dev\games\ideas.json` → id `alchemists-lab-board-game`.

| Megabase conversation (id) | Date | What it contributed |
|---|---|---|
| **Alchemy Lab Board Game** (3618) | 2024-09-13 | Founding pitch: furniture tiles, worker tokens changing color on disaster, medicines heal; Agricola reskin; MTG-style card drafts; medieval flavor quotations (Paracelsus, Al-Kindi, Flamel...); Citadels role-selection idea |
| **Games Learning Alchemy Board Game** (3646) | 2024-10-12 | Title "The Alchemist's Lab"; **no-magic realism constraint**; 8-ailment color palette; event categories (personal / global contribute-or-defect / positive); secret goals; 40-tile + 30-ingredient reserves; build→place→event turn; educational mission (new historiography of alchemy) |
| **Alchemy Board Game Code Fix** (3615) | 2024-10-12 | First digital prototype (single HTML, hot-seat 3p); mitigate/confront/pass event resolution; equipment-as-insurance; UX laws: consequences unskippable, status visible before heal prompt; the select-token-then-click-tile pattern (and its bugs) |
| **Game Playtest Feedback Form** (3640) | 2024-10-12 | Central tension: disasters "fun to deal with but don't feel bad because they are too punishing"; 8 win-condition analysis; 150+ question playtest survey (reusable) |
| **Renaissance Magic Board Game** (3663) | 2024-10-19 | Sibling macro-game: patronage stat blocks, Inquisition meter, Maier/Atalanta Fugiens as playable content — campaign-layer reserve |
| **Alchemy Lab Game Design** (5984) | 2026-02-14 | **The solo spec the slice implements**: 10 rounds / 2 workers / 12 VP; 5-tile lab; recipes (Potion 2🌿+1⛏️ etc.); 12-disaster deck with prevention clauses; escalation ladder; research track; Grand Experiment climax; Apprentice/Trauma extensions; Agricola-fidelity UI spec (emoji placeholders, phase colors, "what happens if I do nothing?" legibility) |
| **Alchemy Game Prototype** (5983) | 2026-02-14 | Educational design matrix (scholarship quote → mechanic → learning goal); confirmation that the PDF alone lacked a core loop — motivated the solo spec |

Deviations from source, by judgment:
- Economy tuned up (Workbench 3🌿, Alembic 2⛏️+1🪙) after a 100-seed simulation showed
  the spec's implied economy topped out at ~5 VP vs the 12 VP goal. Spec's recipe costs
  and VP values kept intact.
- Neutralization Station auto-triggers on the first acid disaster (spec left it open).
- "Illuminated" state (from the ideas.json catalog entry) attached to the Grand
  Experiment success rather than a separate system.
