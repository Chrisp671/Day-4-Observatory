# Plan quality model

Score each dimension from 0 to 4. Report evidence, not only a number.

| Dimension | 0 | 2 | 4 |
|---|---|---|---|
| Outcome clarity | No outcome | Outcome but vague value | Measurable outcome, users, value, done |
| Evidence | Guesses | Some inspected context | Sources, repository evidence, unknowns labeled |
| Scope | Unbounded | Scope listed | Scope, non-goals, appetite, constraints |
| Requirements | Wishes | Structured requirements | Stable IDs, quality attributes, acceptance links |
| Architecture | Absent | Target sketch | Current/target, contracts, invariants, boundaries |
| Decisions | Implicit | Options named | Criteria, rationale, consequences, supersession |
| Risk | Generic list | Likelihood/impact | Triggers, mitigations, contingency, owners |
| Executability | Broad phases | Ordered tasks | Small slices, prerequisites, files, checks, rollback |
| Verification | “Test it” | Test categories | Requirement-to-check traceability and commands |
| Operations | Ignored | Rollout notes | Observability, SLOs, rollout, rollback, ownership |
| Capability routing | Accidental tools | Skills named | One orchestrator, compatible operators, side effects and fallbacks |
| Source integrity | Competing truth | Owners implied | Canonical owners explicit; tracker and HTML are synchronized projections |
| Human review | Wall of text | Some summary | Progressive disclosure, comparisons, critical signals |
| Liveness | Static | Progress list | decisions/discoveries/deviations/history updated |

Interpret totals out of 56:

- 50–56: execution-ready, subject to normal review.
- 40–49: strong but repair named gaps before high-risk work.
- 28–39: useful exploration, not yet an execution contract.
- 0–27: premature; return to framing and discovery.

## Release gates

Regardless of score, block execution when any apply:

- No accountable owner or decision authority.
- No acceptance evidence for a critical requirement.
- Unbounded access to sensitive data or production systems.
- Irreversible migration without rollback or contingency.
- High-impact assumption is neither validated nor explicitly accepted.
- Two orchestrators own the same run, or an invoked capability lacks required authority.
- Two mutable artifacts claim canonical ownership of the same fact.
- Canonical plan and HTML projection disagree.
