# HTML review patterns

## Information architecture

Use a persistent overview plus task-focused views: executive, requirements, architecture, decisions, risks, execution, verification, sources. Maintain one semantic DOM; filters may hide rows visually but printing and export must expose the complete source.

## Components

- Status ribbon: outcome, owner, freshness, confidence, phase, gate status.
- Traceability matrix: requirement → decision → work item → check.
- Decision cards: compact state plus expandable evidence and consequences.
- Risk register: sortable likelihood × impact with trigger and owner.
- Architecture views: current/target and a readable text alternative.
- Dependency board: critical path first; avoid decorative force graphs.
- Timeline/progress: milestone evidence, not invented percentages.
- Source drawer: descriptive links, access date, source class.
- Export/import: JSON for review state; print/PDF styles for archival.

## Interaction rules

- Use native controls and URLs/deep links.
- Make search incremental and preserve a visible result count.
- Keep critical content expanded; use accordions only for secondary detail.
- Provide “reset filters” and undo where user state changes.
- Store only review state locally; canonical project truth remains in files.
- Respect `prefers-reduced-motion`, keyboard order, focus visibility, and WCAG contrast.
- Never require hover, color, or pointer precision to understand status.

## Single-file constraints

Inline CSS, JavaScript, icons, and data. Use no network calls, external fonts, frameworks, telemetry, or remote images. Escape generated content. Avoid `innerHTML` for untrusted values. Keep interactive state serializable and the no-JavaScript reading order complete.

Embed plan data as JSON in a non-executable `application/json` script element and render untrusted text with `textContent`. Treat local checkboxes, filters, and comments as review state only. Export review state separately; never write it back into canonical project facts without an explicit reconciliation step.

## Artifact lifecycle

- Planning cockpit: durable but regenerable projection of the canonical plan.
- Architecture survey: temporary comparison artifact; retain only its accepted conclusions.
- Logic or UI prototype: disposable decision evidence; link the verdict, not the prototype's implementation, into the plan.
- Tracker dashboard: live execution view whose status comes from the tracker rather than copied Markdown.
