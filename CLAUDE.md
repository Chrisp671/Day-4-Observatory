# CLAUDE.md - Emerald Observatory

## Project Overview

Emerald Observatory is an iOS/iPad astronomical application (v1.5.5) that displays real-time celestial information including planetary positions, solar/lunar eclipses, Earth views, and alarm-based astronomical events. Originally built by Emerald Sequoia LLC, licensed under MIT.

## Project History & Status

**This is a community fork** of the original Emerald Observatory, intended to revive and continue development of the app.

Emerald Sequoia LLC was a two-person company that created acclaimed astronomical apps for iOS over 15 years. In late 2022, they announced the company would shut down at the end of 2023, citing:

- **Unsustainable revenue** — app income no longer covered overhead costs
- **Maintenance burden** — keeping up with new hardware and OS releases lost the fun of the original development
- **Tiny team** — only two people maintaining everything

The apps were removed from the App Store on November 1, 2023. Before shutting down, Emerald Sequoia open-sourced all their code across 10 GitHub repositories at [github.com/EmeraldSequoia](https://github.com/EmeraldSequoia). The last upstream commit was November 9, 2023.

Observatory requires only 5 of the 10 repos (this repo + 4 libraries + buildscripts). The others are separate apps (Chronometer, Timestamp) and supporting resources (docs, website).

### Goals of This Fork

This fork aims to bring Emerald Observatory back to life — updating it for modern iOS, fixing issues, and potentially republishing to the App Store.

### Known Issues Inherited from Upstream

- Help file links point to the now-defunct emeraldsequoia.com website — these need to be redirected to GitHub or removed
- The codebase predates ARC and uses manual retain/release throughout
- No automated tests exist

## Tech Stack

- **Language:** Objective-C++ (`.mm` files), Objective-C (`.m` files), C++ (external libraries)
- **Platform:** iOS (iPad), minimum deployment target iOS 15.0
- **Build System:** Xcode 12.0+ (no CocoaPods, SPM, or Carthage)
- **Memory Management:** Manual Retain/Release (pre-ARC codebase)
- **UI:** XIB/NIB Interface Builder files + programmatic Core Graphics rendering
- **Architecture:** MVC pattern

## Directory Structure

```
Classes/              # Main source files (~49 Objective-C++ files)
EC/                   # External Emerald Chronometer audio module
Observatory/          # Image assets (xcassets)
Observatory.xcodeproj/# Xcode project configuration
Resources/            # XIB files, images, audio, help text, Earth textures
Resources-iPad/       # iPad-specific XIB layouts
{lang}.lproj/         # Localization (de, en, es, fr, it, ja, nl, zh-Hans)
scripts/              # Perl build/utility scripts
```

## Key Files

| File | Purpose |
|------|---------|
| `main.mm` | Application entry point |
| `Classes/OrreryAppDelegate.mm` | App lifecycle, creates main window and EOClock |
| `Classes/EOClock.mm` | Core astronomical engine (~120KB, largest file) |
| `Classes/EOBaseView.mm` | Main rendering surface (UIView subclass) |
| `Classes/MainViewController.mm` | Primary UI controller |
| `Classes/FlipsideViewController.mm` | Settings/configuration UI |
| `Classes/Constants.h` | Compile-time configuration switches (~80+ defines) |
| `Observatory-Info.plist` | App bundle configuration |
| `Observatory_Prefix.pch` | Precompiled header |

## Architecture

```
Presentation:  MainViewController → EOBaseView → EO*View subviews
Logic:         EOClock (orchestrator, timer-driven updates)
Computation:   External C++ static libraries (libesastro, libESTime, etc.)
System:        CoreLocation, CoreGraphics, QuartzCore, AVFoundation
```

### Class Naming Conventions

- `EO*` — Observatory-specific classes (EOClock, EOBaseView, EOMoonView, EOEarthView, etc.)
- `EC*` — Emerald Chronometer base classes (ECTrace, ECErrorReporter, ECAudio)
- `ES*` — External library types (ESWatchTime, ESTimeLocAstroEnvironment)

### View Hierarchy

EOBaseView contains specialized subviews: EORingView, EOMoonView, EOEarthView, EOHandView, EOShuffleView, and others — each rendering a specific astronomical element using Core Graphics.

## External Dependencies

These libraries must be cloned at the **same directory level** as this repository:

```shell
git clone git@github.com:EmeraldSequoia/buildscripts.git
git clone git@github.com:EmeraldSequoia/esutil.git      # → libesutil.a
git clone git@github.com:EmeraldSequoia/estime.git       # → libESTime.a
git clone git@github.com:EmeraldSequoia/eslocation.git   # → libeslocation.a
git clone git@github.com:EmeraldSequoia/esastro.git      # → libesastro.a
```

### iOS Framework Dependencies

Foundation, UIKit, CoreGraphics, QuartzCore, CoreLocation, AVFoundation, AudioToolbox, CFNetwork, SystemConfiguration, ExternalAccessory

## Building

1. Open `Observatory.xcodeproj` in Xcode
2. Select a simulator or device target
3. Product → Run (Cmd+R)

Build configurations: Debug, Release, Distribution.

## Testing

No automated test suite exists. The Xcode scheme has an empty test action. All testing is manual.

## Localization

8 languages supported: English, German, Spanish, French, Italian, Japanese, Dutch, Chinese (Simplified). Localized strings are in `{lang}.lproj/` directories.

## Scripts

Perl utility scripts in `scripts/`:
- `dumpDefaults.pl` — Dump NSUserDefaults for debugging
- `copyHelpFile.pl` — Copy help resources
- `checkForNSCalendar.pl` — Validate calendar API usage (run as build phase)
- `resetSimulatorLastVersionRun.pl` — Simulator cleanup

## Code Conventions

- Files use `.mm` extension for Objective-C++ (C++ interop is pervasive)
- Manual retain/release memory management — no ARC
- Heavy use of Interface Builder (XIB) for UI layout
- Constants defined as preprocessor macros in `Constants.h`
- NSTimer-driven update loop in EOClock for real-time display updates
- Copyright headers at top of every source file

## Important Notes for AI Assistants

- **Do not add ARC annotations** (`strong`, `weak`) — this codebase uses manual retain/release
- **Respect the `.mm` extension** — most files need C++ interop with the external astronomy libraries
- **EOClock.mm is the core** — changes here affect all astronomical calculations and display updates
- **External libraries are not in this repo** — `ES*` prefixed types come from sibling repositories
- **No package manager** — dependencies are managed via Xcode project settings and sibling directory structure
- **iPad-only UI** — all XIB layouts target iPad form factor
