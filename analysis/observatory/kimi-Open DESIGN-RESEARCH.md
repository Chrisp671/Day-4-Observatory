# Day4 Observatory — visual design research brief (kimi-Open)

_Single-researcher pass, 2026-08-12, by the kimi-k3 agent in OpenCode. Commissioned as an independent remake: one researcher, one voice, every source fetched and read in-session. Scope: a full-viewport Canvas 2D astronomical clock in the established "living cyanotype" identity (`web/src/ui/theme.ts`: field `#0E2440` over `#081627`, inks `#D7E6F2`/`#7E9CB8`/`#3A5876`, gold `#F0B310` for the sun only, `#ECF2F7` for the moon only). This refines the identity; it does not replace it. Constraints honored throughout: Canvas 2D linework + two accent colors, no photographic textures, no 3D, no new dependencies._

## How to read the evidence

- **Verified** = I fetched and read the linked page in this session. **Measured** = I downloaded the museum image (Met Open Access API) and computed the number myself; method stated inline. **Doc'd** = the number comes from the institution's published object record.
- Blocked this pass (bot-walls or 5xx): British Museum collection, David Rumsey, Library of Congress item pages, Linda Hall exhibits, Cambridge CUDL, orloj.eu. Nothing below relies on them.
- Code references are to `web/src/ui/*` as of this date, so each rule lands on a specific line.

## 1. Ring composition & proportion

**References**

- [Rasulid astrolabe, 1291 — Met 444408, public domain](https://www.metmuseum.org/art/collection/search/444408). The canonical dense-center/quiet-limb instrument. **Doc'd:** case ⌀15.6 cm, rete/plates ⌀12.7 cm → moving sky occupies **0.81 of case radius**. **Measured:** on the Met's straight-on photo (DP170386), walking the middle scanline inward from the rim, the solid limb runs **0.129R** before the rete's openwork chatter begins. **Rule:** one bold perimeter band ≈0.12–0.13R; everything computation-dense lives inside 0.8R; the moving layer (rete) is *pierced* — you read fixed vs moving by openness, not by color.
- [Planispheric astrolabe, Muhammad Zaman, 1654–55 — Met 451699](https://www.metmuseum.org/art/collection/search/451699). Safavid astrolabe whose rete is calligraphy; proves extreme density stays legible when the perimeter scale is perfectly regular. **Rule:** regularity of the outer scale is the license for interior complexity — never let the chapter ring itself get clever.
- [Mirror clock, Nuremberg ca. 1565–70 — Met 17.190.639](https://www.metmuseum.org/art/collection/search/193609). A 4+ concentric-system success: outer thin minute band (5–60, I–IIII), hour chapter (I–XII twice), calendar ring, then the astrolabe center with concentric sun and moon hands. **Rule:** when 4+ rings share a face, only the outermost carries dense ticks, and each ring gets a *different engraving density*; moving parts are distinguished by material (blued steel vs gilt) — our analog is stroke weight/alpha, not a second hue.
- [Prague Orloj, 1410 — overview (Wikipedia; tertiary, dial section flagged "needs citations")](https://en.wikipedia.org/wiki/Prague_astronomical_clock). Four moving components over a stationary Earth/sky background — and the calendar is **a separate plate below the dial**, not another ring. The sun hand reads three scales at once (Roman hours, unequal-hour curves, Old Czech outer ring). **Rule:** (a) not every dataset must be concentric — offload what doesn't belong to the day-cycle; (b) one pointer may cross many rings if the pointer is unmissable.
- [Cellarius, Ptolemaic solar-path plate, 1660 — Rijksmuseum RP-P-AO-29-1-19, public domain](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293). Verified: central earth globe, zodiac band around it, degree scale at the edges. **Rule:** one broad data band (zodiac/path) bounded by clean double rules; a quiet moat around the central globe; small intervals inside a family, doubled gaps between families.

**Application to the current canvas** (radii from `clockface.ts` FACE: dial .985/.875, numerals .82, moon .72, sidereal .575, earth .30)

- The dial band is 0.110R wide — squarely in the measured 0.12–0.13R instrument-limb pattern. **Do not widen it.**
- Gaps: numerals→moon 0.10R, moon→sidereal 0.145R, sidereal→earth 0.275R. Adequate, but the moon orbit and sidereal ring are both *uniform continuous circles* (`moon.ts:82-87`, `sidereal.ts:19-24`), so they read as the same kind of object at different radii. The astrolabe lesson: make the construction line *open* — dash the `.72R` orbit or break it behind the moon disc (gap ≈ 2× the moon's angular width); let `.575R` be the one articulated secondary ring.
- Keep ≥0.04R of unmarked "paper" flanking each data family; the current 0.275R sidereal→earth moat is the face's rest area — protect it.

## 2. Tick & label hierarchy

**References**

- [Mirror clock — Met 17.190.639](https://www.metmuseum.org/art/collection/search/193609) (verified details): hour numerals augmented with **touch pins** for reading in darkness; the minute band is the *thin outermost* ring. **Rule:** the densest scale is thinnest and outermost; redundancy (pin + numeral) serves dark reading — our dark-reading equivalent is a DOM text transcript, not brighter ticks.
- [Forfaict clock-watch, Paris ca. 1600–10 — Met 17.190.1607](https://www.metmuseum.org/art/collection/search/194195). A 5.4 cm instrument with hours *and half-hours* on its silver chapter ring. **Rule:** even at tiny radius, a two-level cadence (hour/half-hour) is expected — full-width ticks for every hour is not historical.
- [Dürer, Celestial Globe—Southern Hemisphere, 1515 — Met 51.537.2](https://www.metmuseum.org/art/collection/search/358367). First published star maps; coordinate circles hairline, constellation contours mid-weight, stars/names compact dark marks. **Rule:** three roles, three weights, roughly an opacity ladder of .35/.65/.95 — not three equally bright blues.
- [Cellarius plate — Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293). Degree scale lives at the plate edge; labels sit in clear pockets. **Rule:** curve only categorical ring names, never numerals; numerals stay upright inside the scale.

**Application**

- Current cadence is nearly flat: majors span 0.122R at 1.4px `inkHi@.95`; minors span the *full 0.110R band* at 0.7px `inkMid@.55` (`dial.ts:58-66`). Length ratio major:minor ≈ **1.1:1** — history says 2:1 minimum. **Rule:** 6h major = full band × 1.4px; 1h = half band × 1.0px; 20-min = quarter band × 0.75px hairline. Keep numerals at 00/06/12/18 only.
- Numerals (`dial.ts:69-71`) are `inkMid@.9`, 300-weight mono, 0.052R (≈21px at R=400). Measured contrast 4.69:1 (table in §7) — passes 4.5:1 by a hair, but thin light glyphs antialias darker; WCAG's own 1.4.11 note warns thin strokes render fainter than their nominal color. **Rule:** numerals get `inkHi@.9` (10.2:1); the mono 300 weight may stay.

## 3. Cyanotype materiality

**References**

- [Anna Atkins, Part X, ca. 1853 — Met 2005.100.557(40)](https://www.metmuseum.org/art/collection/search/291537), image pulled via [Met Open Access API](https://collectionapi.metmuseum.org/public/collection/v1/objects/291537). **Measured** by me on the web-large scan (510×625): whole-plate mean RGB (57, 95, 125) — a mid Prussian blue; the dominant blue field (middle 50% of pixels by luminance) spans only 76.9–87.8 with within-band stddev **3.5%**; broad patch-to-patch exposure variation across field patches **3.1%**. **Rule:** total field variation in a real cyanotype is ≈3–4% of tone, split between broad exposure drift and fine mottle — that is the entire texture budget.
- [Photographs of British Algae — NYPL Digital Collections](https://digitalcollections.nypl.org/collections/photographs-of-british-algae-cyanotype-impressions). The contact-print grammar: subject pale against the blue, edges hard where the specimen touched paper, soft where it didn't. **Rule:** near-white is reserved for marks that "touch the paper" (sun disc edge, moon limb, dial rules); secondary structure sits in the two paler blues; nothing glows.

**A canvas recipe within the constraint "no photographic textures"**

Generate materiality, don't import it: on resize, build one seeded 128×128 monochrome noise tile in an offscreen canvas, blur ~0.75 CSS px, composite at **≤1.5% opacity** (grain/mottle term); add one static radial luminance ramp of **≤2.5%** (exposure term — `printDeep`→`printField` already supplies part of it). Aggregate stays under the measured ≈4%. No fibers, scratches, folds, vignette-darkening beyond the ramp, and **no animated grain** — print is still; only the sky moves.

## 4. Moon & Earth rendering conventions

**References**

- [Forfaict clock-watch — Met 17.190.1607](https://www.metmuseum.org/art/collection/search/194195) (verified): moon *phase* shown through an aperture in a revolving disk; moon *age* by a small hand on the same disk; moonlight-after-sundown readable at the disk edge. **Rule:** at small radius, phase is a binary silhouette in an aperture — no numerals on the moon, no crater texture; phase, age, and position are three separate channels, never stacked onto one glyph.
- [Prague Orloj — moon mechanism](https://en.wikipedia.org/wiki/Prague_astronomical_clock) (tertiary, flagged): a half-silvered, half-black sphere rotated by its own 57-tooth gear shows phase. **Rule:** one light half, one dark half, a hard boundary — illumination geometry alone carries phase; an outline around the moon is optional.
- [James Wilson terrestrial globe, 1828 — Met 69.50](https://www.metmuseum.org/art/collection/search/8487). Engraved globe: limb, coastline, graticule differentiated by weight, no tonal relief. **Rule for the ~200px disc:** limb strongest (1.5px), one family of curves mid-weight, the other hairline — never two families at equal weight.

**Application**

- **Moon (60px ⌀ at R=400, `moon.ts:91`):** keep the analytic half-ellipse terminator (it's correct and crisp). Remove the `inkHi@.9` outline (`moon.ts:62-67`): measured moonlight-vs-shadow adjacency is **15.17:1** — the disc separates itself from the field; the outline doubles a boundary that history leaves bare. Keep the `moonlight@.09` earthshine (1.29:1 — just enough to hold the new-moon limb, decorative by number, which is correct).
- **Earth (240px ⌀, `earth.ts`):** the current graticule is a plus-sign plus full vertical ellipses at 0.38/0.72 (`earth.ts:28-41`) — a symbolic beach ball, and two families at equal weight, breaking the Wilson rule. Truthful cheap fix: equator + two horizontal parallels at ±23.4° (sin 23.4° = 0.397r — the existing 0.38 ellipse is *almost exactly the tropic*, so make it one), and 2–3 meridian half-ellipses at declining weight. Terminator: replace the rotated semicircle + 0.22r "softener" ellipse (`earth.ts:48-58` — an airbrush in disguise) with one crisp analytic terminator curve from the engine's subsolar point; night fill stays flat `shadow@.72`.

## 5. Motion in instruments

**References**

- [The 10,000-Year Clock — Long Now Foundation](https://longnow.org/clock/) (verified). Its published design principles include **"Go slow"**, and its deepest trick: *the clock always knows the correct time, but the dials only advance when a visitor winds them*. Aliveness is proven by correctness on demand, not by constant display motion. **Rule:** dignity = the model is always right; the display never performs.
- [Apple Watch faces — Apple Support](https://support.apple.com/guide/watch/faces-and-features-apde9218b440/watchos) (verified): the Astronomy face is "a continuously updating 3D model" with Digital-Crown time travel; Solar Dial is "a 24-hour, circular dial that tracks the sun." **Rule to steal (geometry only):** scrubbing time through a fixed frame reveals slow change better than any ambient animation. **Rule to avoid:** photoreal 3D globes — the anti-reference.
- [WCAG 2.2 SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide) (verified): auto-moving content >5s needs a pause mechanism unless essential; for real-time status the prescribed pattern is **pause, then jump to current on resume** (not catch-up); one mechanism should govern all moving elements. **Rule:** an explicit freeze-time control is a conformance requirement, not a nicety — and it must not trap keyboard focus.
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) (verified): baseline since Jan 2020; vestibular triggers are scaling/panning — exactly what a planetarium does and this face must not. **Rule:** under `reduce`, render at the true timestamp on a 60s cadence; no transitions at all.

**Application**

At 0.25°/min the sun is sub-perceptible; that's a feature. Proof of life = a once-per-minute DOM timestamp update (150–250ms opacity settle on the *text only*) plus the visibly changing sun/moon/terminator *relationship* when scrubbing. No easing on celestial bodies, ever: they are always at the physically true position. No pulsing "LIVE" dot — a live instrument doesn't blink.

## 6. Typography of engraved charts

**What the verified plates show:** [Dürer 1515](https://www.metmuseum.org/art/collection/search/358367) and [Cellarius 1660](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293) use capitals for regions, italics for figures, compact numerals for scales — two expressive roles plus one data role, never more.

**Font evaluation (both repos verified):**

- **Keep Instrument Serif.** Its [official repo](https://github.com/Instrument/instrument-serif) (OFL-1.1) describes a condensed display serif **"designed for large sizes"** — a contemporary old-style. That self-description is the license and the limit: wordmark, motto, at most one curved ring title. Never numerals, never small labels.
- **Keep IBM Plex Mono.** The [IBM/plex repo](https://github.com/IBM/plex) (OFL-1.1) confirms the Mono cut, UI-environment intent, and `@ibm/plex-mono` packaging. It is the observatory-instrument voice; do not pretend it's an engraving.
- Verdict: **keep the pair, add nothing.** If a future about-page needs a reading serif, EB Garamond (OFL) is the candidate — not on the instrument.
- Canvas note: curved text means per-glyph placement along an arc; letterspace small caps at 0.12–0.18em; await `document.fonts.ready` before caching any text geometry — canvas fallback metrics differ silently.

## 7. Dark-UI craft & accessibility

Thresholds (verified): [WCAG 2.2 SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) — **3:1 for graphical objects required to understand content**, with the explicit warning that *thin lines render fainter than nominal* and best practice is to avoid very thin strokes or exceed the ratio; [SC 1.4.3](https://www.w3.org/TR/WCAG22/) — 4.5:1 normal / 3:1 large text; 1.4.1 — never hue alone.

**My computed table** (sRGB composite over `#0E2440`, WCAG luminance; script-run, reproducible):

| Paint | Ratio | Reading |
|---|---:|---|
| `inkHi` 1.0 / .95 / .9 / .8 | 12.26 / 11.16 / 10.20 / 8.30 | primary geometry + text, safe |
| `inkHi` .55 / .45 | 4.70 / 3.59 | .55 = text-safe; .45 = non-text floor |
| `inkMid` 1.0 / .9 / .8 | 5.45 / 4.69 / 4.01 | full/.9 text-safe; .8 non-text only |
| `inkMid` .68 / .55 / .45 | 3.30 / 2.62 / 2.19 | **current hour ticks (.55) fail 3:1** |
| `inkLow` any alpha ≤1 | ≤2.11 | decorative only, forever |
| `sunlight` 1.0 / .12 | 8.30 / 1.24 | disc superb; day-arc wash decorative |
| `moonlight` 1.0 / .09 | 13.84 / 1.29 | moon superb; earthshine decorative (correct) |
| `night` band .55 | 1.04 | **zone tint is near-invisible** |
| `shadow` .72 | 1.10 | dark discs read as flat dark — fine |

Adjacencies I computed: moonlight↔shadow 15.17:1 (moon needs no outline); inkHi@.9 over the night band 9.82:1 (major ticks survive crossing night); field↔printDeep 1.17:1 (the vignette is subliminal — keep it that way).

**Findings beyond the earlier brief:**

1. **The night arc carries meaning at 1.04:1** (`dial.ts:38-42`) — and it's hue-only, a 1.4.1 problem too. Fix with *shape*, not more tint: short gold boundary markers at rise/set on the band (color belongs to the sky; gold at 8.30:1), and/or a dashed hairline tracing the night zone's inner edge.
2. **The gold day-arc (`sunlight@.12`, 1.24:1) dilutes the sun** — gold smeared across half the band competes with the one gold disc. Delete it; the sun disc is the day indicator. This also tightens DEC-008's "gold = the sun, only."

**Also required:** DOM transcript of instrument state (time, rise/set, moon phase/position, sidereal time, location) adjacent to the canvas; keyboard-focusable controls; high-contrast mode promoting meaningful `inkLow` strokes to `inkMid`; print mode = white paper, ink-black linework, sun/moon outlined + labeled (meaning survives monochrome), frozen timestamp in text, zero grain; reduced-motion per §5.

## 8. Competitive / adjacent landscape (geometry only, never surfaces)

| Product | Steal (composition/geometry) | Avoid (verified failure mode) |
|---|---|---|
| [Emerald Observatory manual](https://emeraldsequoia.com/eo/EmeraldObservatory-Manual.pdf) + local `Classes/` spec | Causal coupling: every display derives from one astronomical state — the deep consistency worth porting | The original scatters attention across many small equal-status dials (ASSESSMENT.md concurs) |
| [Emerald Chronometer — App Store](https://apps.apple.com/us/app/emerald-chronometer/id284953670) | "Correct shape and orientation of the Moon in all phases **but still using a mechanical display**" — phase truth without photography | 16 watches / 27 faces (its own listing) — mode accumulation; one face must suffice |
| [Cosmic Watch — App Store](https://apps.apple.com/us/app/cosmic-watch/id971231853) | "The Earth is the clock": explicit reference frames (sky / earth / solar-system views) | Its version history is a feature-accretion log (astrology mode, Dreamspell calendar, retrogrades…) — layers on layers until the time is hard to see |
| [Apple Watch Astronomy / Solar Dial — Apple Support](https://support.apple.com/guide/watch/faces-and-features-apde9218b440/watchos) | Crown-scrubbed time travel through a fixed frame; Solar Dial's 24h sun-tracking circle | "Continuously updating **3D model**" — photoreal spectacle, the anti-reference |
| [Stellarium Web](https://stellarium-web.org/) | Vector-driven sky geometry in a browser, layer toggles | Planetarium label density over glowing sky = the cyan sci-fi look we're explicitly not |
| [timeanddate Astronomy](https://www.timeanddate.com/astronomy/) | Textual redundancy of everything graphical; day/night world map | Table-first hierarchy — the astronomical relationship disappears into rows |
| [Long Now 10,000-Year Clock](https://longnow.org/clock/) | "Go slow" as a published design principle; correctness-on-demand over display-motion | (Nothing to avoid; it's the aspiration) |

**Positioning:** the open niche is a *printed-feeling, single-frame* instrument. Everyone else picked mechanical skeuomorphism, glowing planetarium, photoreal globe, or dashboard. Our defensible geometry: one civil-day chapter ring, real bodies tied to it, a terrestrial center explaining day/night.

## Prioritized top 10 (costed)

1. **Kill the sun glow** — delete the radial gradient, `sun.ts:30-36`; keep the .03R disc + 1px inkHi keyline. The glow is the single most "planetarium" element on the face. **S**
2. **Fix tick cadence** — `dial.ts:58-66`: majors full band 1.4px, hours half band 1.0px `inkMid@.9` (4.69:1, was 2.62), add 20-min hairlines quarter band 0.75px `inkLow`. Current major:minor length ratio 1.1:1 → make it ≥2:1. **S**
3. **Mark rise/set with shape, not tint** — gold ticks at rise/set on the band; delete the 1.24:1 gold day-arc and either delete the 1.04:1 night arc or edge it with a dashed hairline. Solves a 1.4.1 hue-only failure on-brand. **S**
4. **Un-outline the moon** — remove `inkHi` ring at `moon.ts:62-67` (15.17:1 internal adjacency makes it redundant); break the `.72R` orbit line behind the disc. **S**
5. **Numerals to `inkHi@.9`** — `dial.ts:69`: 4.69→10.2:1 for the only on-canvas text; protects thin 300-weight glyphs from the antialias penalty WCAG warns about. **S**
6. **Truthful Earth graticule** — equator + tropics at ±23.4° + 2–3 weighted meridians; crisp analytic terminator from subsolar geometry, flat night fill, no softener ellipse (`earth.ts`). **M**
7. **Generated print grain** — seeded 128² noise tile, ≤1.5% opacity, static; exposure ramp ≤2.5%. Budget from my Atkins measurement: aggregate <4%. Regenerate on resize only. **M**
8. **Freeze-time control + reduced-motion mode** — WCAG 2.2.2 pattern: pause → resume jumps to *now*; `prefers-reduced-motion` → 60s cadence, zero transitions. **M**
9. **DOM transcript + high-contrast mode** — every canvas reading mirrored as text; HC promotes `inkLow`→`inkMid`. Largest piece, highest inclusivity payoff. **L**
10. **One curved serif line** — motto or ring title in tracked Instrument Serif small caps on an arc, after `document.fonts.ready`; everything else stays mono. **M**

## Five images to keep open

1. [Rasulid astrolabe — Met 444408](https://www.metmuseum.org/art/collection/search/444408) — the 0.13R limb / open rete / 0.81R content ratio, measured.
2. [Mirror clock — Met 17.190.639](https://www.metmuseum.org/art/collection/search/193609) — 4+ rings without clutter; thin minute band outermost.
3. [Atkins, Part X — Met 291537](https://www.metmuseum.org/art/collection/search/291537) — the 3.5% tonal budget, visible.
4. [Forfaict clock-watch — Met 17.190.1607](https://www.metmuseum.org/art/collection/search/194195) — aperture moon at 5.4 cm scale; small-disc discipline.
5. [Cellarius Ptolemaic plate — Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293) — broad band + double rules + calm center.

## Limitations & validation plan

- Photo-derived ratios (astrolabe limb 0.129R) come from a single scanline heuristic on a 467px web image; treat as ±0.02R design-study values. The 0.81 rete/case ratio is museum-documented, not estimated.
- Atkins measurements are from a museum scan (lighting, JPEG, digital surrogate) — use them as order-of-magnitude texture budgets, not colorimetry.
- Contrast table assumes sRGB compositing over flat `#0E2440`; verify rendered pixels at DPR 1/2/3 — hairlines underperform token math.
- Wikipedia is used once (Orloj), flagged tertiary; its astronomical-dial section itself carries a "needs citations" banner — I extracted only structural facts (ring inventory, pointer logic), no measurements.
- Before adopting: render A/B snapshots at R=240/400/600, portrait + landscape, and run a 1-second glance test — civil time, sun, moon phase, day/night, sidereal, in that order.
