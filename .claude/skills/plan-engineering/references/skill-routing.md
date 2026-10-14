# Skill routing and interoperability

Use this reference when a plan may delegate work to installed skills, plugins, agents, commands, or external skill packs.

## Capability inventory

Treat the active catalog supplied by the harness as authoritative for the current run. Inspect filesystem roots only when the catalog is incomplete, the user asks what is installed on a machine, or compatibility must be verified. Read metadata first; load a skill body only when selected or explicitly named.

For every relevant capability, capture:

| Field | Meaning |
|---|---|
| Name | Stable user-facing capability name |
| Role | Orchestrator, discipline, integration, reference, validator, or artifact generator |
| Trigger | Requests for which it should be selected |
| Invocation | User-only, model-available, or explicit-only in this harness |
| Inputs/outputs | Artifacts or state it consumes and produces |
| Side effects | Files, tracker updates, commits, messages, deployments, or other mutations |
| Canonical store | Where its durable truth lives |
| Dependencies | Required tools, network access, runtimes, or other skills |
| Provenance | Origin, optional version, content digest, and last reviewed state |
| Trust | First-party, reviewed third-party, or unknown; never infer trust from popularity |
| Fallback | Safe behavior when unavailable |

Run `scripts/inventory_skills.py ROOT... --format markdown` for a deterministic filesystem inventory. Pass narrow, known skill roots; do not scan an entire home directory.

## Selection rules

Use the smallest set that fully covers the request:

1. Apply user-named skills.
2. Obey safety, authorization, and repository-specific instructions.
3. Choose exactly one run-owning orchestrator.
4. Prefer the narrowest validated discipline for each remaining capability.
5. Prefer existing project conventions and adapters over generic replacements.
6. Verify that a previously approved third-party capability still has the reviewed content digest.
7. Keep a safe fallback for unavailable optional capabilities.

An orchestrator may delegate to model-available disciplines. If a capability is user-only, surface the proposed command or handoff for the human rather than claiming it ran.

## Conflict classes

Resolve these before implementation:

- **Identity:** duplicate names refer to different procedures.
- **Trigger:** two skills both claim the same request.
- **Ownership:** two orchestrators try to control the same run.
- **Truth:** two artifacts claim canonical ownership of one mutable field.
- **Mutation:** one skill writes or publishes where another promises read-only planning.
- **Format:** offline/self-contained output conflicts with CDN or hosted dependencies.
- **Invocation:** a skill tries to invoke a user-only skill or creates a recursive routing loop.
- **Vocabulary:** the same term has incompatible domain meanings.
- **Drift:** a capability's content digest differs from the reviewed or pinned copy.

Resolve in this order: explicit user choice, safety policy, repository instruction, narrower scope, stronger verification, lower irreversible side effects. Record unresolved conflicts as `QST-nnn` or `RSK-nnn` and block the affected work.

## Source-of-truth contract

- Canonical Markdown owns outcome, requirements, assumptions, the decision index, risks, and verification intent.
- A configured issue tracker owns current ticket status, assignment, and native dependency state.
- `CONTEXT.md` or the repository glossary owns concise domain vocabulary when the project uses one.
- ADRs own durable architectural-decision detail when the repository uses ADRs; the plan's decision index links rather than restates it.
- HTML owns no project truth. It is a rebuildable review projection and may store only local review state.

If a project deliberately chooses a different owner, record one explicit `DEC-nnn` and update every adapter. Never use bidirectional editing without deterministic reconciliation.

## Compatibility with Matt Pocock's skill pack

Keep the pack separate and route to it; do not copy its procedures into Plan Engineering.

| Planning need | Compatible capability |
|---|---|
| Clarification and domain language | `grilling`, `grill-with-docs`, `domain-modeling` |
| Evidence gathering | `research` |
| Architecture and testable seams | `codebase-design`, `improve-codebase-architecture` |
| Cheap decision evidence | `prototype` |
| Conversation-to-spec handoff | `to-spec` |
| Vertical tickets and blockers | `to-tickets` |
| Long-horizon decision mapping | `wayfinder` |
| Execution feedback | `implement`, `tdd`, `diagnosing-bugs` |
| Independent conformance review | `code-review` |
| Session transfer | `handoff` |

Preserve these boundaries:

- Plan Engineering owns the overall planning contract, capability manifest, stable trace IDs, risk/operations coverage, and offline review projection.
- Matt's pack supplies composable engineering operators and may use its configured tracker.
- Respect each installed skill's actual invocation metadata; the table is a compatibility map, not permission to invoke it.
- Convert CDN-based temporary reports into offline artifacts only when the plan's archival contract requires it.
- Require explicit authorization before publishing issues, committing, pushing, or making other external changes.

## Routing manifest

For substantial agentic work, include a compact manifest. Record the selected version or digest separately when reproducibility or third-party trust matters:

```markdown
| Stage | Capability | Invocation | Output owner | Side effects | Fallback |
|---|---|---|---|---|---|
| Discover | research | model | PLAN.md evidence | network reads | repository inspection |
| Decide | prototype | model | throwaway evidence | local prototype | comparison table |
| Slice | to-tickets | user | issue tracker | creates issues | WI entries in PLAN.md |
```

Update the manifest when availability or authority changes. Do not turn it into a duplicate inventory of every skill on the machine.
