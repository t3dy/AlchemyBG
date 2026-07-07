# Design Plan — The Patronage & Rulers Layer

**Status:** proposal / design plan (not yet implemented). Grounded in Tara Nummedal,
*Anna Zieglerin and the Lion's Blood* (2019) and *Alchemy and Authority in the Holy
Roman Empire* (2007); consistent with Ted's own Nummedal-grounded design in
`EmblemRoguelike/docs/research/patrons.md` and `court_economy.js`.

---

## 1. The thesis (from the scholarship)

**Patronage was contract labour.** An early modern alchemist was an *entrepreneur* who
sold promises to a prince; the prince funded a lab, materials, a stipend, status, and
protection, and expected deliverables — gold for the treasury, medicines, mining
expertise, or the Philosophers' Stone itself. The relationship was often a **signed,
enforceable contract** (Philipp Sömmering signed one with Duke Julius; reneging was
itself a prosecutable crime). The whole thing rides a **trust curve**: favor rises with
concrete deliverables and is drained by suspicion — of *fraud*, *sorcery*, and *poison* —
until, if it collapses, it ends not in a bad review but in a **criminal trial and
execution** (Anna Zieglerin and four others, Wolfenbüttel, 7 Feb 1575).

That is the design gift: alchemical patronage already *is* a game system — a
risk/reward contract with a graded, dramatic failure ladder. Our current game models the
**lab**; this layer models the **court that pays for the lab and can hang you for it.**

Design spine (Ted's phrase): **Contract → Trial.** Build the contract; the trial is the
shadow it casts.

---

## 2. How it wraps the existing game

The current solo game is a 10-round lab: build apparatus, run operations, score VP,
survive disasters, win at 9 VP. The patronage layer becomes the **frame** around it:

- You no longer play in a vacuum — you play **under a patron** who funds the lab and holds
  a contract over you. VP becomes "the Work delivered."
- The lab's outputs (potions, medicines, proven fine metal from the Cupellation Furnace,
  the Chrysopoeia) become **contract deliverables**, not just abstract points.
- A new parallel resource — **Suspicion** (or its inverse, **Standing**) — tracks the
  court's trust, and a new lose condition — **the Trial** — sits beside "both alchemists
  dead."
- Lab disasters gain a second meaning: an accident that harms an assistant, or a
  conspicuous failure, now also **raises Suspicion** (a dead Laborant reads as poison).

Nothing about the lab is thrown away; it gains stakes.

---

## 3. Core systems

### 3.1 Patron cards (stat block + rich bio)

Each patron is a card carrying **a historical bio** (the "person info" you want woven in)
**and** a stat block that shapes the game. Stat schema (adapted from our earlier
Renaissance-Magic patron design, aligned to Nummedal):

| Stat | Meaning | Zieglerin-case anchor |
|---|---|---|
| **Purse** | stipend/round + build capital granted | Julius's 500-thaler stipend + a house |
| **Lab tier** | which apparatus/upgrades you start with or unlock | Julius "improvised" the Old Apothecary lab (a mid tier — some princes custom-built) |
| **Demand** | the contract deliverable + deadline (see 3.2) | gold, gemstones, medicines, mining profit, the Stone |
| **Risk tolerance** | how much Suspicion the patron absorbs before acting | Julius ignored the first denunciation (Thangel, 1571) |
| **Orthodoxy** | how fast *sorcery* suspicion escalates at this court | Julius, pious Lutheran, haunted by Grumbach & Lippold |
| **Reach** | severity of the failure penalty (dismissal → debt → trial → execution) | Julius borrowed Brandenburg's executioner and made an example |

**Proposed roster** (reusing Ted's `patrons.md`, each with a one-paragraph bio):

- **Emperor Rudolf II** (Prague) — apex patron: top lab, huge purse, can **ennoble** you;
  but reclusive, unstable, faction-ridden — catastrophic fallout.
- **Duke Julius & Duchess Hedwig** (Wolfenbüttel) — salaried post and materials; the
  **corulership antagonist** (Hedwig's hostility is a live drain); the canonical
  **trial arc**.
- **Duke Friedrich I** (Württemberg) — lab + stipend, a village/castle for success; the
  **"execution court"** — public gallows for failure (highest Reach).
- **Vilém Rožmberk** (Třeboň, Bohemia) — the **refuge patron**: patient, six private labs;
  low reward, high safety; a fallback when another court turns on you.
- **Landgrave Moritz "the Learned"** (Hesse-Kassel) — pays in **recipes & legitimacy**,
  not raw gold; tolerant (slow Orthodoxy escalation); a "safe but poor" court.
- **Marx Fugger** (Augsburg) — not a prince but **the bank**: capital at interest; debt
  is the failure mode rather than the gallows.

Each patron reframes the whole run — a different purse, demand, and how dangerous failure
is. Choosing your patron at setup is the game's biggest strategic decision.

### 3.2 The Contract (the headline object)

**Two contract types** (Nummedal, *Words and Works*, 2011): a **salaried laboratory
post** (steady stipend, lower risk, ongoing obligation) versus a **one-off project
contract** (a discrete high-risk, lump-sum deliverable gamble). Choosing between them is
a core risk dial — the safe salary or the big score. Real terms ran to promissory notes
with fixed return dates (Sendivogius borrowed 5,695 schock in 1597, due "in two years"),
payment-in-kind as **fiefs and estates**, and even **salary "ad dies vitae"** (for life,
500→1,000 florins under Ferdinand II). Patronage debt ran *both* ways — Ferdinand II owed
Sendivogius 18,000 florins.

Signed at setup (chosen with the patron). A card specifying, per Nummedal's real
contracts:

- **Stipend:** resources granted each round (keeps the lab running).
- **Deliverable + deadline:** e.g. "deliver 3 proven fine metal (assays) by round 7," or
  "produce a working medicine by round 5," or "attempt the Chrysopoeia before round 10."
  Anna's own recipes cite concrete timeframes — "six weeks," "nine weeks," "six months."
- **Success reward:** VP, a purse bonus, a lab upgrade, or **ennoblement** (a title —
  a big VP swing and, narratively, safety).
- **Failure penalty:** graded by the patron's Reach — dismissal (lose the stipend),
  **debt** (owe back the advance), or referral to **trial**.
- **Reneging clause:** trying to quit or flee an unfulfilled contract is itself
  prosecutable (Philipp was first arrested precisely for attempting to leave without
  fulfilling his 1571 contract).

**Exclusivity / indispensability mechanic (from Anna):** she deliberately *withheld* the
key first ingredient and the "philosophical fire" so "Julius would still need her." In
game: you may **hold back a completed deliverable** to stay un-fireable (buys safety) at
the cost of not banking its reward yet — a genuine tension.

### 3.3 The trust curve: Standing vs. Suspicion

A single track (Standing high ↔ Suspicion high), pushed by both sides:

**Raises Standing** (concrete deliverables — "far from vague promises, her recipes were
detailed and concrete"): completing assays/medicines, meeting contract milestones, giving
useful **advice** (mining, statecraft), gifts and "small intimate services," producing a
visible demonstration.

**Raises Suspicion** — along **three escalating tracks**, exactly as the case splits them:

1. **Fraud** (*Betrüger*) — missed deadlines, failed demonstrations, identity questions.
   By the 1570s "fraud… was emerging as a trope… an easy way to discredit anyone."
2. **Sorcery** — love/harm magic accusations; escalates fastest at high-Orthodoxy courts.
3. **Poison** — the deadliest: a dead assistant, a sickened courtier, a lab accident.
   The real driver of Anna's downfall was association with **poison + political sabotage**,
   primed by precedent scandals (Grumbach, Lippold — the latter executed for poisoning
   Hedwig's father with mercury sublimate).

**Witchcraft** is a rare red line: elites were seldom charged with it outright, so it sits
as a threshold rather than a routine track.

### 3.4 Antagonist forces (what drains the curve)

The plan's most game-able insight: Suspicion isn't a passive meter, it's driven by three
**antagonist systems** that fire ruler-interaction events:

- **The rival information network** — Duchess Hedwig and her kin (Katharina, Margarete,
  brother Elector Johann Georg) trading letters "policing reputation." A recurring
  denunciation clock you must counter. *"A lord is judged by his servants and advisers."*
- **Precedent scandals** — cards that, once in play, make the patron read alchemy as
  sorcery/poison (Grumbach at Gotha 1567; Lippold at Berlin 1573; Erich & Sidonie).
  They raise the *slope* of Suspicion, not the level.
- **Public satire** — the *Spottlied* / pasquil: a ballad lampooning the patron for
  backing you ("the knaves belong on the gallows"). A public-opinion spike.

**Counterplay** (Anna's real moves, as player options): direct appeal/audience with the
patron; assert piety; leverage a religious ritual (she tried to use **communion** to force
a reconciliation with Hedwig); deliver something undeniable; buy off or expose an accuser.

### 3.5 Ruler-interaction events (the texture)

A deck of court events between lab rounds, e.g.:

- **Audience** — spend a round currying favor; small Standing gain, or pitch a new deal.
- **The patron meddles** — Julius "practiced alchemy himself… got in Philipp's way and
  loaded him down with other hands." A patron action that helps or sabotages the Work and
  can shift blame onto you if it goes wrong.
- **A demonstration is demanded** — produce a deliverable *now* or take a Suspicion hit.
- **Denunciation** — the rival network strikes; answer it (counterplay) or absorb it.
- **The lure of a greater adept** — offer the patron access to a legendary master (Anna
  dangled "Count Carl von Oettingen," supposed son of Paracelsus) for a Standing boost —
  but if exposed as fabricated, a Fraud spike (Kettwig: the count was invented).
- **A rival court beckons** — a defection offer; leaving mid-contract risks the reneging
  clause.

### 3.6 The Trial — the prosecution failure state

When Suspicion crosses the patron's Reach threshold (or a deadline is fatally missed), the
Contract flips to **Trial** — a distinct, graded end-game, not a instant loss:

1. **Arrest & flight** — a chance to flee (to a refuge patron like Rožmberk) before the
   net closes; Anna fled to Goslar and was dragged back.
2. **The Hofgericht** — the patron's court. If the patron's Risk tolerance is high or your
   Standing residue is strong, charges are weaker ("a weak case risked the appearance of
   tyranny").
3. **Interrogation (optional mini-game)** — a *will-vs-pressure* contest: hold a truthful
   narrative against escalating interrogation (Anna "held out far longer than expected").
   Confessing less → a lighter sentence tier.
4. **Sentencing tiers** (the real *Schöffensprüche* ladder, from lightest to worst):
   **flogging + exile → drowning → death by sword → fire.** Your Suspicion mix decides the
   tier: mostly Fraud → exile; Sorcery/Poison → the pyre.
5. **The Day of Justice** — a public ritual; a final plea for mercy (a last dice-roll on
   patron sentiment). Outcome scored: exile lets you carry partial VP to a "new court"
   (campaign hook); execution is the hard loss, but a *dramatic, historically resonant* one.

This gives failure **shape and meaning** rather than a blank "you lost."

---

### 3.7 The three personae (an optional deeper class layer)

Nummedal's *Alchemy and Authority* frames every alchemist as a mix of **three personae**
(she takes "persona" from Mauss, pointedly not Jung):

- **Betrüger** (the cheat) — public transmutations, the "true adept" legend; fast fame,
  high Suspicion.
- **Philosopher** (the scholar/prophet) — influential writings, lasting authority;
  legitimacy that shields against fraud charges.
- **Entrepreneur** (the artisan/laborant) — real deliverables, patrons, prosperity, and
  above all **survival**.

Every historical alchemist was a *blend* of the three. As an optional layer, the player's
run could score across all three and your **persona mix** could shift how the court reads
you — leaning Betrüger wins fame fast but courts the gallows; leaning Philosopher buys
legitimacy; leaning Entrepreneur is the slow road to independence. This is a clean,
scholarship-grounded alternative to a single VP total.

### 3.8 "Beyond patronage": the wider web and the escape victory

Both Nummedal (*Words and Works*) and Prinke ("Beyond Patronage: Michael Sendivogius…")
argue the single prince ↔ single alchemist model is **too thin**. The richer picture, and
its game implications:

- **Alchemy had no guild** — no licensing, no quality control. Patrons and alchemists had
  to *improvise* every lab, skills-assessment, and financial deal. No guild = fraud risk
  baked into the system (a first-class design fact, not an accident).
- **Courts *and* cities *and* universities.** Burgher patrons matter too — the Prague
  merchant Ludvík Korálek kept a lab and a full-time laborant, patronized a whole circle
  chasing the Stone, and **drank himself to death when it all failed**: the model of a
  *patron who destroys himself*, a poignant alternative fate.
- **A multi-patron web.** Real alchemists cycled through many patrons and brokered their
  own moves — Kelley worked Łaski, Rožmberk, and others; Sendivogius served three emperors,
  a king, and magnates in parallel. **Competition between alchemists over patrons and
  profit is the intended texture** ("this discord… a sign of [alchemy's] vitality"), which
  opens a natural path to a **multiplayer / rival-alchemist** mode later.
- **The escape victory (the big idea).** Prinke's thesis: the "successful" alchemist wasn't
  one who made gold (impossible) but one who **survived and escaped the need for patronage
  altogether** — by acquiring income-generating **land**. Sendivogius is the exemplar: after
  decades of contracts he was finally granted the estate of Kravaře (1630, ~26,000 thalers),
  became a genuine tax-exempt Freiherr, and died in his own castle — income "not depending
  on the changing humours of any patron." **Proposed ultimate win condition: convert enough
  delivered Work into a landed title and walk away free** — a far richer goal than "9 VP,"
  and the historically true one.
- **The social-mobility sub-game.** The recurring routes up were **marrying a wealthy
  widow** (both Kelley and Sendivogius did it) and **faking a noble pedigree** to gain the
  right to own land (Kelley's invented Irish knighthood; Sendivogius's fabricated
  coat-of-arms). Optional cards that trade Suspicion for a leap in standing/wealth.
- **The loss, in a proverb.** Alchemy was mocked as *"ars sine arte, cujus principium est
  cupere, medium mentiri, et finis mendicare vel patibulari"* — "an art without art, whose
  beginning is to covet, its middle to lie, and its end to beg or hang on the gallows." A
  perfect tagline for the failure screen.

### 3.9 Fraud and the law, concretely

How courts actually policed alchemists (for the Suspicion→Trial machinery):

- **Warrants** (*Steckbriefe*) with physical descriptions were issued for fled/failed
  adepts — Rudolf II's warrant for Kelley (30 Apr 1591) described "an average fat person
  with long black hair… a thin black beard, with one leg crippled." A "fugitive" state.
- **Imprisonment to extract secrets** by persuasion and torture (Sendivogius was kidnapped
  and tortured for his; Kelley held at Křivoklát and Most).
- **Prosecution under *other* charges.** Crucially, alchemists were rarely executed *for*
  alchemy — von Mühlenfels was hanged (1606) for **high treason**, not his frauds; others
  fell to **debt suits** and estate confiscation. The lab failure is the *cause*; the legal
  charge is treason, debt, poison, or sorcery. (This is exactly the Zieglerin pattern too.)
- **Counter-fraud literature** — Michael Maier's *Examen fucorum pseudochymicorum* (1617)
  catalogued the cheats' tricks: a patron's (or the game's) **fraud-detection tool**, and a
  lovely tie-in to Maier already being in our persona roster.

## 4. Weaving in the person information (as you asked)

Two moves make people central without a "reading desk":

1. **Rich patron bios on every patron card** — Julius the pious, gout-stricken,
   mining-modernizing duke who practiced alchemy with his valets; Hedwig the medically
   skilled duchess who supervised the court apothecaries and ran a women's information
   network; Rudolf II the reclusive collector. These are *flavor + mechanics* (the bio
   explains the stat block).

2. **Persona ↔ patron affinities** — the existing alchemist personas gain a relationship
   to patrons, grounded in real history:
   - **Michael Maier** was physician to **Rudolf II** → bonus Standing / reduced Suspicion
     at Rudolf's court; and historically wrote *Examen fucorum* (anti-fraud) — he can act
     as a **legitimacy gatekeeper**.
   - **Tycho Brahe** worked under Danish royal patronage at Uraniborg → synergy with a
     "royal astronomer" contract; his *medicamenta tria* satisfy medicine deliverables.
   - **Paracelsus** — itinerant, abrasive, anti-authority → higher base Suspicion but
     powerful medicine output.
   - Newer patron-linked NPCs from `patrons.md` (Dee, Kelley "the earless ex-forger,"
     Sendivogius, Khunrath) can appear as **rival/ally alchemists** who raise or lower your
     Suspicion.

So the persona you draw isn't just a lab bonus — it's a *social position* at court.

---

## 5. Mapping onto current mechanics (concrete)

| Existing system | Patronage-layer meaning |
|---|---|
| VP (win at 9) | "the Work delivered"; contract milestones grant VP; ennoblement is a VP prize |
| Cupellation / assays | the natural **deliverable** engine — proven fine metal is what the patron banks |
| Medicine brewing | satisfies **medicine deliverables** (plague amulets, cordials) |
| The Chrysopoeia (endgame) | the ultimate contract clause — attempt the Stone for a huge reward or a Suspicion catastrophe |
| Disasters | now also raise Suspicion (an accident → poison/fraud reading); a dead worker is a *scandal*, not just −1 VP |
| Persona abilities | gain a **court dimension** (affinity, gatekeeping, base Suspicion) |
| Balance harness | extend to price Standing/Suspicion in the shadow model and verify the Trial isn't a coin-flip; add a "patronage" archetype |

---

## 6. Phased build plan (recommended order)

**Phase A — Contract & Standing (MVP).** One patron (Duke Julius), one Contract (a
deliverable + deadline + stipend + failure penalty), a single Standing/Suspicion track,
and a simple **Trial** lose-state (threshold → sentence tier → end screen). Deliverables
map to existing lab outputs. *This alone transforms the game* and is a bounded build.
Extend the balance harness with a Standing price and a "does the trial fire too often?"
gate.

**Phase B — Antagonists & events.** Add the rival network (a denunciation clock), 2–3
precedent-scandal cards, the satire spike, and a small court-event deck with counterplay
(audience, demonstration, appease). Add the three-track Suspicion split (Fraud/Sorcery/
Poison).

**Phase C — Patron roster & person layer.** The full 5–6 patron cards with bios and
distinct stat blocks; persona↔patron affinities; patron-linked NPC alchemists. Setup
becomes "choose your patron & alchemist," multiplying replayability.

**Phase D — The Trial in full.** The interrogation will-vs-pressure mini-game, the
graded Schöffensprüche sentencing, the Day of Justice mercy roll, and **exile-as-campaign
hook** (flee to a refuge patron carrying partial progress).

Each phase ships behind the same discipline as the rest of the project: engine tests for
new rules, a balance-harness pass (the Trial must be a *steerable risk*, not a random
execution), and a browser-verified play-through.

---

## 7. A flavor bank of real cases (for cards & events)

- **Anna Maria Zieglerin** (c.1545–1575) — the visionary; her golden **"lion's blood"**
  promised the Stone, gems, medicines, *and* the power to bring on the End Times. Burned at
  Wolfenbüttel, 7 Feb 1575, with four others.
- **Edward Kelley** (1555–1597) — Dee's earless skryer; public transmutations before the
  Emperor's jeweller; ennobled *eques auratus* by Rudolf II (1590); given estates by
  Rožmberk; then debts, a warrant, prison at Most, and death (poison, after a failed
  escape). The meteoric rise-and-fall.
- **Michael Sendivogius** (1566–1636) — **the survivor**; peasant origin to imperial
  counsellor; married a rich widow, faked a pedigree, built Poland's first blast furnaces,
  won a landed title, and died free in his own castle. The escape-victory exemplar.
- **Alexander Seton "the Cosmopolite"** — the fugitive adept; public transmutations at
  Basel (1603); a Württemberg warrant (1605) describing his aliases. The wanted man.
- **Ludvík Korálek** — the merchant-patron who bankrolled a Stone-chasing circle and
  **drank himself to death** when it failed. The self-destroying patron.
- **A patron "market value" tier** (from a 1600 bribe-worth list): Zamojski 30,000 fl.,
  Sapieha 12,000, Wolski 10,000, Łaski 4–5,000 — a ready-made patron-power ranking.

## 8. Open design questions (for you)

1. **Win condition.** Keep the current "9 VP," or adopt the historically richer **escape
   victory** — convert delivered Work into a **landed title and independence** (Sendivogius)?
   The latter reframes the whole game around getting *out* from under the patron.
2. **Tone of the failure state.** Execution is historically true and dramatic — a real
   hard-loss, or softened to exile/disgrace/flight-to-a-refuge with a campaign continuation?
3. **One patron, or the multi-patron web?** Single-patron runs are cleaner; the "beyond
   patronage" web (competing courts, rival alchemists) is richer and points toward a future
   **multiplayer** mode.
4. **The three-persona layer (Betrüger/Philosopher/Entrepreneur)** — adopt it as the scoring
   spine, or keep it as flavor over the existing VP?
5. **How prominent should Suspicion be** relative to the lab? A light meter, or a co-equal
   second game the lab feeds?
6. **Two accuracy caveats to decide on knowingly:**
   - The iron **"witch's chair"** is a 19th-c. *myth* (invented via Beckmann's 1792
     footnote); use as legend/flavor or omit?
   - The **"gilded gallows"** motif (frauds hanged in mock-gold finery) is genuine in
     Nummedal's broader work but *not* stated in the specific archive files read here — the
     files support the gallows-as-terminal-risk proverb and treason/debt as the actual legal
     mechanisms. Treat the gilding as evocative tradition, not hard-cited fact.

---

## 9. Historical grounding (mechanic → source)

| Mechanic | Source |
|---|---|
| Contract = signed, enforceable, reneging prosecutable | Zieglerin, ch.3, ch.7; Nummedal, *Alchemy & Authority* |
| Stipend + house + improvised lab + protection | Zieglerin, ch.3 (500 thaler; Old Apothecary) |
| Deliverables: gold, gems, medicines, mining, the Stone | Zieglerin, ch.4 (the lion's blood promises) |
| Deadlines / timeframes | Zieglerin, ch.4, ch.6 ("six weeks," "nine weeks") |
| Withholding a step to stay indispensable | Zieglerin, ch.4 |
| Three suspicion tracks (fraud / sorcery / poison) | Zieglerin, ch.6 |
| Rival information network (Hedwig & kin) | Zieglerin, ch.3 |
| Precedent scandals prime the patron | Zieglerin, ch.6 (Grumbach, Lippold) |
| Public satire (*Spottlied*) | Zieglerin, ch.6 |
| Trial: Hofgericht, borrowed executioner, torture | Zieglerin, ch.7 |
| Graded sentence ladder (exile→drowning→sword→fire) | Zieglerin, ch.7 (the *Schöffensprüche*) |
| Day of Justice public ritual | Zieglerin, ch.7 |
| Two contract types (salaried post vs one-off project) | Nummedal, *Words and Works* (*Isis*, 2011) |
| No guild → improvised deals → fraud risk baked in | Nummedal, *Words and Works* (2011) |
| Three personae (Betrüger / Philosopher / Entrepreneur) | Nummedal, *Alchemy and Authority*, ch.2, via Prinke |
| "Beyond patronage": multi-patron web, cities, competition | Prinke, "Beyond Patronage"; Nummedal (2011) |
| Escape victory = landed independence (Sendivogius) | Prinke, "Beyond Patronage" |
| Social mobility (rich widow, faked nobility) | Prinke (Kelley, Sendivogius) |
| Warrants, torture-for-secrets, charges of treason/debt | Prinke (Kelley, von Mühlenfels, Seton) |
| The *ars sine arte* gallows proverb | Prinke (Keyßler 1751; Libavius 1599) |
| Maier's *Examen fucorum* as a fraud-detection tool | Prinke |
| Patron roster & contract-labour model | Ted's `EmblemRoguelike/docs/research/patrons.md` |
| The "witch's chair" is legend, not fact | Zieglerin, Introduction & Conclusion |
| "Gilded gallows" = evocative tradition, not in the files read | (accuracy caveat) |
