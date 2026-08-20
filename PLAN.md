# Observatory Web Port — Plan

Canonical plan (plan-engineering format). This Markdown owns intent; any HTML cockpit is a regenerable projection; no tracker is configured yet.

## 1. Outcome and status

Revive Emerald Observatory as a modern, rebranded web app (TypeScript canvas UI, engine behind a stable seam), shipped to the public web and maintained. Pace: deliberate — every phase is also a learning vehicle for the owner (first TypeScript project, first multi-agent build). Status: **planning complete for v1 kickoff; visual mockup pending approval (QST-001).**

**Definition of done (v1):** the v1 scope (REQ-001..REQ-006) renders correctly against reference data (CHK-001..CHK-004), deployed at a public URL as an installable PWA, under a fresh visual identity and working name.

## 2. Evidence and context

- `analysis/observatory/ASSESSMENT.md` — full modernization assessment (2026-08-06): inventory, architecture, debt, security, Rebuild recommendation.
- `analysis/observatory/CALIBRATION.md` — 7-model delegation calibration with ground-truth scoring; team recorded in `opencode.json`.
- Source of behavioral truth: the Objective-C++ sources in `Classes/` (esp. `EOClock.mm`), which act as the spec, not as code to preserve.

## 3. Users and journeys

Primary: astronomy-curious web users on desktop and tablet who want a live, beautiful "what's the sky doing now" clock. Secondary: the owner, learning TS/agent-orchestration by building. Journey v1: open URL → grant or type location → watch live astronomical clock → scrub time forward/backward.

## 4. Scope and non-goals

**v1 scope:** clock face; sun/moon rise-set rings; moon phase view; Earth/terminator view; time-travel controls; manual + geolocation location entry.
**Non-goals (v1):** eclipses (defer), alarms (impossible on web in background; re-specify later), EOT/altitude/azimuth sub-dials, localization beyond English, AI features, iOS app work of any kind (parked — see DEC-006), App Store publishing.

## 5. Requirements, assumptions, questions

- REQ-001 — Live astronomical clock face driven by a single per-frame engine call (`frame()`), rendering at 60fps on a mid-range laptop.
- REQ-002 — Sun and moon rise/set rings with correct geometry for the user's location and time.
- REQ-003 — Moon phase display accurate to the day, visually smooth across the lunation.
- REQ-004 — Earth view with day/night terminator for current time and location.
- REQ-005 — Time-travel: step by minute/hour/day/month/year/century, forward and back, with resume-to-now (interaction semantics per `EOClock.mm:440-493,680-758`).
- REQ-006 — Location: browser geolocation with graceful fallback to locale-aware manual lat/long entry (fixing the upstream `floatValue` locale bug by design).
- ASM-001 — astronomy-engine (npm, MIT) meets v1 accuracy needs (~1 arcmin). Validate in WI-002.
- QST-001 — RESOLVED 2026-08-11: owner approved the brand-aligned cyanotype instrument mockup (WI-001 complete). The mockup is the visual reference for WI-004+.
- QST-002 — RESOLVED by DEC-008: the product is **Day4 Observatory**, under the Day4 Astronomy brand (day4.org).
- QST-003 — Hosting target (GitHub Pages / Cloudflare Pages / other). Owner: user; default GitHub Pages unless objection.
- QST-004 — Accuracy bar beyond v1 (arcsecond-class needs the Rust engine). Decide at DEC-002's phase-2 gate.

## 6. Current state

No web code exists. iOS app (~8.7 KSLOC Obj-C++) builds only with four frozen sibling repos (not on disk). No tests anywhere. Delegation harness calibrated and ready (`opencode.json`; Claude Agent SDK installed).

## 7. Options and decisions

- DEC-001 — Purpose: ship a real public web app at a learning pace (not a throwaway or portfolio-only piece). Rationale: owner intent, 2026-08-09.
- DEC-002 — Engine: TypeScript-first using astronomy-engine behind a stable `FrameState`/`frame()` seam; Rust/WASM engine is a named phase-2 option, gated on QST-004, swap-compatible by design. Rationale: fastest to pixels; math already solved; owner is learning TS; seam keeps the Rust door open honestly.
- DEC-003 — v1 scope is the middle cut (Section 4). Rationale: exercises every architectural layer; defers the two subsystems the assessment flagged re-specify-don't-port.
- DEC-004 — Fresh visual identity, not a faithful recreation. Original artwork is unlicensed to us; fresh design pairs with the required rebrand. Direction chosen via mockup (QST-001).
- DEC-005 — Build in `web/` inside this repo; split to a branded repo at rebrand time. Rationale: the `.mm` files are the live spec during porting.
- DEC-006 — iOS app fully parked; no iOS work in v1. The SEC-001 supply-chain fix (pin archived-org dependencies) is consciously deferred and tracked as RSK-002.
- DEC-007 — Cadence: interactive sessions; standing loops/automation only after the port pattern stabilizes.
- DEC-008 — Brand: the app ships as **Day4 Observatory** under Day4 Astronomy (day4.org, 501(c)(3)); amends DEC-004's "fresh identity" to "fresh identity within Day4's blue-and-gold." Palette: Prussian-blue cyanotype field + Day4 brand gold (#F0B310) reserved for the sun; Day4 wide logo (dark-background variant) in the header; Genesis 1:14 ("for signs and seasons, days and years") as the product motto. Resolves the ASSESSMENT's rebrand requirement — no separate rebrand needed. Rationale: owner direction, 2026-08-11. Note: mockup hotlinks the logo from day4.org; WI-002 must vendor a licensed copy of the logo asset into `web/` with the org's permission.

- DEC-009 — Expanded sky palette (2026-08-17, see DESIGN-CONSOLIDATED): blue-orange complementary pair; twilight amber, sun gold, moon ivory — color only where the sky provides it.
- DEC-010 — The living sky (owner: "this is reflecting the design of God — take it up another level"): the page follows the light. An atmospheric color script keyed to real solar altitude — night → indigo twilight → amber golden hour → lifted daylight blue — drives the field, star visibility, and the sun's own color (Rayleigh: amber at the horizon, gold at noon). Dragging the sun drags the light of the whole page. 2026-08-17.

- DEC-011 — The firmament (owner: “dream up a million dollar background — the whole design is still a 4 out of 10”): the flat gradient becomes a full-page star chart — a seeded Milky Way river (haze clouds + gaussian dust), magnitude-law field stars, and bright chart-glyph stars, plus a dawn/dusk horizon glow. All of it obeys DEC-010: star visibility and glow are driven by real solar altitude, and the canvas redraws only when the light meaningfully changes. Hero type recut: serif italic words, gold tabular-mono countdown. 2026-08-17.

- DEC-012 — Scripture as masthead, engraved type (owner: “would the verse look better up top… the font still sucks, we are representing the God of the universe”): the verse moves from footnote to masthead — the thesis the instrument hangs under — rotating daily through twelve KJV sky-verses (the six day4.org itself displays + six more). Type recut to the engraved-atlas tradition: Cormorant SemiBold Italic for scripture/hero, Cinzel Roman inscriptional capitals for all labels, mono confined to numerals. day4.org’s literal fonts (Poppins/Open Sans, stock Divi) deliberately not copied. 2026-08-17.

- DEC-013 — ESV, not KJV (owner correction: “looking at the website, what Bible version do they use — they don’t use King James”): day4.org quotes ESV (Isaiah 40:26 and Psalm 33:6,9 verbatim; Psalm 147:4 in NASB wording), so the whole masthead canon is ESV with the required “· ESV” mark on every citation (ESV terms permit this scale in non-saleable media). Regression test bans KJV archaisms from the canon. Lesson: verify brand facts against the brand’s own site before choosing. 2026-08-17.

- DEC-014 — Warm light for the Word, cool light for the instrument (owner: “logo, bible, then sunrise… fonts and color theory is off, hard to see”): header restructured into one centered ceremonial column — logo, scripture, countdown — with the clock in the corner. Color theory move: scripture set in warm ivory #F3ECDA w700 with a soft-gold #E7BE5A citation (warm-on-cool complementary contrast, tying masthead to the gold logo), all inks brightened (inkHi #E7F0FA, inkMid #9BB9D6, inkLow #46648A in CSS and canvas THEME alike), text-shadow scrims so starlight never eats the letterforms. 2026-08-18.

- DEC-015 — TONIGHT board (owner: “can we see what constellations you'd be able to see, like a countdown clock… on the bottom”): a bottom band listing bright constellations with live countdowns. Pure math on the far side of SEAM-001 — `app/constellations.ts` needs only sidereal time + latitude from `frame()`, never an astronomy API, so the Rust-swap contract holds. Honest by construction: tracks each constellation's brightest star (a region has no single rise instant) and separates up from visible (daylight drowns stars → “visible after dark”). 2026-08-18.

- DEC-016 — The Vault (owner: “think like we are creating art for God, like Michelangelo and the Sistine Chapel”): a sacred-architecture direction grounded in two real precedents — the Sistine ceiling's own Day 4 panel (*The Creation of the Sun, Moon and Plants*) and Giotto's Arena Chapel vault (lapis ultramarine ground, gold eight-pointed stars). Four moves: gold as a *material* (leaf gradient: shadow → body → specular, never flat yellow); a lapis dome that gathers light at the crown and falls to the rim; **scripture as architecture** — Genesis 1:14 carried around the dial as a two-arc frieze, top and foot, the way a cathedral carries its text on the building; and an oculus light-well holding the earth. Two families only: Cinzel (Trajan-derived inscriptional capitals) for carved text, Fraunces for the rest. Preview at `web/vault.html`. 2026-08-19.

- DEC-017 — Four sacred-art directions (owner: “give me 4 versions, one weaving the vault with the current design”): rather than four variations of one idea, four distinct traditions of art made for God, each rendered as a real screen at `web/directions.html`. (1) **The Weave** — the current app's living sky, Milky Way and fine 30-minute tick cadence and sidereal ring intact, gilded with the vault's gold-leaf material and two-arc frieze. (2) **The Icon** — Byzantine gold ground with lapis marks and a nimbus round the earth; the palette inverted, leaf-square seams visible. (3) **The Fresco** — Michelangelo's actual surface: pigment on lime plaster, sanguine/umber/terra-verde, a painted architectural moulding for the ring (light mode). (4) **The Rose** — Gothic glass: jewel panes held in lead came, hours kept legible in amber. All four share one geometry so the comparison is about material and light, not layout. 2026-08-19.

- DEC-018 — The Weave, band over inscription (owner: “show me 1 — I really don't like the text in the circle”): the curved frieze is cut. The verse already leads the masthead, so the ring was spending itself on repetition. The band instead carries the day: night, amber twilight at the two horizon crossings, and daylight, bounded by gold hairlines with the rise/set moments marked in gold across it. Gold, carved hour capitals, living sky, and the instrument's 30-minute cadence all stay. Preview at `web/weave.html`. Lesson: on an instrument, a ring should report something. 2026-08-19.

- DEC-019 — Scripture zone holds scripture only (owner: “is that part of the Bible verse? it seems off”): the “ON THE FOURTH DAY” caption was mine, not the text — Genesis 1:19 ends “…the fourth day,” but the line as placed was editorial. Set in the same gold capitals directly above a verse, it read as part of the quotation. Removed from every page. Rule: inside the scripture block, only quoted scripture and its citation appear; any editorial line must sit outside that block and look plainly different. 2026-08-19.

- DEC-020 — The fiducial, and naming the clock (owner: “add a cross or some marker showing the time the person is in”, plus the timezone seam): an astrolabe carries a *fiducial* — a fixed reference mark you read positions against — and it is drawn as a cross. Ours marks the observer's present. It rides just outside the rim so it never covers the sun; live it stays quiet in ink, and the moment time is scrubbed it turns gold — the gap between cross and sun *is* the distance travelled, and it is the way home. Alongside it, every readout now names the clock it is in (`CDT`, `GMT+2`), and a gold note appears when the device's zone is ≥1.5h from the station's longitude-derived zone. Known limit: nominal zones are longitude/15 and ignore political borders and daylight saving, so a sub-1.5h civil difference is labelled but not flagged; closing that needs a timezone database. 2026-08-19.

- DEC-021 — Fiducial variants, and the orientation finding (owner: “how can we improve the cross — show me some versions”): seven marks rendered on a real slice of the gilded band at true phone scale and magnified, live and travelled, at `web/cross.html`. The finding that outranks shape choice: the shipped mark is drawn **radial** (square to the band), so at 06:00 and 18:00 a Latin cross lies on its side and reads as a dagger. Held **upright** it stays a cross at every hour. That creates a tension — upright preserves the symbol, radial preserves the pointing — resolved by variant G: an upright cross plus a separate hairline drawn along the radius, so the symbol never turns and the hour is still cut exactly. 2026-08-19.

- DEC-022 — What the cross represents (owner: “what does the cross represent… I rate those 0 because it does not reflect Jesus”): the earlier variants were designed as *fiducials* — instrument reference marks. Honest craft vocabulary, but it makes the cross a pointer that says “you are here at 7pm”, which is backwards: the cross is not a label for a moment, it is what every moment hangs on. Three treatments at `web/crux.html`, each from scripture. **The Axis** (Col 1:17) — the cross is what the dial turns upon, drawn beneath everything it holds, with the earth resting at its crossing; “now” gets a plain gnomon instead. **The Sixth Hour** (Mark 15:33) — noon to three, the hours God darkened the sky, carried permanently on the band with one cross standing over them; on a 24-hour dial those hours are a real place, so an astronomy instrument can remember the one time the sun was put out. **The Dayspring** (Luke 1:78, Mal 4:2) — Christ the rising sun; the cross stands at the hour of sunrise and moves with it through the year. Standing rule: the cross is never a UI pointer. 2026-08-19.

- DEC-023 — The recommendation, four voices (owner: “how can you show that recommendation in different versions”): DEC-022's pairing — the Axis holding the dial (Col 1:17) plus the Sixth Hour carried on the band (Mark 15:33) — rendered four ways at `web/sixth.html`, varying only volume and material. **Quiet**: axis at 30% gold, darkness dimmed not blackened; reverence by restraint. **Declared**: axis at full weight, darkness to near-black, cross tall over it. **Radiant**: the axis as light rather than metal (shadow-blur glow), the darkened hours rimmed in gold at the sixth and ninth — the darkness real, and bounded on both sides by light. **Engraved**: the atlas treatment — the axis incised as two hairlines with the ground between them, the three hours cross-hatched as an engraver shades. In all four, “now” stays a plain gnomon. 2026-08-19.

- DEC-024 — The Sixth Hour, built for real (owner: “how can you do your recommendation with excellence”): the Radiant treatment shipped into the live instrument, and the excellence is in the reckoning, not the rendering. **The sixth hour is not noon.** Scripture divides daylight into twelve equal hours from sunrise to sunset, so an hour is longer in summer and longer at high latitude; the sixth hour falls at solar midday whatever the season, the ninth three seasonal hours later. Hard-coding 12:00–15:00 would tell the viewer something false about their own sky. `web/src/app/hours.ts` computes them for the station and date on screen (verified live: 11:59–15:23 at 40°N, each hour 68 minutes). Required extending SEAM-001 — `dayRiseUnixMillis`/`daySetUnixMillis`, a *matched* daylight pair (searching backwards for today's sunrise when the sun is already up), because two “next” events can belong to different days. `web/src/ui/passion.ts` draws the withdrawn light, gold struck at both bounds, and the cross standing over the middle; `drawAxis` is keyed to the sky palette so it is plain by day and luminous at night. The now-mark became a gnomon, per DEC-022. 2026-08-19.

- DEC-026 — Reverted DEC-025; subtraction is the next level (owner: “I rate that idea 0 — more is not always better”): the mo'edim strip was reverted, modules included, rather than left as dead code. The lesson, recorded so it binds future work: **“another level” is not another feature.** The screen below the dial had already accumulated four bands — readouts, time-travel controls, the passion caption, the TONIGHT board — and a fifth made the instrument a dashboard. From here, raising the level means removing, merging, or earning: nothing new is added below the dial unless something else leaves. 2026-08-19.

- DEC-027 — The four-second answer (owner, asked what one thing a visitor should walk away with: “The heavens declare the glory of God”): Psalm 19:1 is the product thesis, and it is a knife, not a caption. The sky and the dial are the declaration; chrome competes with the preacher. First cuts under DEC-026: steppers 7 units → 3 on screen (hour/day/phase — the engine keeps all seven, drag covers minutes); the passion caption speaks only while the sixth-to-ninth hours are actually passing, silent otherwise; TONIGHT 6 → 3, a program not a list. Standing test for every future element: does it help the heavens declare, or does it talk over them? 2026-08-20.

## 8. Target architecture, contracts, and test seams

```
ui/ (TS, canvas)  ←  FrameState  ←  engine/ (TS now; Rust/WASM later)
views: clock, rings, moon, earth   frame(unixMillis, lat, lon) → FrameState
```

- SEAM-001 — `frame(): FrameState` is the single engine/UI boundary: one coarse call per animation frame returns every number the views need. Views never call astronomy APIs directly. This seam is the Rust-swap contract and the primary test seam.
- SEAM-002 — Each view module exposes `draw(ctx, state, layout)` with no hidden state, so views are testable headlessly and portable individually.
- Layout: a single normalized layout table (transcribed from `EOClock.mm:1520-1729`) replaces the ~150 hardcoded 768×1024 constants; all views position from it.
- Stack: Vite + TypeScript (strict), Canvas 2D, PWA manifest + service worker; no framework for the clock face.

## 9. Risks and mitigations

- RSK-001 — Silent geometry errors in ported views (empirically demonstrated: 3 of 7 calibrated models produced wrong-but-compiling transforms). Mitigation: every ported view gets a ground-truth rendering/unit check (CHK-002) before merge; coordinate-transform work routes only to calibration-validated agents.
- RSK-002 — Deferred SEC-001: build scripts still clone the archived EmeraldSequoia org at unpinned HEAD. Accepted while iOS is parked and nobody runs those scripts; must be fixed before any iOS build resumes. Trigger: anyone runs `scripts/bootstrap_dependencies.sh`.
- RSK-003 — TS-first comfort kills the Rust phase silently. Mitigation: DEC-002 records it as a gated decision, not a drift; QST-004 forces an explicit revisit.
- RSK-004 — Owner is new to TypeScript; misread delegated code could merge unreviewed. Mitigation: learning output style stays on; every merge reviewed in-session; `/code-review` gate per PR.
- RSK-005 — Scope creep toward the ~60-widget full face. Mitigation: Section 4 non-goals; new widgets require a DEC.

## 10. Capability routing and work breakdown

Capability routing: this session (Claude) orchestrates and owns judgment work; `opencode.json` agents (architect/builder/builder-alt/porter/worker) take specified implementation per `analysis/observatory/CALIBRATION.md`; workflows only on explicit "use a workflow"; rafter gates security surface; plan-engineering owns this plan; grilling/domain-modeling/tdd/prototype skills as named.

Dependency frontier (→ = blocks):

- WI-001 — Visual mockup(s) for DEC-004/QST-001 approval. → WI-004
- WI-002 — Scaffold `web/` (Vite + strict TS), define `FrameState` + `frame()` against astronomy-engine, validate ASM-001 against JPL Horizons reference values. → WI-003..WI-006
- WI-003 — COMPLETE 2026-08-11: `analysis/observatory/layout-table.md` (28KB) transcribed by builder-alt (DeepSeek Pro), verified in-session against source — ~30 sampled values/formulas exact, incl. override chains, derived-constant formulas kept symbolic, and commented-out alternates flagged. Input to WI-005/WI-006 layout decisions.
- WI-004 — First two views (clock ring + one hand) drawn in approved visual language; establishes the port pattern. → WI-005
- WI-005 — COMPLETE 2026-08-11: moon (phase-rendered disc at true hour-angle-relative dial position + earthshine), Earth (graticule sphere, night hemisphere opposite the sun), sidereal ring (GAST-driven). Engine gained sun/moon `hourAngleHours` with physics tests (hour angles coincide at the 2024 eclipse, oppose at full moon). 20 tests green; verified in browser. Done in-session — the three-file pattern is now demonstrated across five views, ready for porter delegation on future widgets.
- WI-006 — COMPLETE 2026-08-11: time-travel strip (minute/hour/day/phase/month/year/century both directions + NOW reset; gold shifted-time indicator) with calendar-clamped stepping semantics (CHK-003: Jan 31 + 1mo = Feb 28/29, Feb 29 + 1y = Feb 28, wall-clock preserved); station entry with locale-tolerant reject-don't-clamp parsing (REQ-006 tests), geolocation, localStorage persistence.
- WI-007 — COMPLETE 2026-08-11: deployed to **https://chrisp671.github.io/Day-4-Observatory/** via test-gated GitHub Pages workflow (run 31555605924 green); relative-base Vite build (28KB gzip), PWA manifest + SVG icon (PNG icons for full installability = follow-up). Verified live in browser incl. controls.
- WI-008 — COMPLETE 2026-08-12: four independent research docs (owner-supplied: engraved-instrument, museum-sourced, Sol, Kimi) digested by parallel agents and merged into `analysis/observatory/DESIGN-CONSOLIDATED.md` (canonical design spec). Implemented the 8-item consensus: sun glow deleted, gold day-arc deleted, rise/set marked by shape (inkHi boundary ticks), 3-level tick cadence with ≥3:1 functional contrast, numerals → inkHi@.9 (10.2:1), moon outline deleted (15.17:1 adjacency), moon orbit broken behind the disc, truthful orthographic Earth graticule (tropics at ±23.44°, softener ellipse removed), seeded static print grain (<4% Atkins budget). 34 tests green. Rejected: field-color change, second palette, new fonts, SVG export (see consolidated doc).
- WI-008b — 2026-08-17: Day4 brand mark vendored (`web/public/day4-logo.png`) and mounted in the header as a maker's cartouche — a warm-paper (#F0EAD6) label with hairline ink border, the way an engraved chart carries its publisher; brand colors used unaltered, no recolor. Added `compare.html` + `src/compare.ts` + `src/ui-before/` (pre-refinement modules extracted from 77a9ff9): an A/B design record rendering both versions against one fixed FrameState, shipped as a second build entry.
- WI-011 — COMPLETE 2026-08-17: the million-dollar-builder pass, first slice. (a) Drag-to-scrub: the sun is grabbable — pointer capture on the disc (2.5× visual size hit target), drag maps to time via tested inverse-angle math with midnight-crossing wrap (scrub.ts, 8 tests); verified end-to-end with dispatched PointerEvents (3h drag → clock +3h exactly, hero flipped sunset→sunrise live). (b) Hero answer: "SUNSET in 2h 37m" centered in the header (hero.ts, 6 tests) — the answer is the headline, the instrument is the expression. Backlog from the same review: tonight strip (moonrise/full moon/events), red night-mode for star parties, phone-first portrait layout, orchestrated load sequence.
- WI-012 — COMPLETE 2026-08-17 (owner feedback: mobile overlap, wants color): (a) header collision fixed structurally — "Observatory" wordmark removed (logo carries the name), hero becomes its own static centered row below the logo at ≤720px, never absolute, overlap impossible; (b) DEC-009 color system: blue-orange complementary palette — twilight amber (#E8955C) gradient arcs blooming ±75min around sunrise/sunset on the band (the sky's own colors; 24-segment alpha ramp), hero countdown in sun gold, moon shifted to warm ivory (#F2EDE0) for warm/cool separation. Color still only where the sky provides it.
- WI-013 — COMPLETE 2026-08-17 (owner: still 0, "think harder on design"): root cause identified — the desktop composition (corner overlays around a dial smaller than the screen) was being reused on portrait, where the dial IS the screen width, so every "corner" landed on the instrument. Portrait is now its own layout: pure vertical stack (logo → hero → dial with 16px air → ruled 2×2 data grid below the dial → controls), body scrolls naturally, fit() is portrait-aware (caps dial at 52vh). Verified in a real 390×844 viewport via iframe harness (`web/mobile-check.html`, kept as a permanent mobile-check tool): programmatic overlap check = zero intersections, plus screenshot. Lesson recorded: never ship a responsive change without rendering the actual breakpoint.
- WI-019 — COMPLETE 2026-08-19: DEC-024 implemented — `app/hours.ts` (seasonal-hour reckoning, 11 tests: 60-minute hours only on a twelve-hour day, sixth hour at solar midday in every season, window always a quarter of daylight, ends before sunset, null in polar day/night); `ui/passion.ts` (+3 tests on the midnight-crossing midpoint); SEAM-001 extended with a matched daylight pair; fiducial reshaped to a gnomon. 109 tests green; verified live and time-travelled by screenshot.
- WI-018 — COMPLETE 2026-08-19: DEC-020 implemented — `web/src/ui/fiducial.ts` (travelHours/isAtPresent + draw, 10 tests incl. the short way round midnight and never more than half a day of travel) and `web/src/app/clockzone.ts` (zone label, nominal offset, mismatch report, 7 tests). Dial gilded per DEC-016: gold-leaf band edges, six-hour majors, horizon marks, and Cinzel hour capitals. 95 tests green; verified by screenshot in both states — live the cross sits quiet beside the sun, after +5h scrubbing it holds at the present in gold while the sun walks ahead.
- WI-017 — COMPLETE 2026-08-18: DEC-015 implemented — `web/src/app/constellations.ts` (9-constellation catalog + `horizonHourAngle`/`skyEntry`/`tonightBoard`) with 14 tests incl. 6h hour-angle at the equator, circumpolar above dec 50° from 40°N, Crux never-rises from 40°N but circumpolar from Sydney, and rise-countdown-elapses-to-up. Bottom band in index.html + `drawTonight` in main.ts. Also fixed two latent layout bugs the band exposed: `fit()` measured the stage's padded border box (dial overflowed into its neighbours) and never re-fit when the stage changed height without a window resize (now a ResizeObserver). 78 tests green; desktop + phone geometry verified overlap-free.
- WI-016 — COMPLETE 2026-08-17: DEC-012 implemented — `web/src/app/verse.ts` tested pure module (6 tests: stable across a day, changes at local midnight, full-canon cycle, charter present, well-formed pre-epoch, day-number monotonic); masthead markup + Cormorant/Cinzel system in index.html; footnote verse removed; text-wrap:balance kills orphan wraps. 63 tests green; desktop render + mobile geometry probe verified (no overlaps).
- WI-015 — COMPLETE 2026-08-17: DEC-011 implemented — `web/src/ui/firmament.ts` full-page fixed canvas behind the document; `skyPalette` gains `horizonGlow` (tested: glows at the horizon and nowhere else); redraw keyed to 0.5° altitude buckets. Hero fonts fixed (serif words / gold mono numerals). 57 tests green; verified on desktop render — the phone-harness screenshot tool mislayers fixed negative-z canvases in iframes, so mobile was verified by DOM geometry probe instead.
- WI-014 — COMPLETE 2026-08-17: DEC-010 implemented — `web/src/ui/sky.ts` tested pure module (5 tests: monotonic brightness, stars gone by day, horizon-red sun, keyframe continuity, clamping) wired to CSS field vars, star visibility, and sun disc color. 56 tests green; verified in the phone harness: midday = lifted #24507f field, zero stars, high gold sun.
- WI-009 — Accessibility pass (from consolidated spec, all four docs demand): DOM instrument transcript, freeze-time control (resume jumps to now), prefers-reduced-motion 60s cadence, high-contrast mode, print mode. Large.
- WI-010 — Flourish + validation: one curved Instrument Serif small-caps ring title; R=240/400/600 snapshot matrix with one-second glance test. Medium.

## 11. Verification and acceptance matrix

- CHK-001 — Engine values vs JPL Horizons reference data: sun/moon positions, rise/set, phase for 3 locations × 4 dates within tolerance (covers REQ-001..004, ASM-001).
- CHK-002 — Per-view ground-truth render check (golden-image or geometry assertion) against the `.mm` source semantics (covers RSK-001; gate for WI-004/005).
- CHK-003 — Time-travel semantics match `EOClock.mm` stepping rules incl. edge cases (covers REQ-005).
- CHK-004 — `tsc --strict` clean + tests green in CI on every PR (covers all).
- Acceptance: all CHKs green + owner visual approval on the deployed URL.

## 12. Rollout, observability, rollback

Deploy static site from CI on merge to main; every deploy is reversible by re-deploying the previous commit (static hosting = trivial rollback). Add lightweight error reporting before public announcement; no analytics in v1 without a DEC.

## 13. Open questions

QST-001..QST-004 above. Next grilling round covers QST-002/003 once the mockup (WI-001) settles QST-001.

## 14. Progress, discoveries, and change log

- 2026-08-06 — Assessment, security scan, model calibration complete; harness built (see Section 2 artifacts).
- 2026-08-09 — plan-engineering skill security-reviewed and installed; Round-1 grilling answered; DEC-001..007 recorded; this plan seeded. Next: WI-001 mockup.
- 2026-08-11 — WI-001 mockup built (`analysis/observatory/mockups/meridian-v1.html`): live-canvas cyanotype instrument, sun-as-hour-hand, verified in browser. Owner supplied the brand (day4.org) → DEC-008; mockup brand-aligned (Day4 logo, brand-gold sun, Genesis 1:14 motto); QST-002 resolved.
- 2026-08-11 — QST-001 approved by owner. WI-002 delivered: `web/` scaffold (Vite 8 + TS 7 strict + Vitest 4), SEAM-001 implemented in `web/src/engine/frame.ts` against astronomy-engine 2.1.19, first CHK-001 slice green (8 tests: known new/full moons, equinox declination and daylight, J2000 sidereal time, subsolar-point conventions, cross-time/place smoke). ASM-001 validated at display grade; full JPL Horizons table still open under CHK-001. Frontier now: WI-003 (layout table) and WI-004 (first views).
- 2026-08-11 — WI-004 first slice delivered in-session (pattern-setting per capability routing): `web/src/ui/` with theme.ts (DEC-008 tokens), clockface.ts (pure dial math) + convention tests pinning noon-top/clockwise (CHK-002 seed), stars/dial/sun drawing modules, instrument shell in main.ts/index.html. 13 tests green, strict typecheck clean, verified rendering in browser with engine-real rise/set arcs. WI-003 delegated to builder-alt (DeepSeek Pro) in background. Port pattern established: pure-math module + convention test + thin draw module per view.
