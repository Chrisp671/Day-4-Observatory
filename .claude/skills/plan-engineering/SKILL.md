---
name: plan-engineering
description: Create, critique, route, and maintain implementation-ready software plans plus self-contained interactive HTML review artifacts. Use for new products, substantial features, migrations, APIs, infrastructure, AI agents, automations, mobile apps, dashboards, Rust or TypeScript work; for PRDs, RFCs, design docs, architecture plans, planning-first development, visual specifications, or coordinating available engineering skills; and whenever ambiguity, risk, dependencies, or multi-step execution make coding immediately unsafe.
---

# Plan Engineering

Turn intent into a traceable, testable, restartable execution contract. Coordinate the best available specialist skills without duplicating them. Keep canonical intent in plain text; generate HTML as a human review projection.

## Core contract

For a substantial plan, maintain:

1. Canonical Markdown for intent, requirements, decisions, risks, and verification.
2. The configured tracker for live execution state when one exists.
3. A generated self-contained HTML cockpit when visual review materially improves comprehension.

Never maintain the same mutable fact independently in two places. Markdown owns intent; the tracker owns ticket status; HTML is a regenerable projection. Give requirements, assumptions, questions, decisions, seams, risks, work items, and checks stable IDs when present. Preserve those IDs across representations.

## Resolve capabilities first

Before applying the workflow to substantial work, inspect the active skill catalog and repository instructions. Use [references/skill-routing.md](references/skill-routing.md) when multiple skills, external skill packs, or machine-level discovery are relevant.

1. Honor every user-named skill and read its complete instructions before acting.
2. Select the smallest compatible set: one orchestrator plus narrow disciplines or integrations.
3. Prefer an installed specialist over recreating its procedure inside this skill.
4. Respect invocation boundaries. Recommend a user-only skill by name; do not pretend to invoke it autonomously.
5. Record capability, owner, side effects, invocation mode, and fallback in the plan when routing affects execution.
6. Resolve conflicts before execution: duplicate names, overlapping triggers, competing canonical stores, incompatible mutation policies, network requirements, or recursive orchestration.

Plan Engineering inventories, compares, and routes skills. It does not install, update, disable, or delete them; delegate those lifecycle operations to the platform's skill manager.

## Route the request

- For a small reversible change, use the compact path: goal, constraints, affected areas, acceptance checks, steps.
- For a substantial or cross-cutting change, use the full workflow below.
- For a domain-specific plan, read the matching section in [references/profiles.md](references/profiles.md).
- For installed skills, external skill packs, or agent orchestration, read [references/skill-routing.md](references/skill-routing.md). Run `scripts/inventory_skills.py` only when the active catalog is incomplete or a filesystem inventory is explicitly useful.
- For prompt or interview design, read [references/prompt-library.md](references/prompt-library.md).
- For scoring or a plan audit, read [references/quality-model.md](references/quality-model.md).
- For HTML composition and accessibility, use [assets/plan-cockpit.html](assets/plan-cockpit.html) and read [references/html-patterns.md](references/html-patterns.md).

## Full workflow

### 1. Frame

State the outcome, users, business or mission value, appetite, non-goals, constraints, owners, deadline, and definition of done. Separate observed facts, user choices, and hypotheses. Cite external facts.

### 2. Discover

Inspect the relevant repository, documentation, tests, telemetry, and prior decisions. Build a context map before proposing changes. Ask only questions whose answers materially alter scope, architecture, risk, or acceptance.

### 3. Model

Create:

- stakeholder and user journeys;
- functional and quality requirements with stable IDs;
- assumptions and unresolved questions with owners and validation paths;
- current-state and target-state architecture;
- interfaces, test seams, data contracts, trust boundaries, dependencies, and invariants;
- option comparison with explicit decision criteria.

Use diagrams only where relationships are harder to understand in prose or a table.

### 4. Decide

Record each consequential choice as `DEC-nnn`: context, options, criteria, decision, rationale, consequences, owner, date, and supersession link. Do not expose hidden chain-of-thought. Record concise, reviewable rationale and evidence.

### 5. De-risk

Maintain `RSK-nnn` entries with likelihood, impact, detectability, mitigation, trigger, contingency, and owner. Add threat modeling, privacy, compliance, operability, migration, rollback, and cost checks when relevant. Convert uncertain architecture into time-boxed spikes with explicit learning criteria.

### 6. Slice

Build tracer-bullet, vertical, demonstrable increments. Give each work item `WI-nnn`, prerequisites or blocking edges, expected behavior, verification command or observation, rollback boundary, and requirements covered. Size each item to fit a fresh agent context where practical. Prefer 15–60 minute agent steps inside coherent milestones. For wide migrations that cannot land green vertically, use expand–migrate–contract batches.

### 7. Verify

Map every requirement to one or more `CHK-nnn` tests or observable checks. Record `SEAM-nnn` for pre-agreed test seams that materially shape the design. Include unit, integration, contract, end-to-end, security, accessibility, performance, migration, and operational verification as appropriate. A plan is incomplete if success cannot be independently checked.

### 8. Review

Generate the HTML cockpit from the same IDs and content. Make assumptions, unresolved questions, high risks, irreversible decisions, and critical-path items visible on first view. Provide filters and progress controls without hiding information from keyboard or assistive-technology users.

### 9. Execute and update

Treat the plan as living state. Work the dependency frontier: items whose blockers are complete. Update progress, discoveries, decisions, and outcomes during implementation. Preserve history: supersede decisions rather than rewriting them, and record deviations from the plan. Keep unclear future work in a visible `Not yet specified` section instead of inventing premature tickets. Stop and re-plan when a guardrail fails or a foundational assumption changes.

## Required canonical structure

Use these sections unless the task genuinely does not need one:

1. Outcome and status
2. Evidence and context
3. Users and journeys
4. Scope and non-goals
5. Requirements, assumptions, questions, and quality attributes
6. Current state
7. Options and decisions
8. Target architecture, contracts, and test seams
9. Risks and mitigations
10. Capability routing, work breakdown, and dependency frontier
11. Verification and acceptance matrix
12. Rollout, observability, rollback, and operations
13. Open questions
14. Progress, discoveries, and change log

## Guardrails

- Do not code while material product or architecture questions remain silently unresolved.
- Do not invent repository facts; inspect or label them unknown.
- Do not use popularity as evidence of quality.
- Do not turn all prose into cards; preserve reading flow.
- Do not duplicate an installed specialist skill's instructions in this skill or the plan.
- Do not treat a changed third-party skill as previously reviewed; compare its version or content digest when trust matters.
- Do not let two orchestrators own the same run; choose one and make the other an explicit handoff.
- Do not publish tickets, mutate external systems, commit, or push merely because a compatible skill can do so; require authorization appropriate to the action.
- Do not hide critical content behind closed accordions by default.
- Do not use color as the only status signal.
- Do not claim completion from generated output alone; run the listed checks.
- Do not allow an agent to approve its own high-risk work without an independent check.
- Do not retain stale screenshots, diagrams, or HTML after canonical data changes.

## Output modes

- **Plan:** canonical Markdown plus optional HTML cockpit.
- **Interview:** a prioritized question set with why each answer matters.
- **Critique:** scored gaps, contradictions, risks, and repair actions.
- **Convert:** transform an existing PRD/RFC/design doc into the canonical structure without dropping source intent.
- **Status:** update progress, decisions, discoveries, and next actions while preserving history.
- **Route:** inventory relevant capabilities, identify overlap or conflict, and produce an execution routing manifest without changing installed skills.

Run `scripts/validate_plan.py PLAN.md` before delivery when a canonical plan file exists. For HTML, run `scripts/validate_projection.py PLAN.md PLAN.html`; then verify keyboard navigation, responsive layout, printing, and representative interactions in a browser.
