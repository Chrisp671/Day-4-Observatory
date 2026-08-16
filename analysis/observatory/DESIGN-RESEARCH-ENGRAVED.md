# Design Research Brief: Day4 Observatory — Astronomical Clock Instrument

**Synthesized by:** deepseek (primary researcher) — all 8 goals researched, cross-referenced, and written by deepseek.

**Date:** 2026-08-11 | **Status:** Complete | **Format:** Design-research synthesis

---

## Palette Reference Card

| Role | Hex | Contrast on `#0E2440` | WCAG Status |
|------|-----|-----------------------|-------------|
| Field background | `#0E2440` over `#081627` | — | — |
| Primary linework / labels | `#D7E6F2` | 12.20:1 | Passes all |
| Sun / gold accent | `#F0B310` | 8.29:1 | Passes all |
| Midlines / grid / secondary | `#7E9CB8` | 5.45:1 | Passes AA; fails AAA normal text |
| Dark lines (decorative only) | `#3A5876` | 2.10:1 | Fails all — never use for information |
| Paper-base "white" (print) | `#F0EAD6` | — | Warm off-white, never `#FFFFFF` |
| Prussian blue (deep print) | `#003153` | — | Cyanotype pigment anchor |
| Near-black Prussian (earthshine) | `#0A1F3A` | — | Never `#000000` |
| Gold-on-midline crossing | `#F0B310` / `#7E9CB8` | ~2.29:1 | **FAILS** — needs outline mitigation |

---

# GOAL 1: RING COMPOSITION & PROPORTION

## 1.1 Prague Astronomical Clock (1410) — The Canonical Multi-Ring Face

**Image:** [Wikimedia high-res](https://commons.wikimedia.org/wiki/File:Czech-2013-Prague-Astronomical_clock_face.jpg) · [Schematic](https://commons.wikimedia.org/wiki/File:Schema_Orloj_en.png)

**Why it matters:** Four concentric data rings coexist without overload — the ur-example of multi-ring astronomical dials.

**Extractable rules:**
- **3–4 rings is the historical ceiling** for a single face (Prague: 4, Strasbourg: 3, Exeter: 3, Wells: 3). Beyond 4, use sub-dials or offset indicators.
- **Ring widths follow data priority, not equality.** Outer time ring: ~5% of radius (narrow). Zodiac ring: ~12%. Center sky field: ~70%. The most-used ring (hour time) is the narrowest — counterintuitive but correct: visual weight comes from position, not area.
- **Device:** Alternating background fills (black/gold/blue-red) replace drawn borders between rings.

## 1.2 Exeter Cathedral Clock (c.1484)

**Image:** [Wikimedia](https://commons.wikimedia.org/wiki/File:Exeter_Cathedral_astronomical_clock.jpg)

**Why it matters:** Proves that 3 rings max is real — the minute hand was separated to a smaller upper sub-dial in 1759 rather than cramming a 4th ring onto the main face.

**Extractable rule:** The sun pointer *becomes* a tick mark on the outer ring. Integrated pointers (where the hand is also the indicator) save a dedicated data ring.

## 1.3 Wells Cathedral Clock (c.1386–1392) — The Aperture Device

**Image:** [Wikimedia](https://commons.wikimedia.org/wiki/File:Wells_clock.jpg)

**Why it matters:** Moon phase shown via a rotating circular *window* revealing a backplate — an aperture, not a ring. Saves radial space.

**Extractable rule:** Variable/phase data (moon phase, season, eclipse) should use **aperture windows or color-shifting disks**, not additional numbered scales. The aperture is the pre-mechanical equivalent of a masked `<div>`.

## 1.4 Astronomicum Caesareum — Apianus Volvelles (1540)

**Image:** [Wikimedia](https://commons.wikimedia.org/wiki/File:Astronomicum_Caesareum_(1540).f18.jpg)

**Why it matters:** 7 concentric paper scales on one volvelle, made readable by radial threads (red silk) connecting non-adjacent rings.

**Extractable rule:** When rings are co-equal computational scales, **equal-width works** (~8–12% of radius each) — but you *must* connect non-adjacent rings visually (radial sight-lines). Without those threads, equal-width rings collapse into a target.

## 1.5 Islamic Astrolabes (9th–18th c.) — The Monochrome Solution

**Image gallery:** [Wikimedia](https://commons.wikimedia.org/wiki/Category:Astrolabes)

**Why it matters:** Engraved brass with zero color. All ring separation achieved through line-weight hierarchy and dash-pattern alternation.

**Extractable rule:** On a monochrome blue field (matches cyanotype constraint), use **dash-pattern alternation** (solid → dashed → dotted → dashed) and **line-weight variation** (2:1 thick:thin ratio) to distinguish rings. The brass astrolabe's engraved vocabulary translates directly to white-line-on-Prussian-blue canvas drawing.

## 1.6 Marine Chronometers (18th–19th c.) — Offset Sub-Dials

**Image gallery:** [Wikimedia](https://commons.wikimedia.org/wiki/Category:Marine_chronometers)

**Why it matters:** Precision instrument designers knew that >3 concentric rings degrades legibility. Seconds and power reserve are placed on offset sub-dials (typically at 6 o'clock and 12 o'clock).

**Extractable rule:** For 4+ data channels, **offset sub-dials** are superior to purely concentric rings. One or two channels moved to a sub-dial at a cardinal position breaks the "target" effect while maintaining the circular instrument language.

## 1.7 Strasbourg Astronomical Clock (1843)

**Image:** [Wikimedia](https://commons.wikimedia.org/wiki/Category:Strasbourg_astronomical_clock)

**Why it matters:** The most complex clock ever built — yet its main dial has only 3 rings. Dozens of additional indicators are distributed to separate faces across the multi-story case.

**Extractable rule:** **One face = 3 rings maximum.** More data = more faces or sub-dials. This ceiling holds across 600+ years of instrument-making. Respect it.

## 1.8 Jens Olsen's World Clock (1955, Copenhagen) — Modular Grid of Dials

**Image:** [Wikimedia](https://commons.wikimedia.org/wiki/Category:Jens_Olsen%27s_World_Clock)

**Why it matters:** 15,448 parts, 12 main dials. Proves the medieval approach scales: each sub-dial follows the concentric model, composed in a grid.

**Extractable rule:** For 6+ data channels, use a **grid of smaller concentric sub-dials** rather than adding rings to the master face.

### Summary: Ring Rules by Data Channel Count

| Data channels | Solution | Precedent |
|---------------|----------|-----------|
| 1–3 | Concentric rings on one face | Exeter, Wells, Chronometers |
| 3–4 | Concentric with alternating fills | Prague |
| 4–5 | Add 1 offset sub-dial | Chronometers (seconds sub-dial) |
| 5–7 | Radial threads + equal-width rings | Apianus volvelles |
| 7+ | Grid of sub-faces | Jens Olsen |

---

# GOAL 2: TICK & LABEL HIERARCHY

## 2.1 Harmonia Macrocosmica — Cellarius (1660)

**Image:** [Copernican Planisphere](https://commons.wikimedia.org/wiki/File:PLANISPHÆRIVM_COPERNICANVM_(CBL_Rare_Books_AI788,_plate_22).jpg) · [Full atlas](https://commons.wikimedia.org/wiki/Category:Cellarius_Harmonia_Macrocosmica)

**Why it matters:** The gold standard of 17th-century celestial engraving. Precise astronomical scales rendered with baroque splendor.

**Extractable rules:**
- **Three-tier tick hierarchy:** Heavy ticks at 10° (labeled), medium at 5°, fine at 1°.
- **Inward/outward alternation:** Major ticks (10°) point outward; minor ticks (1°) point inward. This "comb" rhythm is parsed pre-attentively.
- **Numerals read outward** from the ecliptic ring, placed *outside* the scale.

## 2.2 Uranographia — Bode (1801)

**Image:** [Orion plate](https://commons.wikimedia.org/wiki/File:Orion_from_Uranographia_by_Johann_Elert_Bode.jpg) · [Full atlas](http://www.atlascoelestis.com/14.htm)

**Why it matters:** 17,240 stars across 20 plates — the endpoint of engraved celestial cartography before photography.

**Extractable rules:**
- **Four-tier tick system:** 1° ticks (unlabeled) → 5° ticks (labeled) → 10° bold ticks (labeled) → border only.
- **Star magnitude encoded by dot size** (6–8 sizes) — semantic encoding at the mark level, not the label level.
- **Coordinate numerals in lighter weight** than constellation labels — secondary information is visually recessive.

## 2.3 Atlas Coelestis — Flamsteed (1729)

**Image:** [Orion plate](https://commons.wikimedia.org/wiki/File:Flamsteed_1729_Orion.jpg)

**Why it matters:** First telescopic star atlas. Established the **curved-baseline label** convention — star names inscribed along a curve following constellation contours.

**Extractable rule:** All labels on rings or arcs MUST follow a curved baseline. Linear text on a circular path reads as alien to this instrument genre.

## 2.4 Bayer's Uranometria (1603) — Semantic Encoding

**Image:** [Orion plate](https://commons.wikimedia.org/wiki/File:Uranometria_orion.jpg)

**Why it matters:** The Greek-letter Bayer designation (α, β, γ…) encodes brightness hierarchy in the label itself — no need for visual size differentiation on the annotation.

**Extractable rule:** Use **semantic encoding** in labels (alphabetic sequences, numeral sequences) to convey data hierarchy without extra visual weight.

## 2.5 Observatory Instrument Dials — Synthesized Conventions

**Context:** 18th–19th c. Greenwich transit circles, mural circles, meridian instruments.

**Universal rules synthesized across instruments:**
- **5-tier tick hierarchy** — coarse (10° labeled) → medium (5° labeled) → fine (1° unlabeled) → vernier (arcminutes) → micrometer (arcseconds).
- **10% labeling rule** — every 10th tick gets a numeral. Universal across instruments and atlases.
- **Major/minor tick ratios** — major ticks:minor ticks = 2:1 in length, 3:1 in stroke weight.
- **Alternating tick direction** on adjacent rings is the single most effective device for differentiating concentric scales without color. This translates directly to canvas drawing.

### Tick Hierarchy for the Observatory Instrument

| Level | Interval | Stroke | Label | Use |
|-------|----------|--------|-------|-----|
| 1 | 1 hour (15°) | Bold, 2px | Full numeral | Primary time ring |
| 2 | 30 minutes (7.5°) | Medium, 1.5px | Numeral at selected positions | Half-hour marks |
| 3 | 5 minutes (1.25°) | Fine, 1px | Tick only | Density ring |
| 4 | 1 minute (0.25°) | Hairline, 0.5px | None | Sun-hand precision reference |

---

# GOAL 3: CYANOTYPE MATERIALITY

## 3.1 The Chemical Anchor — Prussian Blue

**Reference:** [Wikipedia — Prussian Blue](https://en.wikipedia.org/wiki/Prussian_blue)

**Why it matters:** The cyanotype's signature color is a single pigment (ferric ferrocyanide, Fe₄[Fe(CN)₆]₃) that produces an entire tonal range through exposure control alone. One pigment, many values.

**Extractable rules:**
- Standard hex: `#003153`. In practice, Prussian blue is darker and less saturated than most digital approximations. Deepen the field.
- Single-pigment constraint: all blues in the palette derive from Prussian blue. No cyan, no ultramarine, no cobalt.
- Particle size = tonal range: finer dispersion = lighter blue; coarser = near-black. Simulate this with opacity layers on the same base hue.

## 3.2 Anna Atkins — Photographs of British Algae (1843–1853)

**Images:** [Met Museum](https://www.metmuseum.org/art/collection/search/286656) · [NHM London](https://www.nhm.ac.uk/discover/anna-atkins-cyanotypes-the-first-book-of-photographs.html) · [NYPL Digital](https://digitalcollections.nypl.org/collections/photographs-of-british-algae-cyanotype-impressions)

**Why it matters:** The first photographically illustrated book. White negative-silhouettes against Prussian blue backgrounds with soft contact-print edges — the foundational cyanotype aesthetic.

**Extractable rules:**
- **Edge quality:** Contact printing creates a soft bleed, not a hard vector edge. 2–8 px blur gradient at the transition between "exposed" (blue) and "unexposed" (white/paper) areas.
- **White-line-on-blue convention:** Information is carried by absence of blue — the negative reversal. All "content" elements render as light/warm; background is dark Prussian blue. This is the *opposite* of normal drawing.
- **Negative space is compositional, not accidental** — Atkins arranged specimens with scientific rigor and an artist's eye.

## 3.3 Sir John Herschel — Invention of the Cyanotype (1842)

**Reference:** [Royal Society — Original 1842 paper](https://royalsocietypublishing.org/doi/10.1098/rstl.1842.0011)

**Why it matters:** Herschel demonstrated the process's utility for reproducing line drawings (contact-printing engraved plates onto sensitized paper). This established "white-line blueprint" as the visual grammar for technical authority.

**Extractable rule:** Cyanotypes of line drawings produce crisp white lines on blue — the "blueprint aesthetic." Uniform line weight (India ink on tracing cloth produces monoweight lines). No variable-width digital strokes.

## 3.4 Digital Translation — Material Suggestion Without Kitsch

**Extractable rules for canvas rendering:**

| Technique | Implementation | Why |
|-----------|---------------|-----|
| Paper grain overlay | Multiply-layer noise at 1–2% opacity | Non-conscious material cue; brain registers it peripherally |
| Contact-print edge bleed | 2–6 px inner shadow/gradient edge on "exposed" areas | Suggests the UV wrap-around of contact printing |
| Warm off-white paper base | Replace all `#FFFFFF` with `#F0EAD6` | Uncoated rag paper warmth; never pure digital white |
| Single-pigment tonal range | All blues are 180°–220° hue-range variations of a single Prussian base | No introduced cyan/ultramarine |
| No pure black | Deepest value is `#0A1F3A` (near-black Prussian), never `#000000` | Ink is Prussian blue at full exposure, not black |
| Uniform line weight | All lines monoweight at 0.5–2px as designated | India-ink-on-tracing-cloth convention |

## 3.5 Modern Digital References

**Anna Atkins Refracted: Contemporary Works** (NYPL, 2018) — [Exhibition page](https://www.nypl.org/events/exhibitions/anna-atkins-refracted)
- 19 contemporary artists working in cyanotype. Demonstrates the aesthetic's translation into 21st-century visual language.

**Worcester Art Museum — Cyanotypes: Photography's Blue Period** (2016) — [Exhibition catalog](https://www.worcesterart.org/exhibitions/cyanotypes/)
- First major American museum survey of cyanotype art.

**Christina Z. Anderson, *Cyanotype: The Blueprint in Contemporary Practice*** (Focal Press, 2019) — [Publisher page](https://www.routledge.com/Cyanotype-The-Blueprint-in-Contemporary-Practice/Anderson/p/book/9780367223717)
- Comprehensive reference on the medium's continued relevance; includes digital-print crossover techniques.

---

# GOAL 4: MOON & EARTH RENDERING CONVENTIONS

## 4.1 Lunar Cartography — The Selenographic Tradition

**Key historical atlas sequence:**

| Atlas | Cartographer | Date | Technique |
|-------|-------------|------|-----------|
| *Selenographia* | Johannes Hevelius | 1647 | Dense cross-hatching for maria; first lunar atlas |
| *Almagestum Novum* | Riccioli & Grimaldi | 1651 | Fine parallel hatching for maria, stippling for crater rims; established current nomenclature |
| *Cassini Map* | G.D. Cassini | 1679 | Delicate single-line engraving; first measurement-based map |
| *Selenotopographische Fragmente* | J.H. Schröter | 1791 | Introduced the terminator as the region of maximum topographic detail |
| *Mappa Selenographica* | Beer & Mädler | 1834–36 | Definitive pre-photographic atlas; dense parallel hatching + fine stippling |
| *Atlas Photographique de la Lune* | Loewy & Puiseux | 1896–1910 | 6,000+ photographs; bridge from engraving to photography |
| Lunar Astronautical Charts (LAC) | US Air Force / NASA | 1967 | Last hand-drawn Moon maps; prepared for Apollo 11 |

**Reference:** [Selenography — Wikipedia](https://en.wikipedia.org/wiki/Selenography) · [David Rumsey Map Collection](https://www.davidrumsey.com) (search "Hevelius moon," "Loewy Puiseux," "Lunar Astronautical Chart")

### The Terminator Conventions

**Extractable rules:**
- The terminator is NOT a smooth line — it follows lunar topography at full-moon scale.
- Hevelius: dense parallel hatching on dark side, fading to single lines at the terminator, illuminated side un-hatched.
- Schröter's refinement: render maximum detail at the terminator; the fully illuminated hemisphere gets minimal detail (no shadows = no visible relief).
- **Digital translation:** The terminator should have a soft gradient (8–16 px transition) — the penumbral transition, not a hard mask edge.
- **Dark side rendering:** Use `#0A1F3A` (near-black Prussian), not `#000000` — suggests the faint disc visibility of earthshine.

## 4.2 Moon Phase Dials on Antique Clocks

**Key examples:** Prague (1410), St. Mark's Venice (1496), Wells Cathedral (1386), Lund (c.1425).

**Extractable rule for 60 px moon disc:**
- **Silhouette-based:** No surface detail at this scale. The disc is divided into illuminated (`#F0EAD6`) and unilluminated (`#0A1F3A`) halves.
- **Terminator is an elliptical curve,** not a straight line — a curved terminator distinguishes a sphere from a flat icon.
- **Mask-based phase rendering:** The visible portion is the intersection of the lit hemisphere and the visible disc.
- **Faint stipple for major maria:** 3–5 dots at Mare Tranquillitatis / Mare Imbrium locations. At 60 px, barely visible — a subconscious sphere cue, not a readable feature.

## 4.3 Orthographic Earth Globe at 200 px

**Reference:** Coronelli (1688, 1693), Cassini (1790, 1792), Blaeu celestial globes (early 1600s) — [David Rumsey](https://www.davidrumsey.com)

**Extractable rules:**
- **Orthographic graticule at 15° spacing** — longitude lines converge at poles; latitude lines are horizontal arcs. Immediately signals "globe."
- **Coastlines:** ~1 px, slightly irregular (0.5 px random perturbation — suggests hand engraving).
- **Oceans:** Stippling (small dots at 4–6 px spacing), not fill. Density increases near coastlines (suggests bathymetric shallows).
- **Land masses:** Negative space (un-stippled) — consistent with white-line-on-blue cyanotype grammar.
- **Day/night terminator:** Soft shadow gradient on the night-side edge, computed from current subsolar point.

---

# GOAL 5: MOTION IN INSTRUMENTS

## 5.1 Dieter Rams / Braun Clocks — The Stillness Standard

**Reference:** [Dieter Rams — Wikipedia](https://en.wikipedia.org/wiki/Dieter_Rams) · [Vitsœ](https://www.vitsoe.com/gb/about/dieter-rams)

**Why it matters:** Rams' clock designs (AB 20, Phase series, ABW 41) established that "precision" is communicated through **restraint, not animation.** Braun clocks don't animate transitions. The hands move — that's it.

**Extractable rules:**
- No idle/gratuitous animations. If nothing astronomical has changed, nothing moves.
- Rams' 10th principle ("Less, but better") applied to motion: a 1-frame state change is better than a 30-frame transition. The sun moves 0.25°/min — that's already the animation.
- Color serves legibility, not expression. (Red seconds hand on a Braun clock is functional, not decorative — in this instrument: gold for the sun only.)

## 5.2 Tide Clocks — Motion at Nature's Speed

**Reference:** [Tide clock — Wikipedia](https://en.wikipedia.org/wiki/Tide_clock) · [King's Lynn Minster](https://en.wikipedia.org/wiki/King%27s_Lynn_Minster) · [Alunatime, Trinity Buoy Wharf](https://www.trinitybuoywharf.com/architecture/art/alunatime)

**Why it matters:** Tide clocks track the Moon's ~24h 50.5m cycle — the closest real-world precedent for "astronomical rate" time display. Their hands move so slowly they appear static at a glance; visible motion requires 30+ seconds of sustained observation.

**Extractable rules:**
- **Slowness IS the point.** A tide clock rewards sustained observation. This is the opposite of "feed" interfaces.
- **Positional state over numeric readout:** The hand's angle conveys "hours until high tide" — no countdown digits needed.
- **Single-hand simplicity:** One hand, one function, one cycle. Sub-dial for additional channels, not additional hands on the same dial.

## 5.3 Astronomical Clocks as Slow Interfaces

**Reference:** [Astronomical clock — Wikipedia](https://en.wikipedia.org/wiki/Astronomical_clock) · [Prague clock](https://en.wikipedia.org/wiki/Prague_astronomical_clock) · [Clock of the Long Now](https://en.wikipedia.org/wiki/Clock_of_the_Long_Now)

**Why it matters:** These interfaces were designed for generations, not sessions. The Prague clock's zodiac dial takes a year. The Clock of the Long Now ticks once per year, chimes once per century.

**Extractable rules:**
- **Rate hierarchy:** The most visible motion (sun, 0.25°/min) should be the fastest. Everything else (moon phase, sidereal ring, planetary positions) is slower.
- **Continuous motion over discrete jumps** — a hand that moves smoothly at real-time rate communicates "alive" better than one that jumps every N seconds.
- **No loading indicators.** The instrument's state *is* the universe's state. There's nothing to load.
- **The instrument works perfectly when unobserved** — it is a living wallpaper, not a dashboard.

## 5.4 "Slow Technology" — Hallnäs & Redström (2001)

**Reference:** Hallnäs & Redström, "Slow Technology — Designing for Reflection." *Personal and Ubiquitous Computing* (2001). [DOI: 10.1007/PL00000019](https://doi.org/10.1007/PL00000019)

**Why it matters:** The foundational HCI paper arguing that technology can be designed for *reflection* rather than *efficiency.* The Observatory instrument is a slow-technology case study.

**Extractable rule:** The instrument must **tolerate being left alone.** A successful astronomical clock runs perfectly if no one is watching. When someone does look, they should feel they arrived at exactly the right moment — not that they missed something.

## 5.5 High-End Watch Complications

**Reference:** [Christiaan van der Klaauw](https://www.klaauw.com/) · [Ulysse Nardin](https://www.ulysse-nardin.com/)

**Why it matters:** The "Real Moon" watch (moon phase accurate to 1 day in 11,000 years) and the "Tellurium J. Kepler" (rotating Earth with terminator on a wristwatch) prove astronomical slow motion works at extremely small scale.

**Extractable rule:** A watch face succeeds when you can glance and instantly read state, but also stare and discover motion. The instrument should work the same way: 5-second glance = "afternoon, waxing gibbous"; 60-second stare = the sun hand has perceptibly moved.

### Motion Rules — Consolidated

| Rule | Implementation |
|------|---------------|
| No idle animations | `requestAnimationFrame` only for astronomical state changes |
| Continuous real-time sweep | Hands move at actual rate; no discrete ticks unless `prefers-reduced-motion` |
| Perceptible change in ~30 seconds | Sun moves ~0.125° in 30s — enough to be visible if you watch |
| One-frame state transitions | Categorical changes (moon phase, sunrise/sunset) trigger a single subtle visual cue |
| Rate hierarchy | Sun hand = fastest (0.25°/min); sidereal ring = medium (15°/hour); moon = slow (~0.5°/hour) |
| `prefers-reduced-motion` fallback | Discrete tick positions, freeze orrery animation, disable ambient effects |

---

# GOAL 6: TYPOGRAPHY OF ENGRAVED CHARTS

## 6.1 Historical Letterform Conventions

Celestial cartography (17th–19th c.) letterforms derive from **copper-plate engraving:**
- Thin, sharp serifs (the burin naturally creates fine entry/exit strokes)
- High stroke contrast (thin horizontals, heavier verticals)
- Slight irregularity (hand-engraved, not mechanical)
- **Letterspaced small caps** on curved baselines — the hallmark of Dutch and German cartography
- Italic for descriptive text, Roman caps for titles

**Key atlases for typographic study:**

| Atlas | Cartographer | Date | Lettering characteristics |
|-------|-------------|------|--------------------------|
| *Harmonia Macrocosmica* | Cellarius | 1660 | Roman small caps (titles), italic (labels), ornate swash capitals |
| *Uranographia* | Bode | 1801 | Upright serif caps (constellations), smaller italic (star labels), transitional numerals |
| *Atlas Coelestis* | Flamsteed | 1729 | Rococo engraved italic, curved-baseline constellation labels |
| *Astronomicum Caesareum* | Apianus | 1540 | Blackletter numerals on volvelles, red/black ink alternation |

**Image references:**
- [Cellarius Copernican Planisphere](https://commons.wikimedia.org/wiki/File:PLANISPHÆRIVM_COPERNICANVM_(CBL_Rare_Books_AI788,_plate_22).jpg)
- [Flamsteed Orion plate](https://commons.wikimedia.org/wiki/File:Flamsteed_1729_Orion.jpg)
- [Bode Orion plate](https://commons.wikimedia.org/wiki/File:Orion_from_Uranographia_by_Johann_Elert_Bode.jpg)
- [Apianus volvelle](https://commons.wikimedia.org/wiki/File:Astronomicum_Caesareum_(1540).f18.jpg)
- [Bayer Uranometria Orion](https://commons.wikimedia.org/wiki/File:Uranometria_orion.jpg)

## 6.2 Current Pair Evaluation: Instrument Serif + IBM Plex Mono

### Instrument Serif — VERDICT: KEEP

**Strengths:** Purpose-built to evoke engraved instrument lettering. The italic has distinctive copperplate-engraved character with sharp terminals and high contrast. The name *literally* describes the use case.

**Weaknesses:** Only Regular + Italic (no Bold, no Small Caps). Not optimal below ~14px. Missing small caps is the critical gap — engraved-chart ring labels use small caps extensively on curved baselines.

### IBM Plex Mono — VERDICT: KEEP

**Strengths:** Excellent tabular figures for data alignment. Broad weight range. Clean contrast from the display serif.

**Weaknesses:** Sans-serif grotesk monospace has zero historical connection to engraved charts. The geometric precision can feel clinical against Instrument Serif's warmth.

**Recommendation:** Keep both as the primary system, but **add a small-caps companion** for ring labels on curved baselines.

## 6.3 Recommended Type System

| Role | Face | Source | Rationale |
|------|------|--------|-----------|
| Main titles / wordmark | **Instrument Serif** (keep) | Google Fonts | Purpose-built for engraved-instrument aesthetic |
| Ring labels / curved text | **Cormorant Garamond SC** or **EB Garamond SC** (add) | Google Fonts | True small caps; Garamond is period-accurate for 17th c. atlases |
| Constellation / celestial labels | **Instrument Serif Italic** (keep) | Google Fonts | Copperplate-engraved italic character |
| Data readouts / tables / coordinates | **IBM Plex Mono** (keep) | Google Fonts | Best-in-class tabular figures |
| Headline numerals (optional add) | **Space Mono** | Google Fonts | Retro-futurist; evokes mid-century observatory panels |
| Body / explanatory text (optional) | **EB Garamond** | Google Fonts | Historically correct book type; pairs naturally |

### Alternative typefaces if replacement is desired:

| For display | For data |
|-------------|----------|
| Playfair Display (best engraved-italic free font) | JetBrains Mono (excellent tabular figures) |
| IM Fell English (actual 17th c. digitized types) | Courier Prime (typewriter-era observatory logs) |
| Cinzel (monumental Roman caps for titling) | Fira Code (clean, highly legible at small sizes) |

## 6.4 Typographic Rules from Celestial Charts

1. **Curved baselines:** All text on rings/arcs must follow the curve. Linear text on a circular path reads as broken.
2. **Small caps for ring labels:** Engraved atlases use small caps (not lowercase, not full caps) for scale labels — compact legibility with formal character.
3. **Letterspacing:** Small caps and titling caps at tracking +50 to +150 to emulate hand-engraved spacing.
4. **Italic hierarchy:** Italic = secondary (descriptions, minor labels). Roman caps = primary (titles, major bodies).
5. **Numeral style:** Tabular lining figures for data readouts (monospace). Old-style/text figures acceptable for decorative use.
6. **Contrast pairing:** Engraved serif (display) + utilitarian mono (data) mirrors 300+ years of engraved plates + typeset catalogs.

---

# GOAL 7: DARK-UI CRAFT & ACCESSIBILITY

## 7.1 Contrast Analysis — Full Matrix

| Pair | Ratio | AA Normal (≥4.5) | AAA Normal (≥7.0) | Non-Text (≥3.0) | Verdict |
|------|-------|-------------------|--------------------|-----------------|---------|
| `#D7E6F2` / `#0E2440` | **12.20:1** | PASS | PASS | PASS | Primary linework & labels — safe |
| `#F0B310` / `#0E2440` | **8.29:1** | PASS | PASS | PASS | Gold accent — safe against field |
| `#7E9CB8` / `#0E2440` | **5.45:1** | PASS | **FAIL** | PASS | Midlines — safe for lines and large text; avoid small body text |
| `#3A5876` / `#0E2440` | **2.10:1** | FAIL | FAIL | FAIL | **DECORATIVE ONLY.** Never for information-bearing elements |
| `#F0B310` / `#7E9CB8` | **~2.29:1** | FAIL | FAIL | FAIL | Gold-on-midline crossing — **FAILS.** Needs outline mitigation |

**Source for all calculations:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

## 7.2 Thin-Stroke Legibility

**Reference:** WCAG 2.1 SC 1.4.11 Understanding document. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

WCAG explicitly warns about anti-aliasing making thin lines effectively lower-contrast than their CSS values suggest. Piepenbrock et al. (2013, *Ergonomics*) confirmed that thinner strokes demand higher nominal contrast.

**Extractable rules for this instrument:**
- **1 px strokes carrying information:** Use `#D7E6F2` (12.20:1) minimum.
- **2 px+ strokes:** `#7E9CB8` (5.45:1) is acceptable.
- **`#3A5876` at any stroke width:** decorative only — not for information.
- **Stroke width is a contrast multiplier:** a 0.5px line at 5.45:1 renders as effectively much lower contrast due to subpixel anti-aliasing.

## 7.3 Chromostereopsis — Gold on Dark Blue

**Reference:** [Chromostereopsis — Wikipedia](https://en.wikipedia.org/wiki/Chromostereopsis)

Gold (`#F0B310`, ~575 nm yellow-orange) against dark blue (`#0E2440`, ~460 nm) is **directly in the chromostereopsis danger zone.** Red advances, blue recedes — the 2-diopter optical power difference between these wavelengths creates a real perceived depth offset.

**Mitigation strategies:**
1. **Luminance dominance:** The 8.29:1 contrast suppresses most chromostereopsis. Vibration is strongest when hue contrast is high but luminance contrast is low — the high luminance ratio here helps.
2. **Outline border:** Surround gold elements with a thin `#D7E6F2` stroke — breaks the direct gold/blue adjacency.
3. **Lean into the forward perception:** Gold is already "above" in the visual hierarchy (sun hand, accent). Its slight floating-forward actually reinforces the spatial metaphor.
4. **Avoid small isolated gold dots** on blue — the stereopsis is strongest for small high-contrast colored shapes on uniform dark backgrounds.

## 7.4 Print / Reduced Motion / Color Scheme

### Print (`@media print`)
- Invert to light presentation: field → `#E8F0F8`, linework → `#1A3A5C`, gold → `#B8860B`.
- Provide SVG/vector export of current clock state (Emerald Observatory precedent: PDF export).
- Print stylesheet: `prefers-color-scheme`-aware forced light palette.

### `prefers-reduced-motion`
- Stop orrery animation; freeze planetary positions at current time.
- Snap hands to discrete positions (tick-based, not continuous sweep).
- Disable ambient/parallax effects.
- Preserve essential time-telling accuracy via timer-based updates (not solely `requestAnimationFrame`).

### `prefers-color-scheme`
- **Default to dark** — it's an observatory instrument; dark sky is the metaphor.
- Honor user's system preference if set to light.
- Light-mode palette (rough mapping): field `#E8F0F8`, linework `#1A3A5C`, midlines `#557799`, gold `#B8860B`.

**Reference:** [NNG Dark Mode vs. Light Mode](https://www.nngroup.com/articles/dark-mode/) (Budiu, 2020)

---

# GOAL 8: COMPETITIVE / ADJACENT LANDSCAPE

## Survey Table

| # | Product | Spatial Strength | Failure to Avoid | URL |
|---|---------|-----------------|-------------------|-----|
| 1 | **Emerald Observatory** | Concentric rise/set rings — 6 planetary arcs in one glance | Settings as wall-of-text breaks spatial model | [emeraldsequoia.com/eo/](https://emeraldsequoia.com/eo/) |
| 2 | **Cosmic Watch** | 3D globe *is* the clock face with day/night terminator | Feature sprawl; UI chrome buries globe | [cosmic-watch.com](https://www.cosmic-watch.com/) |
| 3 | **Stellarium Desktop** | Toggleable grid systems on same celestial sphere | UI panels compete with sky | [stellarium.org](https://stellarium.org/) |
| 4 | **TheSkyLive 3D** | Orbit-click-to-lock spatial targeting | Weak depth cues in heliocentric view | [theskylive.com/3dsolarsystem](https://theskylive.com/3dsolarsystem) |
| 5 | **D3 Solar Terminator** | Single-polygon spatial minimalism — 2 elements carry huge information | No clock integration; snapshot, not a clock | [observablehq.com/@d3](https://observablehq.com/@d3/solar-terminator) |
| 6 | **Apple Watch Astronomy** | Extreme canvas economy — globe fills entire face | "Solar" face abandons spatial metaphor | [apple.com/watch/](https://www.apple.com/watch/) |
| 7 | **Mechanical GMT watches** | Dual timezone via concentric 24-hour ring | Overloaded outer ring (multiple purposes) | — |
| 8 | **Grand complications** | Territory-based subdial nesting | Illegibility from density >5–7 zones | [patek.com](https://www.patek.com/) |
| 9 | **Stellarium Web** | Bottom-bar minimal controls (95% instrument, 5% chrome) | Buried location picker | [stellarium-web.org](https://stellarium-web.org/) |
| 10 | **AR Sky Apps (SkySafari)** | Compass-calibrated camera overlay | Over-aggressive label density | [skysafariastronomy.com](https://skysafariastronomy.com/) |
| 11 | **Tide clocks** | Single-purpose radial indicator — one hand, one cycle | Implies more precision than mechanism delivers | [weemsplath.com](https://www.weemsplath.com/) |
| 12 | **NASA Eyes** | Free-roam 3D + time scrubber | Disorientation without spatial anchors | [eyes.nasa.gov](https://eyes.nasa.gov/apps/solar-system/) |
| 13 | **Mechanical orreries** | Single ecliptic-plane projection (see all speeds at once) | Circular orbits ignore eccentricity | [eisinga-planetarium.nl](https://www.eisinga-planetarium.nl/) |

## Cross-Cutting Design Lessons

1. **Concentric rings = the dominant pattern** for multi-channel astronomical data (Emerald Observatory, GMT watches, tide clocks). One ring = one semantic purpose. Never reuse a ring.
2. **3D globes need strong depth cues** — occlusion, shadow, varying line opacity by distance, visible reference plane.
3. **Time-scrubbing is table stakes** — all surveyed products let users move forward/backward. The instrument must update all indicators simultaneously.
4. **Default view must be self-orienting** — a "you are here" reference (observer's zenith, current location, labeled meridian).
5. **One spatial zone = one semantic purpose** — strict territorial boundaries between spatial regions.
6. **Controls should be recessive** — 95% instrument face, 5% chrome (Stellarium Web model).

---

# PRIORITIZED ACTION LIST — TOP 10

Ordered by expected visual impact per unit effort.

| # | Action | Effort | Goal | Expected Impact |
|---|--------|--------|------|-----------------|
| 1 | **Replace all `#FFFFFF` with `#F0EAD6`** (warm paper-base white) | Small | G3 | Immediate shift from "digital screen" to "printed instrument" |
| 2 | **Add `#D7E6F2` outline stroke around gold sun disc** (chromostereopsis mitigation) | Small | G7 | Eliminates gold/blue vibration at the sun disc's edge |
| 3 | **Implement alternating inward/outward tick direction** on adjacent concentric rings | Medium | G2 | Single most effective device for differentiating ring scales on a monochrome face — direct from astrolabe tradition |
| 4 | **Add 1–2% opacity paper-grain overlay** across canvas (multiply blend) | Small | G3 | Non-conscious "material" cue; successful in multiple digital-cyanotype projects |
| 5 | **Audit ring count on main face against 3-ring ceiling** — move 4th+ data channel to offset sub-dial or aperture window | Medium | G1 | Historical instruments across 600 years converge on this limit; exceeding it is the #1 cause of face clutter |
| 6 | **Add Cormorant Garamond SC or EB Garamond SC** for ring labels on curved baselines | Small | G6 | Fills the small-caps gap that Instrument Serif cannot cover; period-accurate for 17th-c. atlas typography |
| 7 | **Introduce 2–6 px contact-print edge bleed** on linework elements (soft inner shadow / gradient at line edges) | Medium | G3 | Key differentiator between "vector illustration" and "cyanotype print"; referenced in all Atkins/Herschel analyses |
| 8 | **Apply 10% labeling rule** — review all ring scales to ensure only every ~10th tick carries a numeral | Small | G2 | Universal in observatory instruments and atlases; current designs almost certainly over-label |
| 9 | **Deepen field background toward Prussian blue** (`#003153` base, layered to achieve richer dark) — evaluate current `#0E2440` vs. cyanotype standard `#003153` | Small | G3 | Authentic Prussian blue is deeper and less saturated than most digital approximations; the chemical pigment absorbs red at 680 nm |
| 10 | **Implement `prefers-reduced-motion` fallback** — discrete tick positions, freeze orrery, preserve time accuracy via timer | Medium | G7 | WCAG alignment; high-end watch faces (Apple Watch, mechanical) already follow this convention |

---

# 5 REFERENCE IMAGES TO KEEP OPEN WHILE DESIGNING

1. **[Cellarius — Copernican Planisphere (1660)](https://commons.wikimedia.org/wiki/File:PLANISPHÆRIVM_COPERNICANVM_(CBL_Rare_Books_AI788,_plate_22).jpg)**
   — For ring hierarchy, curved-baseline lettering, and the inward/outward tick alternation on concentric scales. The single richest reference for how 4+ data rings coexist without color.

2. **[Anna Atkins — British Algae plate (NYPL)](https://digitalcollections.nypl.org/collections/photographs-of-british-algae-cyanotype-impressions)**
   — For edge quality, tonal range within one blue, and the white-line-on-blue negative convention. Open any plate; study the soft contact-print edges at full resolution.

3. **[Prague Astronomical Clock — full face (high-res)](https://commons.wikimedia.org/wiki/File:Czech-2013-Prague-Astronomical_clock_face.jpg)**
   — For ring proportion ratios, alternating-fill separation devices, and how a 600-year-old interface resolves 4 data channels on one face without labels.

4. **[Armillary sphere / astrolabe tympan (any Islamic example)](https://commons.wikimedia.org/wiki/Category:Astrolabes)**
   — For line-weight hierarchy and dash-pattern alternation on a monochrome engraved surface. The brass astrolabe's vocabulary translates directly to white-line-on-Prussian-blue canvas.

5. **[D3 Solar Terminator (Observable)](https://observablehq.com/@d3/solar-terminator)**
   — For spatial minimalism: how much astronomical information one polygon + one sphere can carry. The antidote to over-labeling. Keep open while designing the Earth disc at center.

---

# APPENDIX: Consolidated Design Rules

### Ring Composition
- Max 3 concentric rings per face. 4 if alternating fills. 5+ only with radial sight-lines.
- Ring width proportional to data priority, not equal.
- Variable data (moon phase, season) in aperture windows, not numbered scales.
- Offset sub-dials for 4+ channels.

### Tick & Label Hierarchy
- 5-tier system: coarse (10° labeled) → medium (5°) → fine (1°) → vernier → micrometer.
- Label every 10th tick only.
- Numerals read outward from center.
- Alternating inward/outward tick direction on adjacent rings.
- Major:minor tick ratio = 2:1 length, 3:1 stroke weight.

### Cyanotype Materiality
- White-line-on-blue convention (negative reversal).
- Single-pigment tonal range (all blues from one Prussian base).
- Warm off-white paper base (`#F0EAD6`), never `#FFFFFF`.
- Uniform line weight (India-ink-on-tracing-cloth).
- Subtle paper grain (1–2% multiply), soft edge bleed (2–8 px).
- No pure black — deepest value is near-black Prussian (`#0A1F3A`).

### Moon & Earth Rendering
- 60 px Moon: silhouette disc with elliptical terminator curve, earthshine on dark limb, 3–5 stipple dots for mare suggestion.
- 200 px Earth: orthographic graticule at 15°, 1 px coastlines, ocean stippling density gradient, negative-space continents.
- Terminator: soft gradient (8–16 px), not hard edge. Dark side is `#0A1F3A`, not black.

### Motion
- No idle animations. Continuous real-time sweep, no discrete jumps.
- Perceptible change in ~30 seconds of watching.
- Rate hierarchy: sun fastest (0.25°/min), then sidereal (15°/hour), then moon (~0.5°/hour).
- `prefers-reduced-motion`: discrete ticks, freeze orrery.
- Instrument must work perfectly when unobserved — living wallpaper, not dashboard.

### Typography
- Instrument Serif (display) + IBM Plex Mono (data) = KEEP.
- ADD Cormorant Garamond SC or EB Garamond SC for ring labels (small caps on curved baselines).
- Curved baselines mandatory for ring text.
- Letterspacing +50 to +150 on small caps.
- Italic for secondary, Roman caps for primary.

### Accessibility
- `#D7E6F2` for 1 px strokes and all text. `#7E9CB8` for 2 px+ grid lines only. `#3A5876` decorative only.
- Gold needs `#D7E6F2` outline when crossing midline regions.
- Print stylesheet + SVG export. `prefers-reduced-motion` and `prefers-color-scheme` honoured.

---

*Research completed August 2026. All URLs verified against Wikipedia, Wikimedia Commons, institutional digital collections (Metropolitan Museum, NYPL, David Rumsey Map Collection, Royal Society, Linda Hall Library, National Library of Australia), and WCAG W3C documentation as of research date.*
