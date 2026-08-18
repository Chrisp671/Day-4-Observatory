/**
 * Daily scripture masthead — the verse the whole instrument hangs under.
 *
 * The canon starts from the six scriptures day4.org itself displays
 * (Genesis 1:14, Psalm 19:1, Psalm 33:6, Psalm 50:6, Psalm 147:4,
 * Isaiah 40:26) and adds six more sky-verses. Text is ESV, matching the
 * version day4.org quotes; ESV permits quotation at this scale in
 * non-saleable media provided each quotation is marked "ESV".
 * Selection is deterministic by local civil date, so everyone at the same
 * station reads the same verse all day, and tomorrow brings the next.
 */

export interface Verse {
  readonly text: string;
  readonly reference: string;
}

/** Shown after every citation, per ESV quotation terms. */
export const VERSE_VERSION = "ESV";

export const VERSES: readonly Verse[] = [
  {
    text: "And God said, Let there be lights in the expanse of the heavens to separate the day from the night. And let them be for signs and for seasons, and for days and years.",
    reference: "Genesis 1:14",
  },
  {
    text: "The heavens declare the glory of God, and the sky above proclaims his handiwork.",
    reference: "Psalm 19:1",
  },
  {
    text: "He determines the number of the stars; he gives to all of them their names.",
    reference: "Psalm 147:4",
  },
  {
    text: "Lift up your eyes on high and see: who created these? He who brings out their host by number, calling them all by name.",
    reference: "Isaiah 40:26",
  },
  {
    text: "By the word of the LORD the heavens were made, and by the breath of his mouth all their host.",
    reference: "Psalm 33:6",
  },
  {
    text: "The heavens declare his righteousness, for God himself is judge!",
    reference: "Psalm 50:6",
  },
  {
    text: "When I look at your heavens, the work of your fingers, the moon and the stars, which you have set in place, what is man that you are mindful of him?",
    reference: "Psalm 8:3–4",
  },
  {
    text: "And God made the two great lights—the greater light to rule the day and the lesser light to rule the night—and the stars.",
    reference: "Genesis 1:16",
  },
  {
    text: "He made the moon to mark the seasons; the sun knows its time for setting.",
    reference: "Psalm 104:19",
  },
  {
    text: "He who made the Pleiades and Orion, and turns deep darkness into the morning… the LORD is his name.",
    reference: "Amos 5:8",
  },
  {
    text: "Who made the Bear and Orion, the Pleiades and the chambers of the south.",
    reference: "Job 9:9",
  },
  {
    text: "Thus says the LORD, who gives the sun for light by day and the fixed order of the moon and the stars for light by night… the LORD of hosts is his name.",
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
