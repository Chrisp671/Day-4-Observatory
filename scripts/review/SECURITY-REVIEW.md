# Pipeline security review and validation

## PR #3 failure repair

Read-only replay of PR #3's exact head and screenshot artifact reproduced HTTP
400 `MissingSessionID` on a 6,202,288-byte request. The provider required the
`x-opencode-session` routing header; the response did not report a size limit.

Rafter LLM/CWE review: `api.py` bounds text at 600,000 UTF-8 bytes and complete
request JSON at 6,000,000 bytes before HTTP (eight captures since 2026-09-14). Only model requests opt into error excerpts;
8192 bytes are read, credential header values/URLs/image data are redacted, then
at most 500 characters pass to the existing Markdown-escaped comment sink.
No API key enters prompts or the stable session digest. The digest is routing
metadata, not authentication. No new dependencies or execution of PR code.

`review.py` loads changed files plus one hop of local imports from the Git tree;
regular-file, hidden-file and repository path guards apply to dependencies too.
Python imports are parsed with AST, never imported. The eight actual PNGs were
verified at CSS dimensions and total 4,269,438 bytes: resizing is unnecessary.
Tests cover missing session header, exact/over-limit and multibyte text, oversized
serialized image payloads, provider error redaction/opt-in, and direct versus
transitive/unrelated context selection. Seventeen Python and two Node tests pass. A second replay returned valid JSON
inside one code fence; accepting only that whole-response envelope passed the
unchanged strict review validator on the actual saved final response: complete,
eight screenshots, four advisory architecture findings and no blocking findings.
This was a local read-only replay, not a posted GitHub check.
The local pattern-based secret scan found no secrets. Remote SAST/SCA remains
owner-deferred; no remote certification is claimed.

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

Addendum 2026-10-14 (#33, #34): the allowlist now also holds two free Go models,
`step-5-preview-free` (family `stepfun`) and `longcat-2.5-preview-free` (family
`meituan`), served on the fixed endpoint
`https://opencode.ai/zen/go/v1/chat/completions` with the same key and session
header. Their adapter fails closed on the same conditions (exactly one choice,
`finish_reason` of `stop`, string content, no tool call, function call or
refusal), never accepts a reasoning field as the review, and reports a rejected
response only through a fixed vocabulary with no provider text. Output is capped
at 32,000 tokens and the response read at 1 MB on that path only. `rafter
secrets` found nothing new; remote `rafter run` was not available.

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

## Addendum 2026-10-18: manual GPT-6.1 Sol reviewer (DEC-054)

**Independent review outcome (GPT-6.1 Sol, two rounds).** Round 1 reproduced a race: an evidence re-run that fails while `manual_publish.py` validates could be overtaken by a success built on the older attempt. Round 2 showed the added final re-check narrows but cannot close that window, since the evidence workflow is outside the publisher's concurrency group. Mitigation, applied in branch protection on 2026-10-18: `Gate and capture` (GitHub Actions, app 15368) is a required check beside `Web review`, so failing or pending evidence blocks the merge independently of any manual verdict. The re-check stays as defence in depth, with a regression test.

Walked with `rafter-secure-design` (auth, ingestion, deployment and the STRIDE
capstone) before any code was written. The change adds one new input boundary
(a `workflow_dispatch` publish path with write permissions), one read-only local
helper, and a reporter mode that never calls a model.

Data flow: PR source -> existing evidence run (unchanged, no secrets) ->
`manual_prepare.py` on the maintainer's machine, reading only through the GitHub
API with the maintainer's `gh` token -> a local folder (instructions, evidence,
eight PNGs, manifest, meta) -> GPT-6.1 Sol through the owner's Codex session ->
the model's JSON reply, pasted by the maintainer into `review-manual.yml` ->
`manual_publish.py` on a fresh runner running default-branch code with
`GITHUB_TOKEN` -> commit status, check run and one PR comment.

Identity and authorisation. Who may publish a verdict: anyone who can dispatch
a workflow in this repository, which is anyone with write access (today, the
single maintainer). The workflow runs only on the default branch (its job is
conditioned on `github.ref` being the default branch), so the ref a dispatcher
chooses cannot select PR code. The verdict is attributed in the comment to the
reviewer (`openai/gpt-6.1-sol (manual, via Codex)`) and in the run log to the
dispatching actor, and the publishing run is linked from the comment, so the
act is auditable. There is no application auth, session, password or token
design here; `GITHUB_TOKEN` is ephemeral and scoped by the workflow's
permissions block, which copies the reporter's (contents and actions read,
checks, statuses and pull-requests write) and adds nothing. The local helper
needs no write scope and makes no write request.

Ingestion. Three inputs cross into the publisher: `pr`, `sha`, `review`. Each
is read from the event payload (never interpolated into a shell), bounded and
checked before any GitHub write: `pr` must be a short decimal, `sha` forty hex
characters that equal the PR's current open head, and `review` at most 64,000
UTF-8 bytes (GitHub itself caps the whole dispatch payload at 65,535
characters). The review is then parsed with the existing `strict_json`
(duplicate keys and non-finite numbers rejected, one whole-response fence
allowed) and validated by the unchanged `validate_review` against the source
context the reporter would build for that sha, so a finding must cite a real
file and line and every screenshot must be judged. The exact-key schema rejects
unknown fields. Model and maintainer text reaches the comment only through
`safe_text`, as on the model path. No raw input is echoed to logs: failures
print the pipeline's own fixed messages. `manual_prepare.py` writes only fixed
file names into a folder that must be empty; nothing from the artifact chooses
a path. The artifact goes through the unchanged `read_artifact` bounds.

Gate equivalence. A manual verdict may be published only for a head whose
latest evidence run succeeded with its gate job green, whose PR has web or
pipeline changes, and whose body carries exactly one accepted
`Builder-Model-Family` line that is not `openai` (checked with the same
`provider_config` as the model path, in the reporter, the helper and the
publisher). A `routed-unknown` builder keeps the published "independence not
established" line. The success and failure status descriptions carry the word
`(manual)` so the reporter can recognise a manual verdict and leave it alone.

Threat walk (per boundary). Spoofing: a status posted with a personal token
does not satisfy branch protection; only the workflow's token can, and only a
write-access account can dispatch it. Tampering: PR code is never checked out
or executed by the publisher; the evidence is read as data; a stale sha (head
moved) is refused before and re-checked immediately before writes. Repudiation:
the comment names reviewer, builder family and base, and links the publishing
run, which records the actor. Information disclosure: the run log holds fixed
strings; the comment holds escaped review text, as today. Denial of service: no
model call, no paid request, bounded input, timeouts and the reporter's
concurrency group reused for the same sha so a reporter callback and a manual
publish never interleave. Elevation: the token's permissions are unchanged from
the reporter's; a dispatcher who already has write access gains the ability to
publish a verdict, which is the same ability an admin merge already confers.

Abuse twins. "Maintainer pastes Sol's reply" -> "a write-access account pastes
a hand-written clean review": accepted and stated in RSK-008; the validator
still requires located findings and eight legibility judgements, the diff is
unchanged, and the comment shows who published. "Maintainer runs the helper" ->
"a PR body says ignore the rubric": the helper copies the reporter's exact
instructions, which mark all evidence untrusted; prompt injection is not made
impossible, as before. "Dispatcher chooses a branch" -> the job condition
refuses any ref but the default branch.

Residual risks, accepted by the owner (DEC-054, RSK-008): the gate now depends
on the maintainer's machine and Codex session being available, and on whoever
holds write access; a body edit after a verdict keeps the verdict for the same
sha; the reviewer's identity is declared, not proven. Not applicable: SQL,
sessions, uploads, crypto, deletion, new dependencies (standard library only).

Rafter code review (after implementation, 2026-10-18), walked with the CWE
Top 25 and LLM Top 10 questions against the diff:

- Injection (CWE-78/94): the only subprocess is `manual_prepare.py:42`, list
  form with fixed arguments and no shell; no eval, exec or shell interpolation.
  The workflow's `run:` line is a fixed command; inputs are read from the event
  file, not expanded into the shell.
- Input validation (CWE-20): `manual_publish.py:29-38` bound and type-check
  all three inputs before any API call; `:45` matches the sha against the
  current open head before the evidence or the review text is examined (pinned
  by a test that fails when the check is removed); `:60` re-reads the head,
  base and body immediately before the first write.
- Deserialization (CWE-502): JSON only, through the existing `strict_json`
  (duplicate keys and non-finite numbers rejected) and `validate_review`
  (exact-key schema, located findings, eight judgements).
- Path handling (CWE-22): `manual_prepare.py` writes fixed names from the
  contract into a folder the maintainer chose, refused unless empty (`:69`);
  no name from the artifact or the PR reaches a path.
- Credentials (CWE-798): none in code; the helper's token comes from the
  environment or `gh auth token` and is never printed; the workflow grants the
  reporter's permissions and no more (`review-manual.yml:25-30`), checks out
  only `scripts/review` at the trusted commit without persisted credentials,
  and runs only on the default branch (`:42`).
- Output handling (LLM05): model text reaches the comment and the check-run
  summary through `render` and `safe_text` as on the model path; the actor
  login is bounded and escaped (`manual_publish.py:57`); status descriptions
  are fixed strings; a rejected input writes nothing and the logs carry only
  the pipeline's own messages.
- Verdict integrity: a standing manual verdict is recognised only when the
  newest `Web review` status was created by the Actions bot and carries
  `(manual)` (`review.py manual_verdict`); a look-alike posted with a personal
  token is ignored, with a test for it. The reporter's `current` check and the
  shared concurrency group keep a reporter callback and a manual publish for
  the same head from interleaving.

No blocking finding. Validation: 56 Python tests pass (42 before this
change); three gate mutations (head-sha check removed, `validate_review`
removed from the publisher, manual mode calling the model) each fail a named
test. `rafter secrets scripts/review` and `rafter secrets .github` found
nothing; a whole-repository scan reports five pre-existing hits in the parked
Xcode `Observatory.xcscmblueprint` (SCM identifiers, not keys, untouched by
this change). `rafter run` refused because no RAFTER_API_KEY is configured;
this is not a claim of a clean remote SAST/SCA scan. No live dispatch of
`review-manual.yml` was made: it cannot run until it exists on `main`, which
is why the owner admin-merges this PR once.
