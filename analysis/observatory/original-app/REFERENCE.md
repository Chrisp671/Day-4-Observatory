# The original Emerald Observatory — visual reference

Frames from Parker Eng's screen-share walkthrough (2026-08-21 recording,
`GMT20260821-153215_Recording_as_1440x1920.mp4`), Emerald Observatory
v1.5.5 on iPad — the same version this repo's iOS source builds.
Companion to the transcript digest (DEC-031/033).

## Frames

- `dial-midnight-top.jpg` — the default face, midnight on top, live.
- `dial-time-travelled.jpg` — after day-stepping to Oct 03 (set mode).
- `options-and-manual.jpg` — the options sheet with the app's own help text.
- `dial-noon-top.jpg` — after flipping "Noon on Top"; the top bar showing the
  large moon-phase panel.

## What the app's own manual states (options screen)

- Gold hands = hours/minutes/seconds in **12-hour** format; the thin hand
  with the white arrowhead is the 24-hour hand.
- The colored rings are **per-body above-horizon arcs** ("when each 'planet'
  is above the horizon"); the big background one is the Sun's.
- **Twelve colored arrows** mark astronomical, nautical, and civil twilight,
  sunrise/sunset, the golden hour, and solar noon/midnight.
- Eclipse Simulator: Sun/Moon/Earth-shadow icons plus the Moon's nodes; an
  eclipse animation appears inside near an eclipse.
- Set mode: tap a unit to step (blue forward, red backward); press-and-hold
  latches continuous advance; Reset returns to now.
- **Tap the altitude or azimuth dials to switch which planet they show.**
- Options: Alarm, Noon on Top, Location Services (or manual lat/lon),
  Disable Auto-Lock.

## Layout inventory (from the frames)

Top bar cycling panels: moon-phase image · world map with day/night
terminator and red station dot · large date card. Corners: Altitude gauge
(top-left) and Azimuth compass (bottom-left) for the selected body; Eclipse
Simulator (top-right); Equation of Time (bottom-right). Face: 24-hour ring,
stacked labeled arcs (Saturn cyan, Venus white, Moon lavender, Mars pink,
Jupiter blue-green, Mercury spectrum), twilight rainbow wedges at the
horizon crossings, zodiac glyph ring, and a central heliocentric orrery
(textured sun and planets, Earth+Moon) with UTC, Solar, and Sidereal
sub-dials. "EMERALD ❖ SEQUOIA" wordmark at the foot.

## Standing notes for our web app

Already shipped from this material: planets with rise/set/peak, steady
day-anchored sun/moon times, 12-hour speech, solar-noon mark, moon up-arc,
where-to-look alt/az. Confirmed deferred (DEC-033): per-planet arcs on the
dial band, tap-to-switch alt/az instrument, the finer twilight ladder
(6 grades vs our amber band), noon/midnight-top flip, eclipse indication.
