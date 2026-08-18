/**
 * Daily scripture masthead — the verse the whole instrument hangs under.
 *
 * The canon starts from the six scriptures day4.org itself displays
 * (Genesis 1:14, Psalm 19:1, Psalm 33:6, Psalm 50:6, Psalm 147:4,
 * Isaiah 40:26) and adds six more sky-verses. Text is KJV (public domain).
 * Selection is deterministic by local civil date, so everyone at the same
 * station reads the same verse all day, and tomorrow brings the next.
 */

export interface Verse {
  readonly text: string;
  readonly reference: string;
}

export const VERSES: readonly Verse[] = [
  {
    text: "And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years.",
    reference: "Genesis 1:14",
  },
  {
    text: "The heavens declare the glory of God; and the firmament sheweth his handywork.",
    reference: "Psalm 19:1",
  },
  {
    text: "He telleth the number of the stars; he calleth them all by their names.",
    reference: "Psalm 147:4",
  },
  {
    text: "Lift up your eyes on high, and behold who hath created these things, that bringeth out their host by number.",
    reference: "Isaiah 40:26",
  },
  {
    text: "By the word of the LORD were the heavens made; and all the host of them by the breath of his mouth.",
    reference: "Psalm 33:6",
  },
  {
    text: "And the heavens shall declare his righteousness: for God is judge himself.",
    reference: "Psalm 50:6",
  },
  {
    text: "When I consider thy heavens, the work of thy fingers, the moon and the stars, which thou hast ordained; what is man, that thou art mindful of him?",
    reference: "Psalm 8:3–4",
  },
  {
    text: "And God made two great lights; the greater light to rule the day, and the lesser light to rule the night: he made the stars also.",
    reference: "Genesis 1:16",
  },
  {
    text: "He appointed the moon for seasons: the sun knoweth his going down.",
    reference: "Psalm 104:19",
  },
  {
    text: "Seek him that maketh the seven stars and Orion, and turneth the shadow of death into the morning.",
    reference: "Amos 5:8",
  },
  {
    text: "Which maketh Arcturus, Orion, and Pleiades, and the chambers of the south.",
    reference: "Job 9:9",
  },
  {
    text: "Thus saith the LORD, which giveth the sun for a light by day, and the ordinances of the moon and of the stars for a light by night.",
    reference: "Jeremiah 31:35",
  },
];

/** Whole days since the epoch in the viewer's local civil calendar. */
export function localDayNumber(unixMillis: number): number {
  const d = new Date(unixMillis);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** The verse for the local calendar day containing `unixMillis`. */
export function verseOfDay(unixMillis: number): Verse {
  const idx = ((localDayNumber(unixMillis) % VERSES.length) + VERSES.length) % VERSES.length;
  return VERSES[idx] as Verse;
}
