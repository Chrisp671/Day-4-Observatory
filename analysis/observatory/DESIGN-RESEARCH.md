# Day4 Observatory — visual design research brief

_Prepared 2026-08-11. Scope: a full-viewport Canvas 2D astronomical clock using the existing Prussian-blue ink system plus gold sun and off-white moon. This is reference research, not a proposal to replace the established identity._

## Executive direction

The strongest historical precedent is not “ornate astronomical clock” in the abstract. It is the **engraved scientific plate**: one dominant reading ring; subordinate rings separated by narrow quiet gutters; marks differentiated by length before color; and a calm center whose geometry is more legible than its decoration. The existing Day4 geometry is already close. Keep the identity and the `FACE` topology, remove the sun glow, strengthen the functional strokes that currently fall below 3:1 contrast, and add hierarchy through spacing, cadence, and line weight rather than more cyan.

### Measurement and evidence note

Museum object records provide physical dimensions but rarely publish ring dimensions. Ratios below marked **estimated** were measured from the largest straight-on institutional image available: identify the face center and visible face radius _R_, sample ring boundaries on four axes, average the pixel radii, then report band width or gap divided by _R_. Perspective, bezels, and photographic crop make these **design-study estimates, not object scholarship**; allow roughly ±0.02R. They are reproducible by downloading the linked public-domain image and measuring in any pixel ruler. All historic examples link to museum/library object pages with zoom or original download where available.

## 1. Ring composition and proportion

### Annotated references

- [Rasulid astrolabe, 1291 — Metropolitan Museum of Art, public-domain zoom/download](https://www.metmuseum.org/art/collection/search/444408). It matters because a working astrolabe puts dense computation inside a strong, quiet limb. **Rule:** estimated limb/chapter band ≈0.12R; rete field ≈0.72R; leave ≈0.03–0.05R between unrelated circular scales and let openwork, not tint, distinguish moving from fixed information. The Met records a 15.6 cm case and 12.7 cm rete/plates, independently establishing a rete radius ≈0.81 of case radius before the photographic estimate.
- [Planispheric astrolabe, Muhammad Zaman, 1654–55 — Met](https://www.metmuseum.org/art/collection/search/451699). The thin calligraphic faceplate demonstrates that very high density remains readable when the outer scale is regular and the center uses interrupted, directional lines. **Rule:** estimated outer scale ≈0.10R, a quiet separator ≈0.025R, and no more than one fully continuous dense tick ring.
- [Flemish astrolabe, ca. 1600 — British Museum](https://www.britishmuseum.org/collection/object/H_1893-0616-1). The museum identifies an outer 24-hour scale and inner 360° altitude scale. **Rule:** estimated paired perimeter scales ≈0.11–0.13R total, each ≈0.045–0.055R; two adjacent quantitative rings work when only one carries prominent numerals.
- [Mirror clock, ca. 1565–70 — Met](https://www.metmuseum.org/art/collection/search/193609). This clock combines an astrolabe, zodiac, sun hand, moon-age scale, and star pointers; the Met explains that the revolving rete represents the stellar sky and that the sun and moon hands read against concentric scales. **Rule:** moving information may cross rings, but each moving body should have one unmistakable pointer/disc; do not repeat its color in its supporting scale.
- [Astronomical/lunar table clock by Philipp Imser, 1554 — British Museum](https://www.britishmuseum.org/collection/object/H_1874-0727-1). It layers equal hours, unequal hours, zodiac, moon age/phase, and planetary influences. **Rule:** put the most glanceable scale on the perimeter, reserve curved interior rules for secondary lookup, and vary the direction/curvature of adjacent systems rather than adding outlines.
- [Henry Jenkins astronomical clock, 1778 — British Museum](https://www.britishmuseum.org/collection/object/H_1992-1001-1). Its six concentric planetary rings are a rare successful 4+ ring system; the museum identifies six rings, each carrying one planet, above a separate planisphere. **Rule:** repeated equal-status rings can be thin and evenly spaced when each contains only one moving token; estimated orbital spacing ≈0.07–0.10R and ring stroke ≲1/150R.
- [Cellarius, Ptolemaic solar-path plate, 1660/1708 — Rijksmuseum, public domain](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293). The Rijksmuseum describes Earth at center, a surrounding zodiac band, and a degree scale at the edges. **Rule:** one broad pictorial/data band can contain several fine paths if bounded by clean double rules; estimated zodiac/path annulus ≈0.19R with ≈0.04R quiet space around the central globe.
- [Cellarius, complete _Harmonia Macrocosmica_, 1708 — Library of Congress](https://www.loc.gov/item/2011589506/). The free-use page gallery makes the atlas’s repeated orbital grammar measurable across plates. **Rule:** estimated outer caption/zodiac zone ≈0.10–0.14R, orbital family ≈0.55–0.65R, center emblem/world ≈0.18–0.25R; use small ≈0.015–0.03R intervals inside a family and a roughly doubled ≈0.04–0.06R gap between families.

### Application to the current canvas

Current normalized radii are `dialOuter .985`, `dialInner .875`, numerals `.82`, Moon orbit `.72`, sidereal `.575`, Earth `.30`. Thus the dial is 0.110R wide, matching the historical 0.10–0.12R chapter-band pattern; do **not** enlarge it. The gaps are 0.155R from the dial's inner boundary to the Moon orbit (0.100R from the numeral baseline), 0.145R Moon to sidereal, and 0.275R sidereal to Earth: generous enough for four systems, but the continuous Moon orbit and sidereal ring compete because both are uniform circles. Treat `.72` as a very faint construction orbit interrupted behind the Moon, make `.575` the articulated secondary chapter ring, and preserve at least 0.04R of unmarked “paper” on either side of each data family.

Use alternating **information density**, not alternating blue fills: dense 24-hour perimeter; sparse Moon orbit; dense-but-fine 72-tick sidereal scale; quiet Earth moat. Historical band shading is material contrast (silver/gilt/niello) rather than a license for multiple digital gradients; Day4 can translate that into stroke hierarchy and sparse 2–4% blue tonal wash.

## 2. Tick and label hierarchy

### Annotated references

- [Clock-watch with astronomical dial, Jan Bockeltz, ca. 1600 — Met](https://www.metmuseum.org/art/collection/search/194191). The Met records Roman hour numerals, stars for half-hours, and touch pins. **Rule:** change _shape_ at the half-step and physical prominence at the major step; for Day4, use long hour ticks, short half-hour ticks, and hairline quarter-hour ticks rather than 24 nearly equivalent marks.
- [Astronomical compendium, British Museum 1893,0616.7](https://www.britishmuseum.org/collection/object/H_1893-0616-7). Its scales use numbered hours, star symbols for half-hours, degrees divided by tens and subdivided by twos with alternate shading. **Rule:** a three-level cadence of 10:5:1 or 6:3:1 is readable because numeral frequency and mark length reinforce one another.
- [Bode, _Uranographia_, 1801 — Linda Hall Library digital exhibit](https://digital-exhibits.lindahall.org/celestial/). The library’s high-resolution constellation plates show bright stars encoded by graduated engraved discs while constellation figures and grid lines remain subordinate. **Rule:** map importance primarily to glyph size/line weight, then opacity; never ask hue alone to communicate magnitude.
- [Flamsteed, _Atlas Coelestis_, 1729 — Cambridge Digital Library](https://cudl.lib.cam.ac.uk/view/PR-ATLAS-00002-00001/1). The digitized atlas separates coordinate scaffolding, constellation figures, stars, and italic labels by stroke texture and scale. **Rule:** labels should sit in clear pockets and avoid crossing continuous geometry; curve only the categorical ring name, not every numeral.
- [Cellarius _Harmonia Macrocosmica_ title/atlas record — Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Titelpagina-voor-Andreas-Cellarius-Harmonica-Macrocosmica-seu-Atlas-Universalis-et-Novus-1708--dc5a1284228350146bc7bf8496b4ea69). Its printed hierarchy combines engraved imagery with separately printed text. **Rule:** typography and geometry need not share stroke weight; labels may be optically stronger while remaining chromatically restrained.
- [Dürer, _Celestial Globe—Southern Hemisphere_, 1515 — Met, public-domain download](https://www.metmuseum.org/art/collection/search/358367). Dense celestial information remains readable because coordinate circles are hairlines, constellation contours are mid-weight, and stars/names are compact high-contrast marks. **Rule:** grid/figure/star hierarchy should come from continuity and an approximate opacity ladder such as .30/.55/.90, not three equally bright blue strokes.

### Canvas rule set

Adopt a 3:2:1 tick-length system and roughly 2:1.4:1 stroke system. At `R=400`, a practical start is 12/7/3.5 px lengths and 1.4/1.0/0.75 CSS-px strokes (multiplied by DPR only after geometry is expressed in CSS pixels). Label every six hours as now, but add unlabelled 3-hour intermediates and 30-minute minors. Keep labels upright, placed inside the scale; the historical lesson is a stable chapter ring, not forced radial type.

The current minor hour tick is `inkMid` at alpha .55, about **2.62:1** against `#0E2440`; a meaningful scale mark should reach WCAG’s **3:1 non-text** threshold. Raise it to approximately alpha .68 or use `inkHi` at .45 (≈3.59:1). Decorative subdivisions can remain below 3:1 only if no reading depends on them.

## 3. Cyanotype materiality

### Annotated references

- [Anna Atkins, _Photographs of British Algae_ — New York Public Library Digital Collections](https://digitalcollections.nypl.org/collections/photographs-of-british-algae-cyanotype-impressions). Contact silhouettes make the subject pale against a Prussian field, with fine translucent internal structure and naturally uneven sensitized edges. **Rule:** reserve near-white for contact-like primary marks; allow secondary structures to live in two paler blue values rather than adding glows.
- [Anna Atkins, _Part X_, ca. 1853 — Met, public-domain download](https://www.metmuseum.org/art/collection/search/291537). A single high-resolution plate reveals broad field variation, medium mottling, and contact edges ranging from hard to translucent. **Rule:** keep broad modulation to ±2–3% luminance, sparse 12–40 px mottling to ±1–1.5%, and 1–3 px monochrome grain to ±0.5–0.8%; aggregate texture contrast should stay below about 4%.
- [Smithsonian Photographic History Collection: Cyanotypes](https://www.si.edu/object/photographic-history-collection-cyanotypes%3Anmah_1343353). Smithsonian identifies cyanotype as Herschel’s 1842 iron-salt, water-developed process and notes its suitability for contact/photogram printing. **Rule:** materiality should look exposure-based—soft local density and paper-scale variation—not emissive.
- [Smithsonian Ocean on Atkins and cyanotype](https://ocean.si.edu/human-connections/history-cultures/no-longer-anonymous-anna-atkins-and-her-algae). The institutional account describes a blue field with light-blue/white negative impressions and Atkins’s use of the specimen itself for accuracy. **Rule:** edges can have a restrained pale fringe, but the interior should remain flat and graphic.
- [Historic American Buildings Survey drawings — Library of Congress collection](https://www.loc.gov/pictures/collection/hh/). The collection offers high-resolution measured architectural drawings, including blueprint-era conventions where line weight separates cut/profile, construction, and annotation. **Rule:** translate “blueprint” as disciplined drafting hierarchy, not distress overlays.
- [NYPL exhibition, _Blue Prints: The Pioneering Photographs of Anna Atkins_](https://www.nypl.org/events/exhibitions/blue-prints). The exhibition frames each cyanotype as an individually made scientific image rather than a uniform industrial surface. **Rule:** variation should be low-frequency and non-repeating.

### A restrained Canvas 2D recipe

Use no downloaded texture. On resize, generate one seeded, low-resolution (for example 128×128) monochrome noise tile in an offscreen canvas, blur it 0.6–1.0 CSS px, and composite it over the field at **0.8–1.5% opacity** with `source-over`. Add a broad deterministic radial exposure variation of no more than **ΔL ≈2–3%**, already partly supplied by `printDeep`/`printField`. For primary lines only, a second pass displaced ≤0.35 CSS px at 4–7% alpha can suggest capillary edge spread. Avoid paper fibers, scratches, stains, fake fold marks, glow, and animated grain: those read as prop-making rather than print.

Modern precedent should be treated cautiously. [The Public Domain Review’s cyanotype collection presentation](https://publicdomainreview.org/collection/anna-atkins-cyanotypes/) succeeds digitally because the interface stays neutral and lets the limited-tone originals carry materiality; **extractable rule:** keep interface chrome out of the instrument and let a single controlled tonal field do the work. It is a presentation of historic work, not evidence for adding “vintage” effects.

## 4. Moon and Earth rendering conventions

### Annotated references

- [Clock-watch with alarm and calendar, Nicolas Forfaict, ca. 1600–10 — Met](https://www.metmuseum.org/art/collection/search/194195). A rotating disk shows lunar age while an aperture shows phase. **Rule:** separate phase (binary silhouette) from age/position (ring or pointer); at 60 px, do not put numerals on the Moon itself.
- [Lunar dial by Paul Hager, 1630s — British Museum](https://www.britishmuseum.org/collection/object/H_1888-1201-142). The lunar phase is a gilded Moon revealed against a blued-steel disc, with a separate twice-29-day ring. **Rule:** a light body against one dark ground is historically authentic and maximally legible; an outline is optional, not the primary separator.
- [Astronomical longcase clock, British Museum 1958,1006.2124](https://www.britishmuseum.org/collection/object/H_1958-1006-2124). The phase uses a rotating black-and-white sphere while a pointer reads age 1–29.5. **Rule:** illumination geometry can carry the phase without crater detail; phase and age remain distinct channels.
- [Coronelli/Nolin celestial globe gores and orthographic projection, 1693 — David Rumsey, full JP2 download](https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~327985~90096576%3AComposite--Orthographic-Projection-). The high-resolution globe construction shows how meridians and parallels establish volume without tonal modeling. **Rule:** use fewer, correctly curved graticules with declining weight away from the outline; the boundary is strongest.
- [USGS map projection manual, Professional Paper 1395](https://pubs.usgs.gov/pp/1395/report.pdf). USGS defines orthographic projection as the view from an infinite distance, visually like a globe. **Rule:** use the orthographic equations for latitude/longitude curves if the Earth claims geographic truth; simple full ellipses are a symbolic globe, not a true projected graticule.
- [James Wilson terrestrial globe, 1828 — Met, public-domain download](https://www.metmuseum.org/art/collection/search/8487). The engraving differentiates the limb, coastline, and graticule without photographic relief. **Rule:** at a ~200 px disc start near 1.5–2 px limb, 1–1.25 px simplified coasts, and 0.5–0.7 px 30° graticule at 20–30% lower opacity.

### Small-disc recommendations

For the Moon at current radius `.075R` (60 px diameter when `R=400`), keep the filled lit lobe and dark disc, remove the `inkHi` outline or lower it to `inkMid`, and raise earthshine only enough to retain the limb. Render the terminator as one analytic half-ellipse, snapped to device pixels; no crater marks below roughly 80 px diameter. This matches the clock-aperture convention and uses `moonlight` as the only non-gold celestial accent.

For Earth at current radius `.30R` (240 px diameter at `R=400`; near the requested ~200 px), use a 1.25–1.5 px `inkHi` limb, 0.75–1 px `inkMid` equator/prime meridian, and 0.5–0.75 px `inkLow` secondary graticules. Replace full-ellipse “rings” with clipped orthographic curves if latitude/longitude meaning matters. Render night as a clipped, analytic terminator fill in `shadow` plus sparse hatching or a 5–8% ink wash; do not add a glow at the day edge.

## 5. Motion in instruments

### Annotated references

- [Emerald Observatory manual — original maker](https://emeraldsequoia.com/eo/EmeraldObservatory-Manual.pdf). The original instrument presents astronomical state—variable Moon apparent size, Earth location, rise/set, and sidereal indications—as clockwork information rather than spectacle. **Rule:** steal continuity and causal coupling, not its surface treatment.
- [Braun AB 21/S alarm clock, 1978 — Cooper Hewitt collection brochure](https://www.cooperhewitt.org/wp-content/uploads/2018/04/BobGselects_Brochure_013118_FINALspreads_lo_res.pdf). The Dieter Rams clock makes aliveness legible through one moving hand inside an exceptionally stable face. **Rule:** motion needs a stationary scale and a clear index; it does not need easing, bloom, or parallax.
- [Apple Human Interface Guidelines: motion](https://developer.apple.com/design/human-interface-guidelines/motion). Apple recommends using motion to communicate status and feedback while respecting reduced-motion preferences. **Rule:** animate only state that changes in the model and suppress decorative interpolation.
- [W3C WCAG 2.2, Pause/Stop/Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide). Automatically moving content lasting over five seconds needs a pause/stop/hide mechanism unless essential to the activity. **Rule:** provide a visible pause/freeze-time control even though the movement is slow; freezing must preserve the complete readable state.

At 0.25°/minute the sun moves only 0.00417°/s, generally below immediate visual detection. Signal life with a **once-per-minute index event**: on the minute, update the numeric timestamp and allow a 150–250 ms opacity settle on that readout only; keep celestial bodies on physically correct continuous positions with no easing. A tiny “LIVE” state word or pulsing animation is unnecessary. The changing relationship among sun, terminator, moon, and sidereal ticks is the proof of life.

Under `prefers-reduced-motion: reduce`, render directly at the current timestamp on a 60-second cadence, disable transitional opacity and all nonessential animation, and retain manual time scrubbing if present. In print/snapshot mode, freeze a timestamp and expose it in text.

## 6. Typography of engraved charts

### What the plates actually teach

[Flamsteed’s atlas](https://cudl.lib.cam.ac.uk/view/PR-ATLAS-00002-00001/1), [Bode’s atlas](https://digital-exhibits.lindahall.org/celestial/), and [Cellarius at the Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293) use contrast among engraved roman capitals, italic annotations, and smaller technical lettering. The useful pattern is functional, not nostalgic: capitals name regions, italics name figures/paths, and compact roman numerals label scales. **Rule:** one expressive serif role plus one disciplined data role is enough.

### Font evaluation

- **Keep Instrument Serif + IBM Plex Mono.** [Instrument Serif’s official repository](https://github.com/Instrument/instrument-serif) makes it available under the SIL Open Font License, and [IBM Plex’s official repository](https://github.com/IBM/plex) documents the open family and its mono cut. Instrument Serif has the high-contrast, compact display character appropriate to a wordmark; Plex Mono gives data a modern observatory voice without pretending to be an antique engraving. **Use:** Instrument Serif only for `DAY4 OBSERVATORY`, motto, and at most one ring title; Plex Mono for numerals, coordinates, timestamps, and controls.
- **Cormorant Garamond** ([official Google Fonts repository](https://github.com/googlefonts/Cormorant)) is the best free fallback for curved small caps and italic celestial labels. **Rule:** use Medium/Semibold at small optical sizes because its hairlines vanish on dark canvas.
- **Libre Caslon Display** ([official repository](https://github.com/impallari/Libre-Caslon-Display)) gives calmer eighteenth-century display color but is less distinctive than Instrument Serif. **Rule:** consider only if the wordmark needs less fashion-editorial contrast.
- **EB Garamond** ([official repository](https://github.com/octaviopardo/EBGaramond12)) is the best general-purpose open oldstyle family for longer explanatory copy. **Rule:** do not add it to the instrument unless supporting pages need a reading face; the constraint says no new dependency.

Recommendation: **do not replace the current pair and do not add a font dependency**. Canvas curved text requires per-glyph placement; reserve it for a short, widely tracked small-cap ring title (letter spacing ≈0.12–0.18em), never for live values. Confirm loaded font metrics before caching text geometry because Canvas fallback metrics differ.

## 7. Dark-UI craft and accessibility

WCAG 2.2 requires **4.5:1** for normal text, **3:1** for large text, and **3:1** for graphical objects and UI states that are required to understand or operate content ([WCAG 2.2 §§1.4.3, 1.4.11](https://www.w3.org/TR/WCAG22/)). It also says color must not be the only visual means of conveying information ([Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)).

The following are calculated by alpha-compositing the current sRGB token over `#0E2440`, then applying the WCAG relative-luminance formula. Canvas/browser color management can shift results slightly, so verify in the rendered browser.

| Current paint | Effective contrast | Consequence |
|---|---:|---|
| `inkHi` full / .95 / .90 / .80 | 12.26 / 11.16 / 10.20 / 8.30 | Safe for small text and primary geometry. |
| `inkHi` .55 / .45 | 4.70 / 3.59 | .55 passes normal text; .45 is suitable only for meaningful non-text, not small labels. |
| `inkMid` full / .90 / .80 | 5.45 / 4.69 / 4.01 | Full or .90 passes normal text; .80 does not. |
| `inkMid` .55 / .45 | 2.62 / 2.19 | Decorative only; current minor dial ticks at .55 fail 3:1 if needed to read time. |
| `inkLow` full / .90 / .80 / .55 / .45 | 2.11 / 1.96 / 1.81 / 1.49 / 1.36 | Decorative texture/construction only. Never encode required state with it. |
| gold full / gold .12 | 8.30 / 1.24 | Gold disc is excellent; current day wash is decorative only. |
| moonlight full | 13.84 | Excellent; avoid large solid areas that overpower the gold sun. |

Hairlines need more than a favorable mathematical ratio: antialiasing mixes them with the background. Keep required strokes ≥1 CSS px after transform, align axis-parallel 1 px strokes to half pixels where applicable, scale the backing store by DPR, and prefer 1.25–1.5 CSS px for the Earth limb and major ring boundaries. Gold against blue does not “vibrate” in the classic equal-luminance sense—its contrast is 8.30:1—but its large warm glow spreads the accent and weakens the strict color rule. Remove `sunGlow`; use a gold disc plus perhaps a thin pale keyline.

For accessibility, provide a DOM text equivalent adjacent to the canvas (current time, sunrise/set, moon phase/position, sidereal time), keyboard focus for controls, a high-contrast mode that promotes meaningful `inkLow`/`inkMid` strokes, and an explicit legend. For printing, switch to white paper, `#0E2440`/black ink, outline the sun and Moon with patterns or labels so meaning survives monochrome, freeze a timestamp, and omit grain. Respect reduced motion as described above.

## 8. Competitive and adjacent landscape

This survey extracts **geometry and information architecture only**, never the competitors’ textures or styling.

| Product/reference | Worth stealing | Failure to avoid |
|---|---|---|
| [Emerald Observatory manual](https://emeraldsequoia.com/eo/EmeraldObservatory-Manual.pdf) | Many astronomical quantities coexist because each occupies a stable instrument zone and the help system explains them. | The original’s many small dials distribute attention; Day4 needs one dominant 24-hour reading and fewer equal-status widgets. |
| [Emerald Chronometer, official App Store listing](https://apps.apple.com/us/app/emerald-chronometer/id284953670) | Mechanical-display discipline: correct Moon orientation, rise/set, zodiac positions, equation of time, and sidereal time each have a legible index. | A collection of 27 faces fragments the mental model; do not turn one coherent observatory into modes for every quantity. |
| [Cosmic-Watch, official App Store listing](https://apps.apple.com/us/app/cosmic-watch/id971231853) | Its 24-hour equatorial face and switchable Earth/celestial/solar-system views make reference frames explicit. | Feature accumulation and full-screen transitions compete with at-a-glance time; avoid layers, camera motion, and animated view changes on the primary face. |
| [NASA Eyes](https://eyes.nasa.gov/) | Time controls and labeled spatial relationships teach the model well. | 3D camera, photographic surfaces, and emissive space rendering are the exact anti-reference for Day4’s instrument face. |
| [JPL Solar System Dynamics: Horizons](https://ssd.jpl.nasa.gov/horizons/) | Numerical authority and explicit observer/time settings make every display auditable. | A parameter-first interface is not glanceable; put provenance and precision in an info panel, not the face. |
| [Stellarium Web](https://stellarium-web.org/) | Layer toggles and direct sky orientation are geometrically understandable. | Dense labels over a glowing sky become visual noise; Day4 should cap simultaneous labels and keep the field abstract. |
| [timeanddate Sun & Moon](https://www.timeanddate.com/astronomy/) | Separates current state from upcoming events and provides textual redundancy. | Tables dominate and the central astronomical relationship disappears; Day4’s face should remain primary with data as a companion. |
| [Apple Watch Astronomy face, Apple Watch user guide](https://support.apple.com/guide/watch/faces-and-features-apde9218b440/watchos) | Crown-driven time travel reveals slow change while retaining a fixed frame. | Photorealistic globe/lighting and zoom spectacle overpower instrumentation; steal scrubbing geometry, not rendering. |
| [Observable astronomy notebooks](https://observablehq.com/@d3/solar-terminator) | A solar-terminator notebook makes the algorithm inspectable and manipulable. | Explanatory controls and map layers are excellent for a lab but too prominent for an ambient clock. |
| [VirtualSky / Las Cumbres Observatory](https://virtualsky.lco.global/) | Lightweight browser astronomy demonstrates that useful sky geometry can be vector-driven. | Planetarium density and conventional cyan-on-black styling drift toward the anti-reference; keep only the accurate coordinate relationships. |

### Positioning opportunity

Day4 can occupy a clear gap: **a single-reference-frame astronomical clock that feels printed, not simulated**. Competitors usually choose mechanical skeuomorphism, glowing planetarium space, photorealistic globes, or numerical dashboards. The defensible geometry is one civil-day chapter ring, real bodies tied to it, and a central terrestrial explanation of day/night.

## Prioritized top 10 experiments

1. **Promote meaningful minor ticks to ≥3:1** — change the `.55 inkMid` dial minors in `web/src/ui/dial.ts` to roughly `.68`, or use `.45 inkHi`; retain `inkLow` only for decoration. **Effort: small.**
2. **Remove the sun glow** — delete the radial gradient in `web/src/ui/sun.ts`; retain the `.03R` gold disc and add at most a 1 px pale keyline. This restores “color belongs only to the sky” without emissive sci-fi treatment. **Effort: small.**
3. **Introduce a 3:2:1 tick cadence** — add 30-minute subdivisions and 3-hour intermediates while keeping labels at six hours; use length/weight before opacity. **Effort: medium.**
4. **Differentiate the Moon orbit from the sidereal ring** — break the `.72R` orbit behind/around the Moon and make it sparse; keep `.575R` as the continuous articulated scale. **Effort: small.**
5. **Replace Earth’s symbolic full ellipses with orthographic graticule curves** — preserve `.30R`, strengthen limb, reduce secondary lines, and clip correctly. **Effort: medium.**
6. **Refine the Earth terminator as an analytic clipped curve** — base the night boundary on subsolar geometry, use flat `shadow` plus optional sparse hatching, and eliminate any sense of airbrushed light. **Effort: medium.**
7. **Add seeded print variation** — one static 128×128 offscreen noise tile at 0.8–1.5%, a ≤3% low-frequency exposure field, no animated grain or distressed artifacts. **Effort: medium.**
8. **Add a DOM-readable instrument transcript and high-contrast mode** — expose time, rise/set, lunar phase, sidereal time, and location outside canvas; promote all meaningful strokes. **Effort: large.**
9. **Implement reduced-motion/frozen-time/print states** — minute-cadence direct updates for reduced motion, explicit pause, timestamped print palette, no grain. **Effort: medium.**
10. **Use curved serif lettering once** — add one short, tracked Instrument Serif small-cap ring title or motto; keep all data in IBM Plex Mono and cache glyph geometry only after fonts load. **Effort: medium.**

## Five images to keep open while designing

1. [Rasulid astrolabe, 1291 — Met](https://www.metmuseum.org/art/collection/search/444408): the best single reference for dense center / quiet limb / moving rete hierarchy.
2. [Cellarius Ptolemaic solar-path plate — Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--6d58fe2e0a9d3fe0d96959d9ace17293): concentric celestial storytelling around a calm globe.
3. [Anna Atkins, _British Algae_ — NYPL](https://digitalcollections.nypl.org/collections/photographs-of-british-algae-cyanotype-impressions): pale contact marks, Prussian tonal range, and non-uniform edge character.
4. [Paul Hager lunar dial — British Museum](https://www.britishmuseum.org/collection/object/H_1888-1201-142): binary moon phase against blue/black with age kept on a separate ring.
5. [Coronelli/Nolin globe projection — David Rumsey](https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~327985~90096576%3AComposite--Orthographic-Projection-): line-only spherical volume and graticule hierarchy at downloadable resolution.

## Limitations and validation plan

- Historic ring ratios are image-derived estimates, explicitly not museum-published measurements. Perspective-corrected photography or direct object measurements would be needed for scholarly precision.
- Several collection viewers expose their highest-resolution file only through an interactive zoom/download control; links therefore target durable object/collection pages rather than brittle image-CDN URLs.
- “Failure to avoid” entries are design critiques inferred from official screenshots and documented feature sets, not claims made by the product owners.
- WCAG ratios assume sRGB alpha compositing onto the flat `#0E2440` field. Test final rendered pixels at representative DPRs, zoom levels, and canvas sizes; antialiased hairlines can be perceptually weaker than token-level math.
- Before adopting ratios, render A/B snapshots at `R=240`, `R=400`, and `R=600`, in portrait and landscape, then check a one-second glance task: identify civil time, sun, Moon phase, day/night, and sidereal motion in that order.
