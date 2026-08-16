# Day4 Observatory visual design research (Sol edition)

_Single-researcher synthesis, prepared 2026-08-12. This brief independently rechecks a selective set of primary museum, library, standards, font-project, and product sources. It refines the existing “living cyanotype” identity for HTML Canvas 2D using the established blue ink system, brand-gold Sun, and off-white Moon; it does not propose photography, 3D, or another dependency._

## Reading the evidence

- **Published fact** means the linked institution or maker states it.
- **Image estimate** means I measured a straight-on collection image using the visible circular face radius, `R`, as the unit. It is a design estimate, not a catalog measurement; allow about ±0.02R for crop, bezel, and perspective.
- **Recommendation** is my synthesis for Day4, not a historical claim.

The current canvas already has a defensible skeleton: dial `0.875–0.985R`, Moon orbit `0.72R`, sidereal ring `0.575R`, Earth `0.30R`. Its problem is not insufficient ornament. It is that several unlike systems are drawn with similarly continuous circles while some meaningful marks are too faint. The governing direction is therefore: **keep the geometry and identity; clarify rank through interval, cadence, interruption, and stroke weight.**

## 1. Ring composition and proportion

### Best references

- [Rasulid astrolabe, 1291 — Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/444408). **Why it matters:** an extremely dense working center remains subordinate to a regular outer limb. **Published fact:** the Met gives a 15.6 cm case diameter and 12.7 cm rete/plate diameter. **Extractable rule:** the plate radius is `0.814` of the case radius, leaving a radial perimeter allocation near `0.186R`; in the front image, the engraved chapter/limb itself is approximately `0.10–0.13R` (**image estimate**). Give the most frequently read scale the cleanest perimeter, not the largest number of graphic effects.
- [Cellarius, Ptolemaic path of the Sun, 1660 — Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--25a24ae6c0d3ba5d74e3c5ded31ac09e). **Why it matters:** it stages a central Earth, several orbital paths, an outer zodiac, and an edge degree scale without treating every circle as equal. **Published fact:** the Rijksmuseum identifies the central Earth, eccentric solar path, outer zodiac, and degree division at the edges. **Extractable rule:** reserve roughly `0.18–0.24R` for the central body, group related fine paths within a broad annulus, and place a visibly wider quiet interval between conceptual families (**image estimates**: fine within-family gaps `0.015–0.03R`; family gap `0.04–0.07R`).
- [Astronomical clock by Henry Jenkins, 1778 — British Museum](https://www.britishmuseum.org/collection/object/H_1992-1001-1). **Why it matters:** it is a rare precedent for six concentric planetary indicators. **Published fact:** the museum describes six concentric rings, one for each planet, above a planisphere. **Extractable rule:** four-plus rings work when the rings share a grammar and each carries only one token; do not give every ring its own labels, fill, and tick vocabulary.

### Application

**Recommendation:** retain the current `0.110R` dial band; it already fits the historical `~0.10–0.13R` perimeter pattern. Keep the `0.275R` moat between sidereal ring and Earth. Make the Moon orbit a broken construction line—erase a `0.04–0.06R` arc around the Moon—and let the sidereal ring remain the sole continuous interior scale. Use this density sequence: **dense dial / sparse Moon path / articulated sidereal ring / quiet Earth moat**. Do not alternate colored annuli; dead space is the separator.

## 2. Tick and label hierarchy

### Best references

- [Clock-watch by Jan Bockeltz, ca. 1600 — Metropolitan Museum](https://www.metmuseum.org/art/collection/search/194191). **Why it matters:** it changes the kind of mark at different temporal levels. **Published fact:** the Met describes Roman hour numerals, star-shaped half-hour marks, and touch pins. **Extractable rule:** make intervals distinguishable by shape or length before opacity; the user should identify a major division from silhouette alone.
- [Flamsteed, _Atlas Coelestis_, 1729 — Cambridge Digital Library](https://cudl.lib.cam.ac.uk/view/PR-ATLAS-00002-00001/1). **Why it matters:** coordinate scaffolding, constellation figures, stars, and names coexist but occupy different visual registers. **Extractable rule:** continuous grids are hairlines; objects and boundaries are mid-weight; reading marks and names are strongest. Place labels in open pockets and avoid line collisions rather than outlining every label.
- [Bode, _Uranographia_, 1801 — Linda Hall Library](https://digital-exhibits.lindahall.org/celestial/). **Why it matters:** star importance reads immediately in engraved monochrome. **Extractable rule:** encode magnitude with graduated glyph size and weight; opacity is a supporting cue, never the only cue.

### Canvas specification

**Recommendation:** use three tick lengths in a `3:2:1` relationship and strokes near `2:1.4:1`. At `R=400`, test lengths `12/8/4 px` and widths `1.5/1.0/0.75 CSS px`. Make six-hour ticks major and labeled, three-hour ticks intermediate, hourly ticks regular, and half-hours short; if this is too dense at small sizes, remove half-hours before weakening all marks. Keep numerals upright and inside the chapter ring. The existing four labels (`00/06/12/18`) are enough.

## 3. Cyanotype materiality

### Best references

- [Anna Atkins, _Photographs of British Algae_ — New York Public Library](https://digitalcollections.nypl.org/collections/28d304b0-c612-012f-cd39-58d385a7bc34). **Why it matters:** the collection shows the process as scientific image-making, not a generic “vintage blue” filter. **Published fact:** NYPL explains that Atkins placed specimens against sensitized paper to obtain impressions and used Herschel’s cyanotype process. **Extractable rule:** primary forms read as pale contact silhouettes against a blue field; internal translucency and exposure variation provide depth without shadows or glow.
- [Anna Atkins cyanotype, ca. 1853 — Metropolitan Museum](https://www.metmuseum.org/art/collection/search/291537). **Why it matters:** the downloadable object image exposes the real scale of edge softness and field variation. **Extractable rule:** keep edges mostly decisive with occasional narrow tonal transitions; let variation occur at broad paper scale and fine grain scale, not as scratches, folds, or a vignette halo.
- [Historic American Buildings Survey — Library of Congress](https://www.loc.gov/pictures/collection/hh/). **Why it matters:** measured drawings demonstrate that “blueprint” character comes from drafting order and line-weight hierarchy. **Published fact:** the collection preserves measured drawings, photographs, and written histories of American architecture. **Extractable rule:** profiles, construction lines, and annotation must have distinct weights; distress is not a substitute for drafting discipline.

### Digital treatment

**Recommendation:** generate a deterministic 96–128 px monochrome noise tile in an offscreen canvas on resize, blur it about `0.7 px`, and composite at `0.8–1.2%` opacity. Add one broad exposure field no greater than about `±2%` luminance. A secondary line pass displaced at most `0.3 px` and `4–6%` alpha can soften only the most important pale marks. Never animate the grain. Avoid paper fibers, stains, scratches, bloom, and multiply-layer “weathering”; those make a theatrical prop rather than a living print.

## 4. Moon and Earth rendering conventions

### Best references

- [Astronomical lunar clock by Wolfgang Hager, ca. 1630 — British Museum](https://www.britishmuseum.org/collection/object/H_1888-1201-142). **Why it matters:** phase and lunar age are separated into different channels. **Published fact:** the museum describes a blued-steel lunar disc with gilded ring and Moon figures, rotating behind a Moon aperture, while the dial also indicates lunar age. **Extractable rule:** show phase as one high-contrast silhouette and position/age on a surrounding system; never crowd the Moon disc with data.
- [James Wilson terrestrial globe, 1828 — Metropolitan Museum](https://www.metmuseum.org/art/collection/search/8487). **Why it matters:** limb, geography, and graticule create volume through line alone. **Extractable rule:** use a strongest outer limb, mid-weight simplified coasts if present, and faint clipped graticules; hierarchy should survive in monochrome.
- [USGS Professional Paper 1395, _Map Projections—A Working Manual_](https://pubs.usgs.gov/pp/1395/report.pdf). **Why it matters:** it gives a primary technical basis for a truthful orthographic globe. **Published fact:** USGS describes orthographic projection as the perspective view from an infinite distance. **Extractable rule:** if lines claim latitude and longitude, project sampled geographic coordinates and clip them to the disc; generic nested full ellipses are ornament, not a true graticule.

### Small-disc rules

**Recommendation — Moon (~60 px):** retain the analytic lit lobe and dark disc, with earthshine just sufficient to preserve the new-Moon limb. Use no craters. Reduce the current bright outline to a secondary keyline; the phase boundary should carry the reading.

**Recommendation — Earth (~200–240 px):** use approximately `1.5 px` limb, `0.9 px` equator/central meridian, and `0.6 px` secondary graticules. Replace the current symmetric full ellipses with sampled orthographic meridians/parallels. Draw the night hemisphere as one clipped analytic shape in `shadow`; if another value is needed, use sparse line hatching or a flat `5–8%` ink wash, not airbrushed falloff.

## 5. Motion in instruments

### Best references

- [Emerald Observatory manual — Emerald Sequoia](https://emeraldsequoia.com/eo/EmeraldObservatory-Manual.pdf). **Why it matters:** the original product treats changing astronomy as coordinated clockwork information. **Published fact:** its manual documents Moon phase/apparent size, Earth position, rise/set indications, and sidereal displays. **Extractable rule:** moving quantities remain anchored to permanent scales; motion communicates their causal relationship rather than decorating the screen.
- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion). **Why it matters:** it frames motion as communication and asks interfaces to respect reduced-motion settings. **Extractable rule:** animate model state, not ambience; avoid easing that implies false acceleration in a scientific instrument.
- [WCAG 2.2, Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide). **Why it matters:** continuously moving interfaces need user control when the criterion applies. **Published fact:** automatically moving content that lasts more than five seconds and appears alongside other content requires a pause/stop/hide mechanism unless essential. **Extractable rule:** expose “freeze time” while keeping the entire state readable.

At `0.25°/min`, the Sun moves `0.00417°/s` (**calculation**), so a user will infer life from change over time, not see motion moment to moment. **Recommendation:** render celestial positions continuously from the clock with no easing; update the textual timestamp on the minute, optionally with a `150–200 ms` opacity settle. Do not pulse “LIVE,” shimmer stars, or animate grain. Under `prefers-reduced-motion: reduce`, sample directly at 60-second intervals and remove transitions; keep manual time travel available because it is user-controlled and informative.

## 6. Typography of engraved charts

[Flamsteed’s atlas](https://cudl.lib.cam.ac.uk/view/PR-ATLAS-00002-00001/1), [Bode’s atlas](https://digital-exhibits.lindahall.org/celestial/), and the [Cellarius plate at the Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--25a24ae6c0d3ba5d74e3c5ded31ac09e) show a recurring functional contrast: capitals name regions or major structures, sloped/italic forms annotate figures and paths, and compact roman figures label scales. **Extractable rule:** evoke engraving through role and spacing, not by making every label antique.

- **Keep Instrument Serif + IBM Plex Mono.** The [Instrument Serif project](https://github.com/Instrument/instrument-serif) and [IBM Plex project](https://github.com/IBM/plex) publish the families under the SIL Open Font License; IBM documents Mono as part of the Plex family. **Recommendation:** Instrument Serif for the wordmark, motto, and at most one categorical ring title; IBM Plex Mono for all live values, numerals, coordinates, and controls. The contrast between expressive title and disciplined telemetry is exactly right.
- [Cormorant](https://github.com/CatharsisFonts/Cormorant) is the strongest open alternative for engraved-feeling italics and tracked capitals, but its fine hairlines are fragile on a dark canvas. **Recommendation:** do not add it under the no-new-dependency constraint; borrow only its lesson—slightly generous tracking and a stronger weight at small sizes.
- [EB Garamond](https://github.com/octaviopardo/EBGaramond12) is a better open reading face for supporting editorial pages than for the clock face. **Recommendation:** it is unnecessary here.

For one curved title, place glyphs individually on the arc, use `0.12–0.16em` tracking, and keep the phrase short. Cache geometry only after `document.fonts.ready`; otherwise fallback metrics can permanently mis-space canvas text.

## 7. Dark-UI craft and accessibility

**Published fact:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) sets `4.5:1` minimum contrast for normal text, `3:1` for large text, and `3:1` for meaningful graphical objects/UI states; it also requires that color not be the sole carrier of information. Decorative marks are exempt, but a tick needed to read time is not decorative.

Using WCAG’s sRGB relative-luminance calculation after alpha compositing onto `#0E2440`, the current tokens give these approximate ratios (**calculation**):

| Paint on `#0E2440` | Contrast | Use |
|---|---:|---|
| `inkHi` full | 12.26:1 | Primary text and geometry |
| `inkMid` full | 5.45:1 | Small labels/data |
| `inkMid` at `.55` | 2.62:1 | Decoration only; current minor dial ticks are too faint if required |
| `inkLow` full | 2.11:1 | Construction/texture only |
| gold full | 8.30:1 | Sun accent |
| moonlight full | 13.84:1 | Moon accent |

**Recommendation:** promote every required scale mark to at least `3:1` in its final composited pixels; `inkMid` near `.68` is a useful starting test for current minor ticks. Required hairlines should be at least `1 CSS px`, with major boundaries `1.25–1.5 px`, because antialiasing weakens their effective edge contrast. The gold/blue pair has ample luminance separation, but the current `0.085R` radial glow expands gold into a large soft area and reads as the explicit sci-fi anti-reference. Remove it; keep the `0.03R` gold disc and a thin pale keyline.

Canvas is not an accessible text tree. **Recommendation:** provide a DOM transcript containing civil time, sunrise/sunset, Moon phase and position, sidereal time, location, and frozen/live state; give controls keyboard focus and visible labels. Add a high-contrast mode that promotes required faint strokes. Print mode should freeze and print the timestamp, switch to white paper with dark-blue/black linework, outline or label Sun and Moon so meaning survives monochrome, and omit grain. Reduced-motion behavior should follow section 5.

## 8. Competitive and adjacent landscape

These are geometry and information-architecture critiques inferred from official product pages/manuals, not claims by their makers.

| Product | One thing worth stealing | One failure to avoid |
|---|---|---|
| [Emerald Observatory](https://emeraldsequoia.com/eo/EmeraldObservatory-Manual.pdf) | Stable zones and pointers let many astronomical quantities share a clockwork model. | Numerous equal-status subdials diffuse the primary reading; Day4 should keep one dominant day ring. |
| [Cosmic-Watch](https://apps.apple.com/us/app/cosmic-watch/id971231853) | Its equatorial 24-hour clock and selectable reference frames make astronomical relationships teachable. | Many layers, 3D views, atmosphere, textures, trails, labels, and transitions compete with glanceability; take the geometry, not the spectacle. |
| [Apple Watch Astronomy face](https://support.apple.com/guide/watch/faces-and-features-apde9218b440/watchos) | Crown-driven time travel exposes slow change while the user remains in control. | Photorealistic globes and zoom transitions overpower instrument abstraction. |
| [NASA Eyes](https://eyes.nasa.gov/) | A visible time controller and labeled spatial relationships make the model explorable. | Camera movement, photographic surfaces, and emissive space are Day4’s anti-reference. |
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Explicit observer, time, coordinate, and output choices make results auditable. | Parameter-first density belongs in an information panel, not on an ambient face. |
| [Stellarium Web](https://stellarium-web.org/) | Layer control and a stable horizon make sky orientation understandable. | Labels over a luminous star field quickly become planetarium noise. |
| [timeanddate Sun & Moon](https://www.timeanddate.com/astronomy/) | Text tables redundantly expose present state and upcoming events. | Tables obscure the central spatial relationship; use them only as the canvas transcript/companion. |
| [VirtualSky, Las Cumbres Observatory](https://virtualsky.lco.global/) | Browser-native vector geometry proves a useful sky model need not be photorealistic. | Conventional cyan-on-black star-map density would erase Day4’s printed identity. |

The available position is distinctive: **one auditable astronomical reference frame that feels printed rather than simulated**. Keep accuracy and time travel from scientific tools; keep stable zones from clocks; reject their photographic, emissive, multi-view, and dashboard surfaces.

## Prioritized top 10 changes to try

1. **Remove the Sun glow** and retain the gold disc plus 1 px pale keyline. Highest identity gain for the least work. **Effort: small.**
2. **Promote meaningful minor dial ticks above 3:1** (`inkMid` around `.68` as a starting point), leaving `inkLow` for decoration only. **Effort: small.**
3. **Break the Moon orbit around the Moon** and lower its continuity; keep the sidereal ring as the articulated interior scale. **Effort: small.**
4. **Add a real tick cadence:** six-hour major, three-hour intermediate, hourly regular, half-hour minor; encode rank by length and weight. **Effort: medium.**
5. **Replace Earth’s ornamental full ellipses with sampled orthographic graticules**, clipped to the `0.30R` disc. **Effort: medium.**
6. **Draw an analytic Earth terminator** as a clean clipped shape tied to solar geometry, with no airbrushed edge. **Effort: medium.**
7. **Add static, seeded cyanotype variation** at `0.8–1.2%` grain and no more than `±2%` broad exposure variation. **Effort: medium.**
8. **Add reduced-motion, freeze-time, and print states**, including a visible timestamp and grain-free monochrome output. **Effort: medium.**
9. **Add a DOM-readable transcript and high-contrast mode** so the canvas is not the sole carrier of astronomical data. **Effort: large.**
10. **Use Instrument Serif once inside the instrument** for a short curved title or motto at `0.12–0.16em` tracking; keep Plex Mono everywhere quantitative. **Effort: medium.**

## Five images to keep open

1. [Rasulid astrolabe, 1291 — Met](https://www.metmuseum.org/art/collection/search/444408): best reference for a disciplined limb surrounding a dense moving center; extract the perimeter-to-field proportion.
2. [Cellarius solar-path plate — Rijksmuseum](https://www.rijksmuseum.nl/en/collection/object/Hemelkaart-van-de-baan-van-de-zon-rond-de-aarde-volgens-Ptolemaeus--25a24ae6c0d3ba5d74e3c5ded31ac09e): best reference for ring families separated by meaningful quiet intervals.
3. [Flamsteed, _Atlas Coelestis_ — Cambridge Digital Library](https://cudl.lib.cam.ac.uk/view/PR-ATLAS-00002-00001/1): best reference for monochrome hierarchy among grids, objects, stars, and labels.
4. [Atkins, _Photographs of British Algae_ — NYPL](https://digitalcollections.nypl.org/collections/28d304b0-c612-012f-cd39-58d385a7bc34): best reference for authentic cyanotype edge, field, and tonal restraint.
5. [Hager lunar clock — British Museum](https://www.britishmuseum.org/collection/object/H_1888-1201-142): best reference for separating Moon phase from Moon age/position.

## Validation boundaries

Historical ratios above are image estimates, not museum-published dimensions unless explicitly identified. Collection links target durable object viewers because direct high-resolution asset URLs often change. Competitive “failures” are design judgments from official screenshots and feature descriptions. Before adopting any rule, render snapshots at `R=240`, `400`, and `600`, both portrait and landscape, and run a one-second glance test in this order: civil time, Sun, Moon phase, Earth day/night, sidereal ring. Verify contrast from final rendered pixels at representative device-pixel ratios; token math alone does not capture hairline antialiasing.
