# Spec: Planet photos in the app (from the planet-photos prototype)

Status: DRAFT for owner review — handed to the application agent (Anthropic builder, `scene` lineage).
Source artifact: `planet-photos-proto/index.html` (local Tailscale preview, 2026-09-16). The prototype is throwaway; this spec carries over what it proved.

## Problem

The prototype demonstrated a "companion to the dial" presentation: NASA reference
photography for Sun, Moon, and the eight planets, each identified by its Day4 dial
color (accent bar, color band, dialog border), with honest disclaimers ("reference
imagery, not live, not the current phase") and per-body source links. The owner
wants this incorporated into the real app.

## Placement decision (recommended, needs owner confirmation)

Integrate into the **existing Planet mode detail panel** (`#planet-detail-*`,
WI-031): when a row opens its details, show the photo, color band, and credit
there. The prototype's dialog layout maps 1:1 onto the existing detail flow.

- Sun & Moon keep their existing Day 4 dial/plinth presence; their photos are
  out of scope for the first ticket (possible follow-up, owner's call).
- A standalone fourth "photos" mode would require a DEC-038 amendment and is
  not proposed.

## Owner decisions required before implementation (new DECs)

1. **Imagery policy** — vendored vs hotlinked. Recommendation: vendor the ten
   images into `web/public/` at ~1024px (compressed), with an `ATTRIBUTION.md`
   entry crediting NASA (public domain). The app currently makes zero runtime
   external requests; vendoring preserves that offline/no-tracking posture.
   Hotlinking (as the prototype does, with `no-referrer`) is acceptable only if
   the owner accepts a new external dependency and graceful-degradation duty.
2. **Color source** — the prototype hardcodes a colors map. In the app the
   per-body color must come from the existing theme tokens so dial and photo
   accents can never drift apart. If a token is missing for a body, add it at
   the theme layer, not in the painter.

## Architecture constraints (existing DECs, unchanged)

- DEC-037: photo path + credit strings are presentation data (shell/config or a
  static asset table); `Scene.planets` gains no new astronomy fields. Painters
  stay pure functions of their slice.
- DEC-038: no new words on the clock dial; the dial-text rule and hour-numeral
  exception are untouched. Photos live in the dedicated detail panel.
- Accessibility: every `<img>` gets alt text that states it is a NASA reference
  photo, not live imagery; credit link opens in a new tab with
  `rel="noopener noreferrer"`.

## Tickets (blocking edges declared; numbering subject to owner/PLAN.md)

- **WI-033a — Imagery DEC + assets** (no blockers): owner records the imagery
  DEC; application agent vendors the ten images (or wires the approved hotlink
  policy), writes `web/public/ATTRIBUTION.md`, and pins exact filenames/sizes.
- **WI-033b — Photo in planet detail** (blocked by WI-033a): extend the planet
  detail panel with photo, color band (theme token), credit link, and the
  "reference imagery, not live" notice. Keyboard and `aria` behavior of the
  existing rows must not change. `scripts/planets.mjs` extended to assert the
  detail panel shows the photo and credit for at least one planet, and that
  Day 4 remains pixel-identical in its eight states.
- **WI-033c — Follow-up (optional, owner's call)**: Sun/Moon photos in the Day 4
  detail flow; below-horizon/arc-note rows keep working with photos present.

## Review-pipeline coordination (pipeline agent's ownership, runs in parallel)

- Add a capture state: planet detail with photo visible, both viewports
  (390×844, 820×1180), staying under the 6 MB request bound (replaces or joins
  the current selected-row state; final matrix is the pipeline agent's call).
- Rubric addition: photo and credit legibility in the detail panel; dial-canvas
  rule unchanged; photo alt text verified in the DOM check, not the screenshot.
- Do not merge WI-033b before the capture extension lands, same stacked order
  as WI-030..032.

## Acceptance

- All existing tests + `tsc --strict` green; planets.mjs asserts photo/credit.
- Pipeline evidence run shows the new state legible at both viewports with no
  BLOCKING findings.
- Owner visual approval on the deployed URL (CHK-005 style).
