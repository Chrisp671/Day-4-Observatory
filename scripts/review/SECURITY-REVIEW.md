# Pipeline security review and validation

## OpenCode Go adapter follow-up

The activation follow-up adds Qwen3.7 Plus through the existing OpenCode Go account.
Rafter's LLM and CWE review confirms a fixed HTTPS destination, no redirects,
step-scoped credentials, no added dependencies and unchanged evidence/output
limits. Only the approved vision model `qwen3.7-plus` is accepted. Its underlying
family is `qwen`, so naming a proxy cannot bypass the different-family rule.
Conflicting family declarations, text-only/unapproved models, tool-call results,
refusals, missing final text and truncated responses fail closed. Reasoning blocks
are discarded, never parsed as the final review or published. Thirteen Python
tests pass, including the added adapter and family cases. The follow-up's local
pattern-based secret scan returned no findings. Remote Rafter remains deferred
by the owner; this is not a remote SAST/SCA certification.

Live OpenCode Go validation used `qwen3.7-plus` with the existing account key,
235,421 characters of diff/source/rubric evidence and all eight real PNGs. The
response passed the strict schema and source-line validator: eight judgements,
two advisory visual findings and no blocking findings. It identified the known
tablet dial overlap and phone ledger truncation, but still marked every screenshot
legible. This proves API/image/response integration, not human-equivalent visual
judgement; the owner's rendered-size judgement remains authoritative.

The remaining evidence below records the original PR #4 validation.

Reviewed with the Rafter secure-design, LLM and CWE walkthroughs. The design and
trust boundaries were recorded in DESIGN.md before implementation. No unresolved
blocking finding was identified in this manual walkthrough. Remote Rafter
SAST/SCA remains unverified: `rafter run --mode fast --skip-interactive` refused
because no RAFTER_API_KEY is configured. This is not a claim of a clean remote scan.

## Evidence

- Secrets/privileges: `review-web.yml:7` grants only contents read;
  `review-web-report.yml:29` checks out the trusted workflow commit and its line 38
  injects REVIEW_API_KEY only into the reporting step. There is no npm install,
  browser or PR checkout in that job. Deploy writes are scoped to the deploy job.
- Injection/deserialization: `changes.py` uses subprocess argument arrays with
  validated SHA values. `contract.py:101` allows exactly nine ZIP entries and
  reads them in memory, with entry/total byte limits and PNG dimensions. No ZIP
  extraction, pickle, eval, model tool calls or executable model output exists.
- Outbound credentials/SSRF: `api.py:12` rejects automatic redirects;
  `api.py:72` separately validates artifact storage hosts and sends no GitHub auth
  header to the signed download. `api.py:88` has fixed provider endpoints.
  `verify-live.mjs` restricts the deployment origin, local asset paths, symlink
  resolution and response sizes. External Google Fonts CSS is excluded from
  bundle hashing; it is never fetched by that verifier.
- Output trust: `contract.py:83` validates the model schema, one judgement per
  screenshot and real source locations. `contract.py:167` escapes free-form
  output and suppresses mentions. `review.py:93` only updates the pipeline marker
  on a github-actions bot comment, not an arbitrary author's comment.
- Identity/races: `review.py:18` checks PR head, base, body, latest run and attempt
  before expensive work and before publication. `review.py:103` verifies the
  triggering workflow and creates checks on its exact head. Repeated callbacks
  for completed checks do not repeat a paid request. Superseded results cannot
  replace the current comment; they cancel their own check.
- Supply chain/resource limits: added actions have commit pins; Playwright has an
  exact version plus integrity lockfile; its npm install disables lifecycle
  scripts. API timeout/output limits, context bounds, finite pagination and
  workflow concurrency constrain consumption. npm reported zero known
  vulnerabilities for both app and capture-tool dependency installations.
- Not applicable: no SQL, application authentication/session changes, cryptographic
  key generation, payment flow, multi-tenant storage, RAG or application deletion.
  SHA-256 is used for integrity comparison, not passwords or authentication.

## Validation performed

- Application: 155 tests passed; explicit TypeScript check and production build passed.
- Pipeline: 12 Python tests covering malicious/oversized-shaped input boundaries,
  malformed and incomplete model output, family mismatch, no-call failure paths,
  head-check failures, idempotency and comment updates; 2 Node tests covering asset
  URL validation and real HTTP matching/stale/tampered/redirect/propagation cases.
- All three changed workflows passed actionlint 1.7.12; git whitespace check passed.
- Eight Chromium screenshots captured from the built dist at the requested sizes
  and states, with no browser errors. All eight were visually inspected.
- Live verifier passed against https://chrisp671.github.io/Day-4-Observatory/ and
  produced phone/tablet live screenshots. The matching bundle was
  `assets/index-BToWCCAh.js`, SHA-256
  `8952c0da2cdaca7af62462b7ce1b958763d41cabc115a6ed556f99433549e73a`.
- Rafter local pattern-based secret scans of scripts/review and .github returned
  no findings. The managed Betterleaks integration reported a version mismatch,
  so the explicitly selected patterns engine supplied these local results.

## Remaining activation and review limits

The owner must merge the initial pipeline, configure REVIEW_API_KEY,
REVIEW_PROVIDER and REVIEW_MODEL, exercise the first model-backed PR review, and
require **Web review** in main's protection. Those settings were absent during
implementation. No paid provider call or end-to-end workflow_run publication was
claimed as tested. A configured RAFTER_API_KEY is also needed for the remote scan.

The fixed tablet expanded-TONIGHT screenshot exposes a pre-existing application
layout problem: the dial shrinks and overlaps the readout/control area. Phone
ledger text is also truncated in the existing layout. Captures intentionally
preserve that evidence. Application files remain outside this pipeline's scope;
these observations are not a visual approval of the app.
