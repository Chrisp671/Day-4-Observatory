# Modernization Assessment — Emerald Observatory (Day-4-Observatory fork)

*Assessed 2026-08-06. Produced by `/modernize-assess` (single-system mode) against the repo root. Three parallel deep-analysis agents (structure, technical debt, security) plus direct inventory. Modernization goal under evaluation: **web app port** (Rust/WASM engine + TypeScript canvas UI).*

---

## Executive Summary

Emerald Observatory is a compact (~8.7 KSLOC local) pre-ARC Objective-C++ iPad astronomy clock whose entire behavioral specification is concentrated in one 2,573-line god object (`Classes/EOClock.mm`) and whose astronomical math lives in four **external, frozen, unmaintained** C++ sibling repos that are not even present on this machine. The app itself is clean security-wise (no secrets, no injection surface, HTTPS-only), but its supply chain hangs off an archived GitHub org at unpinned HEAD — the single most urgent fix regardless of modernization path. The codebase's structure — thin renderers reading from one orchestrator that wraps an external engine — maps almost perfectly onto the target web architecture, and with zero tests, ~150 hardcoded layout constants, and removed iOS APIs in the alarm path, the evidence supports a **Rebuild** (spec-extraction + greenfield web implementation via `/modernize-reimagine`) rather than any in-place refactor.

## System Inventory

**Tooling note:** `scc` and `cloc` are not installed on this host; figures below use the documented fallback (`find` + `wc -l` by extension; complexity ranked by decision-keyword counts, which orders files reliably but is not exact cyclomatic complexity). Reproduce with the commands in this section.

| Extension | Files | Lines |
|---|---|---|
| `.mm` (Objective-C++) | 22 | 6,649 |
| `.m` (Objective-C) | 4 | 493 |
| `.h` (headers) | 26 | 1,600 |
| `.pl` (Perl scripts) | 4 | 248 |
| `.xib` (Interface Builder) | 7 | 666 |
| `.strings` (l10n, 8 languages) | 16 | 2,203 |
| `.plist` | 3 | 138 |
| **Source total (mm+m+h)** | **52** | **8,742** |

**Highest-complexity files** (decision keywords / lines):

| File | Decisions | Lines |
|---|---|---|
| `Classes/EOClock.mm` | 217 | 2,573 |
| `Classes/EOHandView.mm` | 85 | 499 |
| `Classes/EORingView.mm` | 39 | 442 |
| `Classes/FlipsideViewController.mm` | 38 | 328 |
| `Classes/Utilities.mm` | 31 | 214 |

Complexity concentrates almost entirely in `EOClock.mm` — nearly 3× the decision count of the rest of the codebase combined.

### Technology Fingerprint

| Aspect | Finding | Evidence |
|---|---|---|
| Language | Objective-C++ (pre-ARC, manual retain/release) | `.mm` files throughout; no `CLANG_ENABLE_OBJC_ARC` in project |
| Platform | iOS 15.0 minimum, iPad-only | `IPHONEOS_DEPLOYMENT_TARGET = 15.0`, `TARGETED_DEVICE_FAMILY = 2` (project.pbxproj) |
| UI | XIB nibs + programmatic Core Graphics (~475 CGContext/drawRect references across 18 files) | `Resources-iPad/*.xib`, `Classes/EO*View.mm` |
| Build | Xcode project only; no package manager; Perl/shell bootstrap scripts | `Observatory.xcodeproj`, `scripts/` |
| Dependencies | 4 external C++ static libs (`libesutil.a`, `libESTime.a`, `libeslocation.a`, `libesastro.a`) built from sibling repos of the archived EmeraldSequoia org; 10 iOS system frameworks | `docs/dependencies.md:17-24`, project.pbxproj |
| Data stores | None — `NSUserDefaults` only (keys: `EOAlarmEnabled`, `EOUseNTP`, `EONoonOnTop`, `EOUseLocationServices`, `EODisableAutoLock*`, `EOVersionMsg`, `EOFirstVersionRun`) | `FlipsideViewController.mm:152-157`, `EOClock.mm:296-313` |
| Integration points | Outbound: NTP (UDP, via external libESTime), CoreLocation, `openURL` to a single compile-time HTTPS GitHub URL. No inbound endpoints, no URL schemes, no ATS exceptions | `OrreryAppDelegate.mm:78`, `Constants.h:11` |
| Tests | **None.** Empty test action in the Xcode scheme | Xcode scheme |
| CI | GitHub Actions macOS simulator build (fork-added) | `.github/workflows/ios-simulator-build.yml` |

## Architecture-at-a-Glance

Nine functional domains (full dependency diagram in `ARCHITECTURE.mmd`):

| # | Domain | Key files | Depends on external ES* libs? |
|---|---|---|---|
| 1 | App Lifecycle & Boot | `main.mm`, `OrreryAppDelegate.{h,mm}` | Yes (NTP, location, time startup) |
| 2 | **Clock Engine (orchestrator)** | `EOClock.{h,mm}` — god object; owns `ESWatchTime*`/`ESTimeLocAstroEnvironment*`, ~90 view ivars, timer loop | Yes (9 ES* headers) |
| 3 | View Composition & Scheduling | `EOBaseView`, `EOScheduledView` (per-view tick intervals), `EOShuffleView` (8 dial classes in one file) | Yes |
| 4 | Celestial Renderers | `EOHandView` + 5 subclasses, `EORingView`, `EOMoonView`, `EOEarthView`, `EOEclipseView`, `EOEclipseRingImageView`, `EOMoonAgeView` (dead) | Partially |
| 5 | UI Controllers & Settings | `MainViewController`, `FlipsideViewController`, `AlarmSetViewController` + iPad XIBs | Yes |
| 6 | Alarm & Audio | `EC/ECAudio.{h,m}` + alarm logic inside EOClock | No |
| 7 | Diagnostics & Utilities | `Utilities`, `Constants.h`, `ECTrace`, `ECErrorReporter`, `EOBatteryAndDAL` | Utilities only |
| 8 | **External ES* Libraries** | Sibling repos `../esutil`, `../estime`, `../eslocation`, `../esastro` — **not on disk**; all astronomy/time/location math | — (is the dependency) |
| 9 | Build, Resources & Localization | `scripts/`, `Resources/`, `Resources-iPad/`, 8 `.lproj` dirs, CI workflow | scripts clone/verify them |

**Boot order (verified):** `main.mm` → nib-instantiated `OrreryAppDelegate` → starts NTP + location services → creates `EOClock` singleton (ordering required, per comment at `OrreryAppDelegate.mm:93`) → loads `MainView-iPad` → audio/battery services. `EOClock` then drives everything via NSTimer, ticking `EOScheduledView` subclasses on individual intervals.

**Two deliberate cycles** (the main obstacle to modularizing in place, and the thing the web architecture should *not* reproduce): Clock ↔ Renderers (clock creates views; views read clock state back via the `theClock` singleton) and Composition ↔ UI (`EOShuffleView.mm:14` imports `MainViewController` for touch forwarding).

**Dead code inventory:** `EOMoonAgeView` (208 lines, compiled but never instantiated — ivar commented out at `EOClock.h:115`); `SEASONS` feature gate never defined anywhere (`EOClock.h:123-128`); `DSTINDICATORS` self-disabled via `#undef` (`EOClock.h:117-118`); ~60% of `Constants.h` is unused Emerald Chronometer vocabulary (verified: only `ECPlanetNumber` and `ECEclipseKind` are referenced); non-iPad XIBs (`Resources/MainWindow.xib` etc.) appear to be unused iPhone leftovers.

## Production Runtime Profile

**No telemetry available.** The app was removed from the App Store in Nov 2023; no APM, crash reporting, or usage data exists for this fork. Runtime overlay skipped. If the fork ships, adding lightweight crash/perf reporting should precede any performance tuning.

## Technical Debt (top 10, ranked by value to the web re-implementation)

1. **EOClock god object is the app's entire behavioral spec** (`EOClock.mm`, 2,573 lines). The engine/UI seam the web port needs doesn't exist in source — the real seam is the call boundary into `ESWatchTime`/`ESAstronomyManager` (e.g. `EOClock.mm:469-476`). *Remediation: inventory EOClock method-by-method into "engine call" vs "presentation rule" before writing web code.*
2. **Layout is a hardcoded 768×1024 iPad-1 coordinate system** — ~150 magic numbers duplicated per orientation (`EOClock.mm:1520-1729`), geometric relationships encoded only in comments (e.g. `subOffset = 149; // == earth Radius`). *This is the de facto design document; transcribe it into a normalized layout table as the first porting artifact.*
3. **Alarm stack built on removed iOS APIs + a silent-audio keep-alive hack** (`UILocalNotification` via `NSClassFromString` dodges at `EOClock.mm:216-257`; `Silence.wav` timer at `ECAudio.m:203-232`). Extract the intent (daily wall-clock alarm, 20 rings per `Constants.h:124`, rings only while app alive) and discard the mechanism.
4. **Copy-paste time-step machinery** — ~300 lines of duplicated button branches (`EOClock.mm:680-758`, `952-978`, `440-493`) that reduce to a data table `{unit, step-op, direction}`. Contains real product behavior easy to lose: planet-cycling skips Earth and wraps Sun↔Saturn (`EOClock.mm:740-756`).
5. **Missing error handling on resource loads**, incl. a nil-append crash path (`FlipsideViewController.mm:138-151`) and a release-only fallthrough scheduling a broken sound timer forever (`ECAudio.m:222-228`). Every load site needs an explicit failure story in a web port that fetches assets over the network.
6. **Deprecated orientation/status-bar APIs throughout the view layer** (`interfaceOrientation`, `applicationFrame`, etc.) — but the underlying model is simply two states (portrait/landscape) inferred from aspect ratio (`MainViewController.mm:121-131`). Reproduce the model, ignore the plumbing.
7. **Dead code and shipped debug leftovers**: suppressed memory-warning handler (`MainViewController.mm:105-110`), debug-red background (`FlipsideViewController.mm:95-96`), `#if 0` blocks, ~40% of the eclipse-dial `drawRect:` commented out with a stale comment (`EOShuffleView.mm:376-399`) — a transcription hazard for anyone porting dial artwork.
8. **Version-gate logic admitted broken** (2010 comment at `EOClock.mm:300-304`) and uses lexicographic string comparison for versions (`EOClock.mm:324-334`). Do not port faithfully; capture intent (show release notes once per version, remember "Never") with semver comparison.
9. **Manual lat/long entry is locale-blind** (`floatValue` at `FlipsideViewController.mm:289-293` — "48,8" parses as 48.0), silently clamped, plus pre-ARC formatter leaks. The feature must survive the port (tz-mismatch warnings depend on it); specify parsing/validation properly.
10. **NTP failure semantics are "dot color only"** — a 13-state status machine mapped to green/yellow/blinking dots (`EOClock.mm:497-524`), silently degrading to device time. The web port replaces the transport entirely but should port the *semantics* (synchronized / refining / failed / no-net + blink rule).

## Security Findings

App code is clean: **no hardcoded credentials anywhere** (tracked tree and binary `.xcuserstate` both checked), no injection sinks reachable by users, lat/long input properly clamped, HTTPS-only outbound, no ATS exceptions, no deserialization of untrusted data. Findings concentrate in supply chain and dev tooling:

| ID | CWE | Severity | Location | Finding |
|---|---|---|---|---|
| SEC-001 | CWE-829 | **Medium** | `scripts/bootstrap_dependencies.sh:39`, `.github/workflows/ios-simulator-build.yml:34-45` | Build clones 5 sibling repos at unpinned HEAD from the **archived** EmeraldSequoia org and executes their code. Hijack of the dormant org = code execution in CI and on contributor machines, statically linked into the app. **Fix: fork the 5 repos into your own org; pin by commit SHA.** |
| SEC-002 | CWE-1104 | **Medium** | External libs (`libESTime.a` etc.) | All four C++ deps frozen since Nov 2023, no maintainer. `ESNTPDriver` parses **untrusted UDP packets** in code that will never be patched. Treat as first-party code you own — or replace (the web port does this by construction). |
| SEC-003 | CWE-345/924 | Low | `OrreryAppDelegate.mm:38,44` | NTP is unauthenticated UDP; on-path attacker can skew displayed time/alarm. Integrity-of-display only. |
| SEC-004 | CWE-78 | Low | `scripts/dumpDefaults.pl:56`, `scripts/resetSimulatorLastVersionRun.pl:68` | Shell interpolation of file paths in dev scripts; use list-form `system`/3-arg `open`. |
| SEC-005 | CWE-377 | Low | `scripts/resetSimulatorLastVersionRun.pl:70-72` | Fixed predictable `/tmp` path; use `File::Temp`. |
| SEC-006 | CWE-538 | Low | `Observatory.xcodeproj/.../Observatory.xccheckout:14-30` | Committed `.xccheckout` publishes original developers' private SSH endpoints (residential IPs + account path). No credentials present. Delete + gitignore `xcuserdata/`, `*.xccheckout`, `*.xcuserstate`. |
| SEC-007 | CWE-829 | Low | `.github/workflows/ios-simulator-build.yml:23,55,63` | GitHub Actions pinned by mutable tag, not SHA (mitigated by `permissions: contents: read`). |
| SEC-008 | CWE-489 | Low | `MainViewController.mm:34-35`, `EOClock.mm:267,1134,2224`, others | Unconditional `printf` debug output in Release builds; wrap in `#ifndef NDEBUG`. |
| SEC-009 | Info | `scripts/checkForNSCalendar.pl:14,28` | Two-arg Perl `open` on repo-derived filenames in a build phase; use 3-arg form. |

**Priority:** SEC-001/SEC-002 before any App Store push — the archived upstream org is the only path by which an external party can currently inject code into this build.

## Documentation Gaps (top 5)

Header-comment coverage is 100% (copyright blocks) and the fork has ~416 lines of project docs — but they describe *structure*, not *behavior*. What a new engineer (or a porting effort) would need explained:

1. **What each dial/hand/ring actually displays and computes** — no document maps the ~60 widgets to their astronomical meaning; the only spec is `EOClock.mm` + the dial artwork.
2. **The layout geometry system** — ~150 constants in `EOClock.mm:1520-1729` with relationships documented only in stray comments.
3. **The time-step interaction model** — jump semantics, planet-cycling rules (skip Earth, wrap Sun↔Saturn), stop/resume behavior.
4. **NTP status semantics** — the 13-state → dot-color machine and intended degraded-mode behavior.
5. **The ES* library API contract** — which `ESAstronomyManager`/`ESWatchTime` calls the app depends on, with what units/epochs/conventions. (Also: `CLAUDE.md` is stale in two places — help links have already been redirected to GitHub, and `EOClock.mm` is 2,573 lines, not "~120KB".)

## Relative Scale

COCOMO-II basic index: **2.94 × (8.742)^1.10 ≈ 32** (nominal scale factors; KSLOC = local mm+m+h source only — the four external ES* repos are not included and would add materially to the estate if ported rather than replaced).

**This is a relative size/complexity index for ranking this system against others — not a timeline.** It assumes traditional human-team productivity, which agentic transformation does not follow. No person-months, schedule, cost, or dates should be derived from it. Directionally: this is a *small* estate whose complexity concentrates in one file plus an external math library that the modernization plan replaces rather than ports.

## Recommended Modernization Pattern

**Rebuild** → `/modernize-reimagine`.

The evidence converges from three directions. First, the UI layer cannot be preserved on the target platform in any case — XIB/UIKit/Core Graphics has no web migration path, so "refactor in place" buys nothing. Second, the computational core isn't in this repo at all: it's four frozen, unmaintained C++ sibling repos whose only security remediation options are "adopt and own" or "replace" — and mature replacements exist (`astronomy-engine` for TS, `vsop87`/`hifitime` + ported Meeus algorithms for Rust). Third, the app's true value — the behavioral spec of ~60 astronomical widgets, the layout geometry, the interaction model — is recoverable by systematic extraction from `EOClock.mm` and the renderer classes, which is exactly what the reimagine pipeline's spec-extraction phase does. The debt findings double as the extraction worklist: findings 1-4 and 8-10 each name a behavior to capture and a mechanism to discard.

**Suggested route:** `/modernize-extract-rules` (or `/modernize-reimagine`, which includes it) targeting `EOClock.mm` + the EO*View classes, producing Given/When/Then specs that the Rust engine crate and TypeScript canvas layer implement against — with characterization tests validated against JPL Horizons ephemeris data replacing the test suite this codebase never had.

---

## Confidence & Reproducibility

- LOC/complexity via `find`+`wc`/keyword fallback (`scc`/`cloc` unavailable) — install `scc` for exact CCN figures.
- All structural, debt, and security claims carry file:line citations traced in source; the codebase is small enough that the `.m/.mm` trace is exhaustive.
- **Not verified:** contents of the four ES* sibling repos (not on disk); XIB internals (not parsed); deprecation OS-version attributions (from API knowledge, not a compile — the project cannot build on this Windows host).
- **No production telemetry** — runtime overlay skipped.
- **SME questions worth answering:** Are the archived esastro/estime repos at the same revision this app last shipped against? Was `EOMoonAgeView` disabled for a bug or by design? Are the non-iPad XIBs safe to delete?
