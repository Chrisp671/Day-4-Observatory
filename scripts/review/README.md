# Web review pipeline

`review-web.yml` builds the PR head without credentials; `review-web-report.yml`
reviews its evidence using trusted default-branch code. The latter publishes the
required **Web review** check on that exact PR head and updates one bot comment.
Both workflows together are the review pipeline. Application source is never
modified by the reviewer.

## Owner setup and first run

1. Review and merge the initial pipeline PR. A new `workflow_run` workflow only
   becomes active after it exists on the default branch; this bootstrap PR gets
   build/screenshot checks, but cannot certify itself through the new reviewer.
2. Under repository Settings > Secrets and variables > Actions, add the secret
   `REVIEW_API_KEY` for your chosen provider. Add repository variables
   `REVIEW_PROVIDER` and `REVIEW_MODEL`. Provider values are `openai`, `anthropic`,
   `google`, or `opencode-go`; use an approved vision model ID from that provider.
   The key must belong to that provider. No endpoint URL or key belongs in code.
   The owner's selected reviewer is `REVIEW_PROVIDER=opencode-go` and
   `REVIEW_MODEL=qwen3.7-plus`, using the existing Go account. Qwen is Alibaba's
   family; the account's text-only MiMo Pro reviewer cannot inspect screenshots.
3. Open a small web PR with the metadata below. Verify eight screenshots, a single
   comment, and the **Web review** check. Re-run **Web review evidence** to retry a
   failed model call or to review after changing the variables/key. Editing the PR
   body also triggers the pipeline. Re-running only the reporting workflow is
   idempotent and will not repeat an already completed paid request.
4. After the check has appeared, protect `main` with required **Web review**,
   selecting GitHub Actions as its expected source. Require branches to be up to
   date and owner review of changes to workflows, `scripts/review/**`, and the
   rubric. Do not require the reporting job name or a path-filtered workflow.
   The owner controls merges; no workflow merges PRs or changes protection.

Every application PR body includes its actual builder family and PLAN references:

```text
Builder-Model-Family: anthropic
Implements DEC-036 and WI-027.
```

The family declaration is required, case-insensitive, and must appear exactly once
on its own line. Accepted families are `openai`, `anthropic`, `google`, and
`qwen`. Models from the same developer count as one family, conservatively;
using a different API gateway does not establish independence. OpenCode Go is a
gateway, not a family: its initially allowlisted `qwen3.7-plus` maps to `qwen`.
Other Go models are rejected until explicitly reviewed and added with their family
and vision capability. The Messages adapter discards reasoning blocks and validates
only the final JSON review; tool-use blocks and truncated answers fail. For multiple builders, use a
reviewer provider different from all of them and document the contributors; the
current machine-readable field records the lead builder only. Model provenance
is declared, not cryptographically verified.

No model is silently chosen. An invalid family, missing citation/key/variable,
unsupported model, timeout, oversized evidence, malformed output, incomplete
review or uncertain screenshot assessment fails the check as **incomplete**.
BLOCKING findings fail; ADVISORY-only reviews pass. Non-web PRs receive a success
without an API call. Changes to PLAN.md or the pipeline also require review.

## Captures and review evidence

The gate runs `npm ci`, `npm test`, `npx --no-install tsc --noEmit` and
`npm run build` in `web/`, sequentially. Chromium captures the resulting Vite
preview at 390×844 and 820×1180 for loaded, month-forward, expanded TONIGHT and
second-row selection. Each state starts with clean storage, station 40°N/74°W,
America/New_York time, en-US locale and 2026-09-02 23:00 UTC. Screenshots are CSS
pixels with no zoom. Month/ring actions must change the dial; expansion must open
the programme. Browser errors fail capture. A manifest records the fixture,
canvas text observations, dimensions, state and page height.

The four states are independent because opening TONIGHT hides its compact list.
The month button is selected by its accessible name. The second compact row must
actually be a planet. Each image starts at scroll position zero. A long expanded
programme can extend below the viewport: these eight captures assess the visible
viewport, not every offscreen row. Owner phone observations remain authoritative.

The model receives the PR diff, cited PLAN entries, baseline design canon,
trusted rubric, complete changed text files (excluding lockfile context),
unchanged web source context, and eight images. It has no tools. Findings need a
valid file/line, category, consequence and one-sentence fix. Every image needs a
rendered-size judgement. Text and links in model output are escaped before being
published. Policy changes in a PR do not override the trusted rubric.

The owner confirmed the existing hour markings, including AM/PM suffixes, are
allowed. Other canvas dial words/labels are BLOCKING. The owner also confirmed
proceeding with the five architecture principles without supplying the full profile.

## Deployment verification

Deployment preserves the exact built dist in `deployed-web-dist`. After Pages
deployment, a fresh job compares the live HTML's local JS/CSS bundle references
with that artifact, then compares SHA-256 hashes of the referenced asset bytes.
Six bounded attempts allow propagation; persistent mismatch fails. Existing
Google Fonts stylesheets are not Vite bundles and are not fetched by the hash
verifier. The verifier screenshots the live URL at both sizes and uploads
`live-web-verification`; it does not rebuild or automatically roll back.

The production origin is explicitly restricted to `chrisp671.github.io`, verified
against the current Pages configuration. A future custom-domain migration needs
an intentional verifier allowlist change. Local tests explicitly opt into loopback
HTTP. Production requests reject redirects and cross-origin bundle references.

## Local verification

From the repository root, after building `web/`:

```sh
npm ci --ignore-scripts --prefix scripts/review
python -m unittest discover -s scripts/review -p 'test_*.py'
npm test --prefix scripts/review
cd scripts/review
npx --no-install playwright install chromium
```

Start `npx --no-install vite preview --host 127.0.0.1 --port 4173 --strictPort` in
`web/`; in another terminal at the root run:

```sh
node scripts/review/capture.mjs http://127.0.0.1:4173/ scripts/review/output
```

Use `npm.cmd` / `npx.cmd` in PowerShell when script execution policy blocks the
PowerShell shims. The Python tests mock provider requests; they never need a key
or incur model charges. The live hash test uses a real local HTTP server to check
matching builds, stale HTML, same-name byte tampering, redirects and propagation.
The local output directory and dependencies are ignored by git.

Run `rafter secrets scripts/review` and `rafter run --mode fast` for the security
gate. Missing `RAFTER_API_KEY` prevents the remote SAST/SCA scan; a local secret
scan is not a substitute. See SECURITY-REVIEW.md for the implementation review
and validation limits.

## References

- [GitHub workflow_run security](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [GitHub required checks and skipped workflows](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [Playwright clock](https://playwright.dev/docs/clock)
- [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [Anthropic image inputs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Google generateContent API](https://ai.google.dev/api/generate-content)
- [OpenCode Go endpoints](https://opencode.ai/docs/go/)
- [Qwen vision inputs](https://www.alibabacloud.com/help/en/model-studio/vision-model/)

Keep browser and action pins current through separately reviewed dependency updates.
