# Prompt library

Use these as composable prompt contracts. Replace brackets and omit irrelevant clauses.

## Discovery

> Inspect [scope] before proposing changes. Return: current behavior with file/source evidence; stakeholders and journeys; constraints; unknowns; contradictions; and the smallest questions whose answers would change architecture, scope, or acceptance. Separate facts, inferences, and recommendations.

## Capability routing

> Inventory only the capabilities relevant to [plan]. Choose one orchestrator and the smallest compatible set of disciplines or integrations. For each, state invocation mode, inputs, output owner, side effects, dependencies, and fallback. Flag duplicate names, overlapping triggers, competing sources of truth, incompatible mutation policies, network requirements, and recursive orchestration. Do not install, rewrite, or invoke user-only skills.

## Requirements interview

> Interview me to turn [goal] into testable requirements. Ask one prioritized batch at a time. For each question, state which decision it unlocks. Cover users, jobs, failure modes, quality attributes, constraints, non-goals, data, rollout, and definition of done. Do not ask preferences that can be resolved from existing evidence.

## Option generation

> Produce 2–4 materially distinct approaches for [decision]. Compare them on [criteria]. Include a baseline/do-nothing option, assumptions, reversible versus irreversible parts, failure modes, migration cost, and evidence needed. Recommend one and label the recommendation as analysis.

## Architecture review

> Review this design from product, system, data, security, reliability, operability, accessibility, and migration perspectives. Identify hidden coupling, missing contracts, unsafe assumptions, and decisions that lack criteria. Map every finding to a concrete repair or explicit acceptance.

## Work slicing

> Convert the approved design into tracer-bullet, vertical, independently verifiable increments. Each work item must have a stable ID, outcome, blocking edges, requirements covered, exact validation, rollback boundary, and completion evidence. Size each item to fit a fresh agent context. Show the dependency frontier and safe parallel work. Use expand–migrate–contract for wide changes that cannot land green vertically.

## Test-seam selection

> Identify the highest practical seams through which [requirements] can be verified without coupling tests to implementation details. Prefer existing seams; propose a new seam only when behavior genuinely varies there. For each `SEAM-nnn`, state its interface, behavior covered, adapters, precedent, associated requirements, and why a higher seam is unsuitable. Map each seam to `CHK-nnn` checks.

## Adversarial pre-mortem

> Assume this plan failed six months after launch. Generate plausible causal chains, not generic risks. For each, give leading indicator, likelihood, impact, prevention, containment, contingency, and owner. Highlight correlated risks and single points of failure.

## Plan critique

> Score this plan with the bundled quality model. Quote or point to evidence for every score. Find contradictions, orphan requirements, unverified tasks, stale decisions, and HTML/source drift. Return blocking issues first, then a minimal repair sequence.

## Execution handoff

> Execute only [milestone/work items]. Read the canonical plan and repository instructions first. Keep changes within scope, run each listed check, update progress/discoveries/decisions, and stop for re-planning if a guardrail fails or a foundational assumption changes. Do not claim completion with failing checks.

## Status resumption

> Resume from the plan as if no prior conversation exists. Reconstruct goal, current status, completed evidence, active decisions, blockers, and next safe work item. Verify repository state before trusting the progress log. Report any disagreement between state and plan.

## HTML projection

> Generate a single-file offline HTML review cockpit from the canonical plan. Preserve stable IDs. Put outcome, status, high risks, open decisions, and critical path above the fold. Add search/filter, deep links, print styles, accessible accordions only for secondary detail, and local state export/import. Do not introduce facts absent from the source; flag projection gaps.
