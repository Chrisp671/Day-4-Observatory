/**
 * WI-033 — the planet photo table is presentation data that keeps its
 * promises: one same-origin picture per ring, honest alt text, a NASA credit
 * that links to NASA, and colour that comes from the theme, not from here.
 */
import { describe, expect, it } from "vitest";
import { PHOTO_NOTICE, PLANET_PHOTOS, photoAlt, photoFor, type PlanetPhoto } from "./photos";
import { PLANET_COLORS } from "./theme";

const RING_ORDER = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
/** The files actually shipped under `web/public/planets/`, by their public path. */
const SHIPPED = new Set(
  Object.keys(import.meta.glob("../../public/planets/*.jpg")).map((k) => k.replace("../../public", "")),
);

describe("the planet photos", () => {
  it("cover exactly the planets that have a colour, and nothing else", () => {
    expect(Object.keys(PLANET_PHOTOS).sort()).toEqual(Object.keys(PLANET_COLORS).sort());
    expect(Object.keys(PLANET_PHOTOS).sort()).toEqual([...RING_ORDER].sort());
    expect(photoFor("Pluto")).toBeNull();
    expect(photoFor("constructor")).toBeNull();
    expect(photoFor("__proto__")).toBeNull();
  });

  it("carry no colour of their own (the band is the theme token, DEC-039)", () => {
    for (const photo of Object.values(PLANET_PHOTOS)) {
      expect(Object.keys(photo)).not.toContain("color");
    }
  });

  it("point at shipped same-origin files at a 1024 px longest edge, and every shipped file is used", () => {
    for (const [name, photo] of Object.entries(PLANET_PHOTOS)) {
      expect(photo.src, name).toMatch(/^\/planets\/[a-z]+\.jpg$/);
      expect(SHIPPED.has(photo.src), `${name}: ${photo.src} is shipped`).toBe(true);
      expect(Math.max(photo.width, photo.height), name).toBe(1024);
    }
    expect([...SHIPPED].sort()).toEqual(Object.values(PLANET_PHOTOS).map((p) => p.src).sort());
  });

  it("credit NASA and link to NASA over https, with a notice that it is not live", () => {
    for (const [name, photo] of Object.entries(PLANET_PHOTOS)) {
      expect(photo.credit, name).toMatch(/^NASA\b/);
      expect(photo.creditUrl, name).toMatch(/^https:\/\/images\.nasa\.gov\/details\/PIA\d+$/);
      expect(photo.title.length, name).toBeGreaterThan(0);
    }
    expect(PHOTO_NOTICE).toMatch(/NASA/);
    expect(PHOTO_NOTICE).toMatch(/not live/);
  });

  it("alt text names the picture and repeats the notice", () => {
    const mars = photoFor("Mars") as PlanetPhoto;
    expect(photoAlt(mars)).toBe(`Mars from the Viking orbiters. ${PHOTO_NOTICE}.`);
  });
});
