# Emerald Observatory — Investor Brief

**Date:** March 2026
**Status:** Pre-launch community fork | MIT-licensed open source

---

## The Opportunity

Every iOS astronomy app is a star map or AR camera overlay. **Nobody makes a beautiful astronomical instrument panel.** Emerald Observatory is the only app in this category — and it had a proven track record before its original developers shut down.

We are reviving this app for modern iOS and republishing to the App Store.

## What It Is

Emerald Observatory is an iPad app that displays real-time astronomical data as an elegant instrument dashboard: planetary positions via an animated orrery, solar/lunar eclipse timelines, twilight bands (civil, nautical, astronomical), moon phases, sunrise/sunset, and Earth orientation — all rendered in a single glanceable view.

Think of it as a **cockpit for the sky**, not a planetarium.

## Market Gap

| Category | Apps | Emerald Observatory |
|----------|------|---------------------|
| Star maps / planetariums | SkySafari, Stellarium, Star Walk | Not competing here |
| AR sky identification | Night Sky, SkyView | Not competing here |
| Astronomical instrument panel | **None** | **Only app in category** |

The instrument-panel niche is completely unoccupied. No competitor has entered it since the original app was removed from the App Store in November 2023.

## Proven Demand

The original Emerald Observatory (2010–2023):

- **#1 paid iPad app in the US** for 4 consecutive days at launch
- Cult of Mac: *"simply stunning to look at"*
- The Mac Observer: *"drop dead gorgeous"*
- Long Now Foundation pick by Paul Saffo
- Andy Ihnatko's "Pick of the Week" on MacBreak Weekly
- Users consistently described wanting to **mount an iPad on the wall** just to display it
- Beloved by photographers for golden hour and twilight reference

The app was removed not because of declining demand, but because the two-person team could no longer justify the maintenance overhead against revenue at $0.99.

## Why Now

1. **Subscription fatigue is real.** SkySafari's layered pricing (app purchase + subscription) generates significant user backlash. Users actively seek one-time-purchase alternatives.
2. **iPad install base is larger than ever.** The original was iPad-only and that was a strength — the dense information display needs the screen space.
3. **No one filled the gap.** 2.5 years after removal, no competitor has shipped anything similar.
4. **The codebase is MIT-licensed and available.** Emerald Sequoia open-sourced everything before shutting down. We start with a complete, shipping-quality app — not a prototype.

## Technical Status

| Area | Status |
|------|--------|
| Core astronomy engine | Algorithms valid through **2801 AD** — no science debt |
| iOS compatibility | 3 build-breaking API updates needed (deprecated in iOS 16), ~10 warnings — estimated days of work, not months |
| Dead links | 20 references to defunct website — straightforward find-and-replace |
| External dependencies | 4 C++ astronomy libraries (also MIT-licensed, also available) |
| Test coverage | None (inherited). Manual testing only. |

**The hard part (astronomy) is done. The remaining work is iOS platform modernization.**

## Revenue Model

**One-time purchase at $3.99–$4.99.** No subscription.

This aligns with:
- The app's heritage ($0.99 original, universally called "a steal")
- Current user sentiment (anti-subscription)
- Competitive positioning (Sky Guide and Star Walk 2 are $2.99)
- The app's nature (reference tool, not a content service)

## Competitive Advantages

1. **Category of one** — no direct competitors in the instrument-panel format
2. **Brand recognition** — existing fans, press coverage, and nostalgia
3. **Open source** — community contributions reduce maintenance burden (the exact problem that killed the original)
4. **Complete codebase** — not starting from scratch
5. **No recurring content costs** — astronomy algorithms don't need monthly updates

## Risks

| Risk | Mitigation |
|------|------------|
| Sole maintainer burnout (killed the original) | Open-source model distributes effort; community contributors |
| Apple rejects as "clone" of removed app | MIT license grants full rights; new bundle ID and branding differentiation |
| Trademark on "Emerald Observatory" name | May need rebranding; legal review required before submission |
| No automated tests | Add test coverage during modernization phase |
| iPad-only limits addressable market | iPad users spend more per app; potential iPhone adaptation later |

## Roadmap

**Phase 1 — Ship (1–2 months)**
- Fix 3 build-breaking iOS API issues
- Remove/redirect 20 dead links
- Remove shutdown messaging
- Add required Privacy Manifest
- Add LaunchScreen storyboard
- Manual QA on current iPads
- Submit to App Store

**Phase 2 — Modernize (3–6 months)**
- Migrate to ARC (automatic reference counting)
- Add basic automated test coverage
- Update help content
- iOS widget for lock screen / home screen (glanceable astronomy data)

**Phase 3 — Grow (6–12 months)**
- iPhone adaptation
- Apple Watch complication
- Complications for astronomical photography (golden hour alerts)
- Community-driven feature requests via GitHub

## The Ask

[To be filled in based on specific funding needs]

---

*Built on the open-source foundation of Emerald Sequoia LLC's astronomical applications (2008–2023). Code licensed under MIT.*
