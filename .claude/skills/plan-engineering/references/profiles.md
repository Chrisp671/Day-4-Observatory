# Domain profiles

Read only the relevant profile. Apply the core workflow first, then add these checks.

## Websites

Map information architecture, routes, content ownership, responsive breakpoints, SEO metadata, accessibility, performance budgets, analytics, design tokens, browser support, and deploy/preview behavior. Verify representative pages and empty/error/loading states.

## SaaS

Add tenancy model, roles and permissions, billing/entitlements, lifecycle emails, audit history, data retention, support operations, onboarding, abuse controls, and SLOs. Trace each persona through acquisition, activation, core value, administration, and cancellation.

## APIs

Specify resources, schemas, versioning, authentication, authorization, pagination, idempotency, rate limits, errors, retries, webhooks, compatibility, observability, examples, and contract tests. Make breaking-change policy explicit.

## Rust

Record crate boundaries, ownership/lifetimes where architecturally important, error taxonomy, unsafe-code policy, feature flags, MSRV, async runtime, serialization, benchmarks, fuzzing, clippy/rustfmt, and cross-platform targets. Prefer invariants and executable tests over implementation prose.

## TypeScript

Record runtime targets, module system, strictness, package boundaries, public types, validation at trust boundaries, state ownership, build tooling, browser/node compatibility, lint/type/test commands, and bundle or latency budgets.

## AI agents

Specify task boundary, model/tool policy, context sources, memory, permissions, approval gates, prompt/version ownership, structured outputs, eval dataset, adversarial cases, latency/cost budgets, observability, fallback, and human handoff. Separate deterministic workflow from model inference. Never use unverifiable hidden reasoning as an acceptance artifact.

## Automations

Specify trigger, cadence/time zone, deduplication, idempotency, credentials, rate limits, retries/backoff, poison-event handling, escalation, audit log, pause/resume, replay, dry run, and ownership. Define what happens when upstream state is missing or late.

## Mobile apps

Add platform/version matrix, navigation, deep links, offline/sync, background behavior, permissions, push, accessibility, localization, battery/network constraints, store review, telemetry, crash recovery, and staged release.

## Dashboards

Define decision questions before charts. Specify metric semantics, grain, freshness, lineage, filters, comparison baseline, uncertainty, empty/loading/error states, accessibility, export, performance, and row-level security.

## Infrastructure

Specify environments, IaC state and ownership, network/trust boundaries, IAM, secrets, capacity, availability zones/regions, SLOs, monitoring, backup/restore, disaster recovery, cost guardrails, drift detection, change windows, rollout, and rollback.

## System migrations

Model source/target schemas, inventory, compatibility window, dual-write/read strategy, backfill, reconciliation, cutover criteria, freeze window, rollback point, data-loss budget, performance impact, stakeholder communications, and legacy decommission. Define evidence for parity and a no-return decision.
