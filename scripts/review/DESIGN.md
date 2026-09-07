# Review pipeline design

## OpenCode Go activation amendment

The owner requested a different vision reviewer after the configured MiMo Pro
proved text-only. Qwen3.7 Plus is served by the same existing Go account and accepts
images. The new adapter uses only the fixed HTTPS endpoint
`https://opencode.ai/zen/go/v1/messages`; it does not accept arbitrary
OpenAI-compatible base URLs. The allowlist initially contains only `qwen3.7-plus`,
mapped to the underlying `qwen` family. A proxy's provider name is not a
model family and cannot evade independence checks. Unknown/text-only models fail
before a paid request. Credentials remain step-scoped and no new dependency is
introduced. Responses must end normally. Only text and reasoning blocks are accepted;
reasoning is discarded and only final text enters the strict review validator.
Tool-use and other unexpected blocks are rejected, even with an end-turn marker.
The HTTP adapter retains no-redirect, size and time bounds. This amendment was
walked through the Rafter ingestion/deployment and LLM/CWE questions before code.

## Contract and ownership

The pipeline owns `.github/workflows/review-web.yml`,
`.github/workflows/review-web-report.yml`, the final verification job and supporting
artifact/output changes in `deploy-web.yml`, `scripts/review/**`, and
`.github/review-rubric.md`. Application files and PLAN.md are read-only.

Two workflows implement one review pipeline. `pull_request` executes the gate and
captures without secrets or write permissions. `workflow_run` executes trusted
default-branch Python only, reads evidence as data, calls the configured vision
provider, and publishes the `Web review` check on the PR head SHA and one comment.
The required check is deliberately not a workflow-level path-filtered job.

The initial pipeline PR requires manual review: the reporting workflow cannot run
until installed on the default branch. Pipeline/rubric modifications are themselves
reviewed against the default-branch policy; policy cannot change its own verdict.

## Rafter secure-design decisions (before implementation)

- Data flow: PR source -> disposable read-only build runner -> bounded PNG artifact
  -> fresh trusted reporting runner -> allowlisted model API -> validated JSON ->
  GitHub comment and check. Deployment build -> immutable dist artifact -> Pages ->
  separate unprivileged browser job comparing asset bytes with that artifact.
- Identity: GitHub supplies workflow/run/PR identities. The reporter re-fetches
  them, checks workflow path, repository, PR head, latest run and attempt. Artifact
  contents cannot select the PR, SHA, provider, endpoint, executable, or output path.
- Secrets: REVIEW_API_KEY is supplied only to the trusted review step. GITHUB_TOKEN
  is ephemeral and limited to contents/actions read and checks/pull-requests write.
  Checkout does not persist credentials. No application build, install script, or
  browser runs in that credential-bearing job. Owner rotates the repository secret.
- Ingestion: standard JSON parsing, explicit exact-key schemas, bounded API bodies,
  source context, diff, findings and images. ZIP entries are allowlisted, bounded,
  checked for duplicates and PNG dimensions, and read in memory, never extracted.
  Oversized, missing or invalid evidence fails closed as review incomplete.
- Network: provider hosts and API paths are fixed adapters (OpenAI, Anthropic,
  Google); model IDs have bounded safe characters and known family prefixes.
  Authenticated API requests do not follow redirects. Artifact signed downloads
  use a separately validated GitHub storage destination without an auth header.
  Live verification permits only the deployment's HTTPS origin and same-origin
  assets; localhost HTTP is an explicit local-test option. Redirects fail.
- Dependencies: Python standard library for API/report processing; Microsoft
  Playwright for real browser capture, exact version and npm integrity lockfile in
  scripts/review. CI installs this package with --ignore-scripts and installs the
  browser explicitly. The app's requested npm ci runs only without secrets.
  GitHub actions added by this pipeline are pinned to commits. Security scanning
  and npm audit accompany validation; browser pins need routine updates.
- Model boundary: base-branch rubric is trusted policy; PR body, code, PLAN entries,
  screenshots, and model response are untrusted evidence. No tools or shell access
  for the reviewer. Model text is escaped before publication. Findings require
  valid source locations. No automatic merges or source edits.
- Resource bounds: workflow timeouts, concurrency, finite pagination, bounded
  model output and one paid model request per completed eligible run. No automatic
  model retries. Missing configuration, provider failure or truncation fails closed.
- Storage: evidence artifacts retained 14 days, including capture configuration.
  Prompt/source payloads, raw API errors and credentials are not logged. Repository
  source and images are sent to the owner-selected provider; its account retention
  policy applies. OpenAI response storage is disabled. No database, PII ingestion,
  authentication system, uploads service or user-data deletion is introduced.

## STRIDE and abuse cases

| Boundary | Abuse | Control |
| --- | --- | --- |
| PR -> build | Install script steals reviewer key (disclosure/elevation) | No reviewer secret or write token in build; fresh reporting VM |
| Build -> reporter | Forged artifact chooses another PR or overwrites Python (spoofing/tampering) | API-derived identity; fixed artifact name; no ZIP extraction or execution |
| Evidence -> model | PR says ignore rubric, invent approval (tampering) | Role separation, no tools, strict result validation; owner review remains necessary |
| Model -> GitHub | Output injects images, mentions or links (disclosure) | Escape all free text, generate only trusted repository links |
| Re-run -> check | Old run overwrites a new result (repudiation/tampering) | Latest-run/attempt and head rechecks immediately before writes; run links retained |
| APIs -> runner | ZIP bomb, huge diff or repeated paid calls (DoS) | Byte/count/pagination/time limits, no automatic paid retry, concurrency |
| Deployment -> verifier | HTML points at internal URL or stale bundle (SSRF/tampering) | Same-origin asset allowlist, no redirects, artifact-to-live SHA-256 comparisons |

Residual limits: screenshot evidence comes from a PR-controlled runner and is not
an attestation against a malicious contributor. Prompt injection cannot be made
impossible. A model-family declaration is auditable metadata, not proof of who
built code. Maintainers must protect workflow/policy changes and review findings;
this system does not replace those controls. Real phone observations outrank
model judgements. A post-deploy failure reports a bad release but does not roll it
back automatically. Repository settings and the full owner profile remain owner
configuration, not inferred secrets or fabricated policy.
