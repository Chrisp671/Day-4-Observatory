/**
 * Error reporting (DEC-041). The whole of it, and every clause is a promise.
 *
 * The plan asked for observability on a static site. The finding that shaped
 * this is that GitHub Pages cannot accept a POST, so an automatic send needs a
 * hosted endpoint — and an identifier-free sink is a standing privacy surface.
 * **A static instrument does not justify one.** So:
 *
 *  - errors are captured **in memory only**, and the buffer is bounded;
 *  - **nothing is transmitted, ever, by this module.** It has no fetch, no
 *    sendBeacon, no image ping and no form target. The composed report is
 *    returned as a string for the visitor to do something with;
 *  - **no visitor identifier, no cookie, no localStorage read.** The report is
 *    the error, the build, the browser and platform, and a timestamp;
 *  - the cost is recorded rather than hidden: the owner hears only about
 *    failures a visitor cared enough to report.
 *
 * The module is pure and takes its environment as arguments, so every one of
 * those clauses is testable without a browser and without mocking `window`.
 */

/** What one failure contributes to the report. */
export interface CapturedError {
  /** "uncaught" for window.onerror, "unhandledrejection" for the other. */
  readonly kind: "uncaught" | "unhandledrejection";
  readonly name: string;
  readonly message: string;
  /** Stack if the platform gave one; a rejection often does not. */
  readonly stack: string | null;
  /** Unix millis the error was seen. */
  readonly at: number;
}

/** How many failures are kept. Bounded because this is a fixed-size buffer in a
 * long-lived page: an error loop must not become a memory leak. */
export const MAX_CAPTURED = 10;

/**
 * The environment a report is composed against. Passed in rather than read from
 * `navigator`, so the privacy clauses are checkable: this is the entire set of
 * things the report is allowed to know about the visitor.
 */
export interface ReportEnvironment {
  /** The bundle's content hash, or null when it cannot be read (a dev server). */
  readonly build: string | null;
  /** navigator.userAgent — the browser and platform, which is what it describes. */
  readonly userAgent: string;
  /** Rendered local time, e.g. "2026-10-06 14:05:33". Not a locale or a zone
   * name: the owner does not need to know where the visitor is. */
  readonly when: string;
}

const line = (label: string, value: string): string => `${label}: ${value}`;

/**
 * Compose the report. Plain text, because it has to survive being pasted into
 * an email, an issue, or a chat window without reflowing into something that
 * hides half of it.
 *
 * Shape is a bug-report template: a short header identifying the build and the
 * browser, then the failures numbered oldest-first. The header leads because
 * the build is how every line after it is interpreted — a stack trace from the
 * wrong bundle is a wild goose chase — and the failures follow as the bulk,
 * which is where the actual content is.
 */
export function composeReport(
  errors: readonly CapturedError[],
  env: ReportEnvironment,
): string {
  const head = [
    "Day4 Observatory — problem report",
    line("When", env.when),
    line("Build", env.build ?? "unknown (not a built bundle)"),
    line("Browser", env.userAgent),
    line("Failures", String(errors.length)),
    "",
  ];
  const body = errors.flatMap((error, index) => {
    const block = [
      `${index + 1}. ${error.kind}: ${error.name}: ${error.message}`,
      line("   At", new Date(error.at).toISOString()),
    ];
    if (error.stack !== null) block.push(`   ${error.stack.split("\n").join("\n   ")}`);
    return [...block, ""];
  });
  return [...head, ...body].join("\n").trimEnd();
}

/** A bounded, newest-last buffer. Newest-last because the first failure is
 * usually the cause and the rest are its consequences, and a report that
 * starts with the consequence is a report that wastes the owner's time. */
export class ErrorBuffer {
  readonly #errors: CapturedError[] = [];

  add(error: CapturedError): void {
    this.#errors.push(error);
    while (this.#errors.length > MAX_CAPTURED) this.#errors.shift();
  }

  get size(): number {
    return this.#errors.length;
  }

  /** Oldest first, which is the order `composeReport` wants. */
  all(): readonly CapturedError[] {
    return [...this.#errors];
  }

  clear(): void {
    this.#errors.length = 0;
  }
}

/** Normalise a `window.onerror` invocation into the one shape kept. */
export function fromUncaught(
  message: string,
  source: string | null,
  line: number | null,
  column: number | null,
  error: unknown,
  at: number,
): CapturedError {
  const detail = error instanceof Error ? error : null;
  const where =
    source === null
      ? ""
      : ` (${source}${line === null ? "" : `:${line}`}${column === null ? "" : `:${column}`})`;
  return {
    kind: "uncaught",
    name: detail?.name ?? "Error",
    // The message argument is what the browser heard; the Error's own message is
    // the same text more often than not, and using it keeps the two from
    // disagreeing about what happened.
    message: `${message}${detail !== null && detail.message !== "" && !message.includes(detail.message) ? detail.message : ""}${where}`,
    stack: detail?.stack ?? null,
    at,
  };
}

/** Normalise an `unhandledrejection` value. Rejections carry almost anything at
 * all, so this is deliberately forgiving rather than throwing on the way to
 * reporting a throw. */
export function fromRejection(reason: unknown, at: number): CapturedError {
  if (reason instanceof Error) {
    return {
      kind: "unhandledrejection",
      name: reason.name,
      message: reason.message,
      stack: reason.stack ?? null,
      at,
    };
  }
  return {
    kind: "unhandledrejection",
    name: "UnhandledRejection",
    message: typeof reason === "string" ? reason : safeStringify(reason),
    stack: null,
    at,
  };
}

/** `JSON.stringify` throws on a cycle and returns undefined for a function or
 * a symbol — and this runs while reporting a failure, so it must not become
 * one. */
export function safeStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return json === undefined ? String(value) : json;
  } catch {
    return "[unserialisable value]";
  }
}

/**
 * The build hash, read from the module script the page actually loaded.
 *
 * Vite stamps a base64url content hash into the bundle filename, so this is a
 * true statement about which bytes are running — and it is read from the
 * document rather than baked in, so it cannot go stale. Two details matter
 * rather than being pedantry: Vite's default hash is **eight** characters, so
 * the length is what distinguishes a real hash from a hand-written filename,
 * and a dev server serves `/src/main.ts` unbundled, which is reported as
 * unknown rather than guessed at.
 */
export function readBuild(doc: Document): string | null {
  const script = doc.querySelector<HTMLScriptElement>('script[type="module"][src]');
  const src = script?.getAttribute("src") ?? "";
  const match = /\/assets\/(?:index|main)-([A-Za-z0-9_-]{8})\.js$/i.exec(src);
  return match?.[1] ?? null;
}