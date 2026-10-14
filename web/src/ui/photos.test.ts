/**
 * WI-033 — the planet photo table is presentation data that keeps its
 * promises: one same-origin picture per ring, honest alt text, a NASA credit
 * that links to NASA, and colour that comes from the theme, not from here.
 */
import { describe, expect, it } from "vitest";
import { RING_ORDER } from "./clockface";
import { PHOTO_NOTICE, PLANET_PHOTOS, photoAlt, photoCaption, photoFor, type PlanetPhoto } from "./photos";
import { PLANET_COLORS } from "./theme";

/** The files actually shipped under `web/public/planets/`, by their public path. */
const SHIPPED = new Set(
  Object.keys(import.meta.glob("../../public/planets/*.jpg")).map((k) => k.replace("../../public/", "")),
);
const names = [...PLANET_PHOTOS.keys()];
const photos = [...PLANET_PHOTOS.entries()];

describe("the planet photos", () => {
  it("cover exactly the rings, which are exactly the planets that have a colour", () => {
    expect([...names].sort()).toEqual(Object.keys(PLANET_COLORS).sort());
    expect([...names].sort()).toEqual([...RING_ORDER].sort());
    expect(photoFor("Pluto")).toBeNull();
    expect(photoFor("constructor")).toBeNull();
    expect(photoFor("__proto__")).toBeNull();
  });

  it("carry no colour of their own (the band is the theme token, DEC-039)", () => {
    for (const [, photo] of photos) expect(Object.keys(photo)).not.toContain("color");
  });

  it("point at shipped files by a deploy-relative path (GitHub Pages mounts the site under /<repo>/), 1024 px longest edge, every shipped file used", () => {
    for (const [name, photo] of photos) {
      // No leading slash: a root-relative path 404s under a project-site mount (WI-033 acceptance CR-1).
      expect(photo.src, name).toMatch(/^planets\/[a-z]+\.jpg$/);
      expect(SHIPPED.has(photo.src), `${name}: ${photo.src} is shipped`).toBe(true);
      expect(Math.max(photo.width, photo.height), name).toBe(1024);
    }
    expect([...SHIPPED].sort()).toEqual(photos.map(([, p]) => p.src).sort());
  });

  it("credit NASA and link to NASA over https, with a notice that it is not live", () => {
    for (const [name, photo] of photos) {
      expect(photo.credit, name).toMatch(/^NASA\b/);
      expect(photo.creditUrl, name).toMatch(/^https:\/\/images\.nasa\.gov\/details\/PIA\d+$/);
      expect(photo.title.length, name).toBeGreaterThan(0);
    }
    expect(PHOTO_NOTICE).toMatch(/NASA/);
    expect(PHOTO_NOTICE).toMatch(/not live/);
  });

  it("alt text and caption name the picture and repeat the notice", () => {
    const mars = photoFor("Mars") as PlanetPhoto;
    expect(photoAlt(mars)).toBe(`Mars from the Viking orbiters. ${PHOTO_NOTICE}.`);
    expect(photoCaption(mars)).toEqual({ notice: `${PHOTO_NOTICE}.`, title: "Mars from the Viking orbiters · " });
  });
});
