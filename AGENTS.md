# Repository Guidelines

## What lives here

- **`web/` is the product.** Day4 Observatory, a public web app (Vite + strict
  TypeScript + Canvas 2D) at <https://chrisp671.github.io/Day-4-Observatory/>.
- **`Classes/`, `EC/`, `Resources*/` are the parked Objective-C++ original** —
  ~8.7 KSLOC from Emerald Observatory (MIT, a community fork of
  github.com/EmeraldSequoia, upstream last commit 2023-11-09), kept as the
  **behavioural spec** while porting. It has no test target. No iOS work, App Store
  publishing or AI feature work is in scope (PLAN.md DEC-006, section 4) without a
  new DEC from the owner.
- **`PLAN.md` is the plan of record** — DEC-xxx, REQ-xxx, CHK-xxx, WI-xxx,
  QST-xxx. Read it before changing intent; do not change it without a DEC.

### The three views, and what is not to be renamed

| Visible label | Internal mode id | What it is |
|---|---|---|
| **Stargazer** | `day4` | The original instrument: clock face, sun/moon rings, phase, Earth, time travel, TONIGHT board. |
| **Constellations** | `constellations` | Up Now / Rising Later list plus a star-pattern chart. |
| **Planets** | `planets` | The five naked-eye planets with rise/peak/set, where to look, and a NASA reference photo. |

DEC-040 renamed only the *visible label* of the first view; its internal id is still
`day4`, so stored keys, element ids and a visitor's remembered selection are
unaffected. The brand is unchanged — "Stargazer" names a view inside the app, it does
not rename the product. Historical documents keep the name they were written with:
do not rewrite DEC-038 or older entries.

## Commands

All from `web/`, Node 22:

```shell
npm ci
npm test                # vitest run — 436 tests
npx tsc --noEmit        # strict
npm run build           # tsc --noEmit && vite build
npm run dev
```

CI runs test and build on every push to `main` and a required **Web review** on
every PR. `main` is protected (strict, admins enforced) — never bypass it without
the owner's explicit OK.

The gate reads commit statuses, not check runs, and the reviewer publishes to
**both** — so `gh pr checks` showing green is not proof the gate is satisfied. Check
`/commits/<sha>/status` has a `Web review` context before assuming a merge will be
allowed. A fix to the reporter itself is the one case that needs an admin merge,
because the reporter runs from the default branch.

Browser drivers for layout, keyboard and rendering work, after
`npx vite preview --port 4173 --strictPort --host 127.0.0.1`:
`node scripts/modes.mjs|planets.mjs|constellations.mjs|freeze.mjs|trouble.mjs <url>`.
To reproduce the GitHub Pages mount (assets resolve wrong at the origin root
otherwise): `node scripts/serve-mounted.mjs Day-4-Observatory 4174`. Pixel
comparison: `node scripts/review/capture.mjs` then
`node scripts/compare-shots.mjs before after [allowedState…]`.

`gh` needs `-R Chrisp671/Day-4-Observatory`; bare `gh` hits the upstream fork.
PR bodies carry exactly one `Builder-Model-Family:` line, and cite plain
three-digit IDs.

The line names the model family that built the change: `openai`, `anthropic`,
`google`, `qwen` or `glm`, and never the reviewer's own family. A builder running
as a routed model that cannot identify its underlying family declares
`routed-unknown` instead of guessing — matched verbatim, and the independence
check is then skipped and shown in the review comment. `scripts/review/README.md`
has the rules. The reviewer's citation check accepts only `DEC|REQ|WI|CHK|SEAM`, so
a PR that cites nothing but an `RSK` entry is rejected.

## Module organization

```
web/src/main.ts            what a viewer can change (~210 lines)
web/src/app/shell.ts       the only file that knows an element id; binds input, paints a Scene
web/src/app/scene.ts       SEAM-003: everything the page shows, in dial units and final strings
web/src/app/scene-*.ts     light/band/sun/moon/earth/marks, rete/readouts/tonight/transcript
web/src/engine/frame.ts    SEAM-001: frame(unixMillis, lat, lon) -> FrameState (the only astronomy call)
web/src/ui/*.ts            pure painters, one Scene slice each
```

Preserve the three seams. Views never call an astronomy API; the shell and
painters know no astronomy, no milliseconds and no caching. A new UI painter is a
pure function of a Scene slice — if it needs data the Scene does not carry,
extend the contract as a reviewed change, not by reaching around it.

**The architecture bar** (DEC-037, the owner's standing rule, not a preference):

- **Contract before bodies.** DEC-037 worked because the types and comments were
  written and locked first, then built against as a read-only spec. Follow that
  order.
- **Deep modules, no information leakage, no temporal decomposition.** A module
  should be usable through a small surface without the caller needing to know how
  or when its internals run.

## Style

Follow the file you are editing: the codebase is deliberately consistent about
method shape, no semicolon-free tricks, and unit tests sitting beside the module
as `<name>.test.ts`. All user-visible text reaches the DOM via `textContent`.
Maths stays 24-hour inside; display converts at the edge (`app/clock12.ts`).
Colours come from the theme tokens in `ui/theme.ts` — never a second palette
(`PLANET_COLORS` is one token shared by ring, swatch and band).

Design rules that are the owner's decisions, not house style to be improved on:

- **Subtraction is the next level** (DEC-026). Adding a band below the dial
  requires something else to leave. New widgets require a DEC. A band that is
  absent in the ordinary case is a permission, not a precedent — see RSK-007.
- **Colour only where the sky provides it** (DEC-009/010), driven by real solar
  altitude. The page follows the light; it does not decorate with it.
- **Never trust a 2× screenshot over a real phone** (DEC-036). A rendered
  screenshot has already passed a design that one phone photo rejected.

## Accessibility

- Tabs are `role=tablist`/`tab`/`tabpanel` with arrow/Home/End keys and one tab
  stop. Planet rows are real `<button>`s carrying `aria-pressed` and
  `aria-expanded`. The dial carries a spoken transcript via `aria-describedby`.
- `prefers-reduced-motion` drops the tick cadence to once a minute.
- Every control says what it does, and does it: a button that renders as armed
  must not be inert. The `NOW`-while-held defect (fixed in `returnToPresent`) is
  what this rule is about — the promise and the behaviour have to match.

## Testing

Every behavioural change ships with a test. The port pattern is a pure-math
module plus a **convention** test (noon-top, clockwise, north-up) with a thin
draw module on top; that is what mitigates RSK-001. A pure module cannot see a
click handler, so any behaviour that lives in wiring needs a driver clause too —
assert the rule in the module *and* the consequence in the browser.

For UI, layout, keyboard or asset changes, run the matching driver script at both
390×844 and 820×1180 and add or update a capture state. `npx tsc --noEmit` clean
and `npm test` green are required. If you add or regenerate a vendored asset,
update `web/public/ATTRIBUTION.md` with source and SHA-256 — the attribution tests
check it.

Mutate the gate, not just the test: reintroduce the defect and confirm the
driver fails with the message you expect. `npm test` passing proves very little on
its own — the review gate and `NOW` both shipped green.

## Commits and pull requests

One concise imperative subject per commit, in the repo's existing style. A PR
body states the problem, the user-visible change, how it was verified, and cites
the PLAN.md IDs it advances. Note any edited localisation or attribution file.
Screenshots for UI or text-layout changes — and a real phone check when the
change is visual, since a screenshot loop has passed a design a phone rejected.

## Configuration notes

`web/package.json` has one runtime dependency, `astronomy-engine` (MIT). The
chart data under `web/public/charts/` comes from d3-celestial (BSD-3-Clause,
pinned commit) and is regenerated by `scripts/build-charts.py`; the planet photos
under `web/public/planets/` are vendored NASA public-domain images. All are
same-origin; the page's only third-party requests are its own web fonts.

The parked iOS app builds in `ios-simulator-build.yml`, restricted by `paths:` to
its own sources so web-only changes skip it. Its four sibling EmeraldSequoia
libraries are third-party and **not archived** — four were pushed 2026-09-16 —
so `scripts/bootstrap_dependencies.sh` fetches each at the pinned commit in its
own table rather than at HEAD, and refuses a clone that has drifted. Change what
is trusted by editing that table in its own commit with a green build. RSK-002 is
closed; RSK-006 is the review debt that pin leaves behind.

### If you ever resume iOS work

`Classes/EOClock.mm` (~120 KB) is the astronomical orchestrator and the source of
truth for behaviour: REQ-005's stepping rules live at `EOClock.mm:440-493` and
`680-758`, and the layout table was transcribed from `EOClock.mm:1520-1729` into
`analysis/observatory/layout-table.md`. Class prefixes are `EO*` this app, `EC*`
Emerald Chronometer audio, `ES*` the external libraries. Expect manual
retain/release (no ARC annotations), `.mm` where C++ interop is used, tabs, macros
in `Constants.h`, and 8 localisations in `*.lproj/`.
