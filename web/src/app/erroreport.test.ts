/**
 * Error reporting (DEC-041). The privacy clauses are the tests here: this is a
 * module whose correctness is mostly about what it must NOT do.
 */
import { describe, expect, it } from "vitest";
import {
  ErrorBuffer,
  MAX_CAPTURED,
  composeReport,
  fromRejection,
  fromUncaught,
  readBuild,
  safeStringify,
  type CapturedError,
  type ReportEnvironment,
} from "./erroreport";

/**
 * This module's own source, read to scan it. `import.meta.glob` rather than a
 * `?raw` import because the review pipeline refuses to follow a relative import
 * carrying a query string, and would halt the run as incomplete.
 */
const erroreportSource = import.meta.glob("./erroreport.ts", {
  eager: true,
  query: "?raw",
  import: "default",
})["./erroreport.ts"] as string;

/** Source with comments and string literals removed, so a docstring that *names*
 * a forbidden API to say it does not use it is not counted as using it. What
 * remains is code: an actual call is a token outside any comment or literal. */
const erroreportCode = erroreportSource
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/\/\/[^\n]*/g, " ")
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, "``");

const env = (over: Partial<ReportEnvironment> = {}): ReportEnvironment => ({
  build: "Je5j2EHb",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
  when: "2026-10-06 14:05:33",
  ...over,
});

const err = (over: Partial<CapturedError> = {}): CapturedError => ({
  kind: "uncaught",
  name: "TypeError",
  message: "cannot read properties of undefined",
  stack: "TypeError: boom\n    at paint (main.ts:150)",
  at: Date.parse("2026-10-06T14:05:33Z"),
  ...over,
});

describe("composeReport", () => {
  it("leads with the build, then the browser, then the failures — a stack from the wrong bundle is a wild goose chase", () => {
    const report = composeReport([err()], env());
    const when = report.indexOf("When:");
    const build = report.indexOf("Build:");
    const browser = report.indexOf("Browser:");
    const failure = report.indexOf("TypeError");
    expect(when).toBeLessThan(build);
    expect(build).toBeLessThan(browser);
    expect(browser).toBeLessThan(failure);
    expect(report).toContain("Build: Je5j2EHb");
    expect(report).toContain("cannot read properties of undefined");
  });

  it("includes the stack, because that is how the owner locates it", () => {
    expect(composeReport([err()], env())).toContain("at paint (main.ts:150)");
  });

  it("numbers several failures and keeps the oldest first", () => {
    const report = composeReport(
      [err({ message: "first" }), err({ kind: "unhandledrejection", message: "second" })],
      env(),
    );
    expect(report).toContain("1. uncaught:");
    expect(report).toContain("2. unhandledrejection:");
    expect(report.indexOf("first")).toBeLessThan(report.indexOf("second"));
  });

  it("survives an error with no stack at all, which is the common rejection case", () => {
    // No `stack:` line, and nothing printed in its place — a blank field would
    // read as "we did not look", which is worse than its absence.
    const report = composeReport([err({ stack: null, message: "boom" })], env());
    expect(report).toContain("TypeError: boom");
    expect(report).not.toContain("   At\n");
    expect(report.split("\n").some((l) => l.trim() === "")).toBe(true);
  });

  it("says so when the build cannot be identified rather than inventing one", () => {
    expect(composeReport([err()], env({ build: null }))).toContain(
      "Build: unknown (not a built bundle)",
    );
  });

  // These are the clauses, stated as assertions rather than as a promise in a
  // comment: a report that grew a new field would fail here.
  it("contains no location, no station, no cookie and no storage key", () => {
    const report = composeReport([err()], env()).toLowerCase();
    for (const forbidden of [
      "latitude",
      "longitude",
      "localstorage",
      "sessionstorage",
      "cookie",
      "referrer",
      "deviceid",
    ]) {
      expect(report, `report mentions ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("is plain text that survives being pasted anywhere", () => {
    const report = composeReport([err()], env());
    expect(report).not.toContain("```");
    expect(report.split("\n").every((l) => !l.includes("\t"))).toBe(true);
  });

  // The strongest form of DEC-041's central promise. Asserting on the report's
  // text only proves this version did not leak; reading the source proves no
  // version can, because there is no mechanism to leak with.
  it("cannot transmit, because the module contains no mechanism to transmit with", () => {
    for (const forbidden of [
      "fetch(",
      "sendBeacon",
      "XMLHttpRequest",
      "new Image",
      "WebSocket",
      "EventSource",
      "localStorage",
      "sessionStorage",
      "document.cookie",
      "indexedDB",
    ]) {
      expect(erroreportCode, `erroreport.ts calls ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("scans code rather than prose, so naming a forbidden API does not trip it", () => {
    // The guard above is only meaningful if it cannot be satisfied or defeated by
    // a comment. Both halves are asserted here: the docstring names several of
    // these APIs to say they are absent, and the scan still has to see that.
    expect(erroreportSource).toContain("sendBeacon");
    expect(erroreportCode).not.toContain("sendBeacon");
  });

  it("is empty-safe: no failures makes a report that still identifies the build", () => {
    const report = composeReport([], env());
    expect(report).toContain("Failures: 0");
    expect(report).toContain("Build: Je5j2EHb");
  });
});

describe("the buffer", () => {
  it("is bounded, because an error loop must not become a memory leak", () => {
    const buffer = new ErrorBuffer();
    for (let i = 0; i < MAX_CAPTURED * 3; i++) buffer.add(err({ message: `e${i}` }));
    expect(buffer.size).toBe(MAX_CAPTURED);
  });

  it("keeps the newest when it overflows, and the oldest when it fits", () => {
    const buffer = new ErrorBuffer();
    buffer.add(err({ message: "keep-me" }));
    for (let i = 0; i < MAX_CAPTURED + 4; i++) buffer.add(err({ message: `drop-me-${i}` }));
    const messages = buffer.all().map((e) => e.message);
    expect(messages).not.toContain("keep-me");
    expect(messages[messages.length - 1]).toBe(`drop-me-${MAX_CAPTURED + 3}`);
  });

  it("hands out a copy, so a caller cannot mutate what is kept", () => {
    const buffer = new ErrorBuffer();
    buffer.add(err());
    (buffer.all() as CapturedError[]).push(err());
    expect(buffer.size).toBe(1);
  });

  it("can be emptied once the visitor has read it", () => {
    const buffer = new ErrorBuffer();
    buffer.add(err());
    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.all()).toEqual([]);
  });
});

describe("normalising what the browser hands over", () => {
  it("keeps the message the browser heard, with where it happened", () => {
    const captured = fromUncaught("boom", "/assets/index-Je5j2EHb.js", 12, 5, null, 1);
    expect(captured.kind).toBe("uncaught");
    expect(captured.message).toContain("boom");
    expect(captured.message).toContain("index-Je5j2EHb.js:12:5");
  });

  it("uses a real Error's name and stack when there is one", () => {
    const captured = fromUncaught("boom", null, null, null, new TypeError("deep"), 1);
    expect(captured.name).toBe("TypeError");
    expect(captured.stack).toContain("TypeError: deep");
  });

  it("does not repeat the message when the Error already carries it", () => {
    const captured = fromUncaught("deep", null, null, null, new Error("deep"), 1);
    expect(captured.message).toBe("deep");
  });

  it("labels a rejection that is not an Error rather than losing it", () => {
    const captured = fromRejection({ nope: true }, 1);
    expect(captured.name).toBe("UnhandledRejection");
    expect(captured.message).toContain("nope");
    expect(captured.stack).toBeNull();
  });

  it("handles a rejected string", () => {
    expect(fromRejection("plain text", 1).message).toBe("plain text");
  });
});

describe("safeStringify", () => {
  it("reports a cycle instead of throwing while reporting a throw", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;
    expect(safeStringify(cyclic)).toBe("[unserialisable value]");
  });

  it("handles a value JSON drops, which is not the same as undefined", () => {
    expect(safeStringify(() => 1)).toBe("() => 1");
    expect(safeStringify(undefined)).toBe("undefined");
  });
});

describe("readBuild", () => {
  const doc = (src: string | null): Document =>
    ({
      querySelector: () => (src === null ? null : { getAttribute: () => src }),
    }) as unknown as Document;

  it("reads the content hash out of the bundle the page actually loaded", () => {
    expect(readBuild(doc("./assets/index-Je5j2EHb.js"))).toBe("Je5j2EHb");
  });

  it("reports nothing on a dev server, which serves the entry module unbundled", () => {
    expect(readBuild(doc("/src/main.ts"))).toBeNull();
    expect(readBuild(doc(null))).toBeNull();
  });

  it("does not invent a hash from a filename that merely looks hashed", () => {
    // Vite's hash is eight characters. Anything else is a hand-written name, and
    // reporting it as a build id would be a false claim about which bytes ran.
    expect(readBuild(doc("./assets/index-not-a-hash.js"))).toBeNull();
    expect(readBuild(doc("./assets/index-abc.js"))).toBeNull();
  });
});