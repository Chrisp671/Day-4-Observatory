# CLAUDE.md - Day4 Observatory

## What this repository is

Two things live here, and only one of them is being built.

- **`web/` is the product.** Day4 Observatory is a public web app: a live
  astronomical instrument under the Day4 Astronomy brand. It ships to GitHub
  Pages at <https://chrisp671.github.io/Day-4-Observatory/>.
- **`Classes/`, `EC/`, `Resources*/` are the parked original.** ~8.7 KSLOC of
  Objective-C++ from Emerald Observatory (MIT, a community fork of
  github.com/EmeraldSequoia, upstream last commit 2023-11-09). It is kept as the
  **behavioural spec** while porting — read it to learn what a view is supposed
  to do — not as code to build. It has no test target.

An earlier version of this file described reviving the iOS app for the App Store
with an AI roadmap. **That is not the project's direction.** iOS work, App Store
publishing and AI features are v1 non-goals (PLAN.md DEC-006, section 4) and
are not to be started without a new DEC from the owner.

**The parked iOS app does still build, in CI.** `ios-simulator-build.yml` runs
`scripts/build_simulator.sh` on a macOS runner and uploads the simulator app. It
is restricted by `paths:` to the app's own sources, so it does not run for
web-only changes, and it can be run by hand. That matters more than it sounds:
the build needs four sibling libraries from the third-party EmeraldSequoia org,
which is **not archived** — `esutil`, `estime`, `eslocation` and `esastro` were
last pushed 2026-09-16, and this repository has read-only access to them. So
`scripts/bootstrap_dependencies.sh` fetches each one at a **pinned commit**
recorded in its own table, not at HEAD. RSK-002 is closed as of 2026-09-25.
Changing what is trusted means editing that table, in a commit of its own, with
a green build — never as a side effect of a rebuild.

**PLAN.md is the plan of record.** Decisions are DEC-xxx, requirements REQ-xxx,
checks CHK-xxx, work items WI-xxx, open questions QST-xxx. Read it before
changing anything; do not change intent without a DEC.

## Naming, current as of 2026-09-25

The app has **three views** in one shell, switched by a tab row:

| Visible label | Internal mode id | What it is |
|---|---|---|
| **Stargazer** | `day4` | The original instrument: clock face, sun/moon rings, phase, Earth, time travel, TONIGHT board. |
| **Constellations** | `constellations` | Up Now / Rising Later list plus a star-pattern chart. |
| **Planets** | `planets` | The five naked-eye planets with rise/peak/set, where to look, and a NASA reference photo. |

The first view was called **Day 4** until DEC-040 (2026-09-25), which renamed
only the visible label. Its internal id is still `day4`, so stored keys, element
ids and a visitor's remembered selection are unaffected. Historical documents
keep the name they were written with — do not rewrite DEC-038 or older entries.

The **brand is unchanged**: the app is Day4 Observatory under Day4 Astronomy
(day4.org), and the header logo, verse and gold are as they are. "Stargazer"
names a view inside the app; it does not rename the product.

## Build, test, and verification

Node 22, all commands from `web/`:

```shell
npm ci
npm test                # vitest run — 343 tests
npx tsc --noEmit        # strict; also runs as part of npm run build
npm run build           # tsc --noEmit && vite build  (relative base, for the Pages mount)
npm run dev
```

Everything must be green before a PR. CI runs `npm test` then `npm run build` on
every push to `main` that touches `web/`, and a model **Web review** on every PR
(`review-web.yml`) — that is the one required check on `main`, which is protected
(strict, admins enforced). **Never bypass branch protection without the owner's
explicit OK.**

Browser drivers, for anything touching layout, keyboard or rendering. Serve
first, then drive:

```shell
npx vite preview --port 4173 --strictPort --host 127.0.0.1
node scripts/modes.mjs            http://127.0.0.1:4173/
node scripts/planets.mjs         http://127.0.0.1:4173/
node scripts/constellations.mjs  http://127.0.0.1:4173/
```

Asset paths break under the `/Day-4-Observatory/` Pages mount if you resolve them
from the origin root (this bit us once — CR-1, PR #18). To reproduce the real
mount locally: `node scripts/serve-mounted.mjs Day-4-Observatory 4174`, then
drive `http://127.0.0.1:4174/`. For pixel work: `node scripts/review/capture.mjs`
then `node scripts/compare-shots.mjs before after [allowedState…]`, which fails
if any capture outside the allowed states differs.

`gh` always needs `-R Chrisp671/Day-4-Observatory`; bare `gh` hits the upstream
fork. PR bodies carry exactly one `Builder-Model-Family:` line, and cite plain
three-digit IDs (`DEC-040`, `CHK-005`).

Name the family your model actually belongs to — `openai`, `anthropic`, `google`,
`qwen` or `glm` — and it must not be the reviewer's family, or the gate refuses
the PR. If you are running as a **routed** model and genuinely cannot tell which
family that is, declare `routed-unknown` rather than guessing: that value exists
because a plausible-looking guess in this field is indistinguishable from a
verified one to everything downstream. It is matched verbatim, so it must be
typed exactly, and the independence check does not run for it — the published
review comment says so in a `Builder family:` line. `scripts/review/README.md`
has the full rules.

## Architecture

```
index.html ─ main.ts ─ app/shell.ts ─ app/scene.ts ─ engine/frame.ts ─ astronomy-engine
                             │             │
                             │             └── app/scene-core.ts, app/scene-plinth.ts
                             └── ui/*.ts   (pure painters, one Scene slice each)
```

Three seams, and the code is organised so that nothing crosses them:

- **SEAM-001 `frame(unixMillis, lat, lon) → FrameState`** (`engine/frame.ts`) is
  the only place astronomy is computed from a timestamp and a station. Views
  never call an astronomy API. This is the Rust/WASM swap contract (DEC-002) and
  the primary test seam.
- **SEAM-003 `scene(request) → Scene`** (`app/scene.ts`) is the page seam
  (DEC-037): everything the page shows, in dial units and final strings, from one
  call per tick. It never throws and memoises internally. The shell and the
  painters know no astronomy, no milliseconds and no caching.
- **SEAM-002** every painter under `ui/` is a pure function of one Scene slice,
  so it is testable headlessly.

`app/shell.ts` is the only file that knows an element id (one `IDS` table),
binds each input once, and paints a Scene idempotently. `main.ts` is ~210 lines
and holds only what a viewer can change.

## House rules, learned the hard way

- **Contract before bodies.** DEC-037 worked because the types and comments were
  written and locked first, then built against as a read-only spec. Follow it.
- **Deep modules, no information leakage, no temporal decomposition** (the
  owner's standing architecture bar, DEC-037).
- **Test the convention, not just the number.** A pure-math module with a
  convention test (noon-top, clockwise, north-up) is the port pattern; the thin
  draw module on top stays dumb. This is how RSK-001 is mitigated.
- **Never trust a 2× screenshot over a real phone.** DEC-036: a rendered
  screenshot passed a design that one phone photo rejected.
- **Subtraction is the next level** (DEC-026). Adding a band below the dial
  requires something else to leave. New widgets require a DEC.
- **Colour only where the sky provides it** (DEC-009/010), driven by real solar
  altitude; the page follows the light.
- **All user-visible text reaches the DOM via `textContent`**, never `innerHTML`.
- **A picture is fetched only when its row is on screen**, and vendored assets are
  same-origin. The page's only third-party requests are its own web fonts.
- Attributions are load-bearing: `web/public/ATTRIBUTION.md` (NASA photos, with
  source SHA-256) and `web/public/charts/` (d3-celestial, BSD-3-Clause, pinned
  commit). Read them before adding or regenerating assets; the licence terms and
  the credit links are tested.
- Tabs are accessible: `role=tablist`/`tab`/`tabpanel`, arrow/Home/End keys, one
  tab stop. Planet rows are real `<button>`s with `aria-pressed` and
  `aria-expanded`. The dial carries a spoken transcript via `aria-describedby`.
- `prefers-reduced-motion` drops the tick cadence to once a minute.

## Parked original, if you must read it

`Classes/EOClock.mm` (~120 KB) is the astronomical orchestrator and the source of
truth for behaviour — REQ-005's stepping rules live at `EOClock.mm:440-493` and
`680-758`, and the layout table was transcribed from `EOClock.mm:1520-1729` into
`analysis/observatory/layout-table.md`. Class prefixes: `EO*` this app, `EC*`
Emerald Chronometer audio, `ES*` the external libraries. If you ever do resume
iOS work: manual retain/release (no ARC annotations), `.mm` where C++ interop is
used, tabs, macros in `Constants.h`, and 8 localisations in `*.lproj/`.
