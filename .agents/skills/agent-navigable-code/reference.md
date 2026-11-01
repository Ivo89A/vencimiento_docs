# Agent-navigable code — checklist

Use when authoring a feature, reviewing a PR, or refactoring for maintainability.

## Pre-flight (agents)

- [ ] Read `docs/HANDOFF.md` if the change touches product, auth, tenancy, or jobs.
- [ ] Locate an **existing similar route or lifecycle** and mirror its layout.
- [ ] List entrypoints you will touch (page, action, API route, worker handler).

## Structure

- [ ] One clear **owner** per mutation (lifecycle module).
- [ ] Zod (or equivalent) schema colocated with the action/route that parses input.
- [ ] UI strings/errors mapped from domain codes; no raw `throw err` to the client.
- [ ] `'use client'` only on interactive leaves.
- [ ] No business rules duplicated across action + lifecycle + component.

## Discoverability

- [ ] Names match domain language already in repo (grep before inventing synonyms).
- [ ] Public exports are minimal; internals stay unexported or `_`-prefixed by convention.
- [ ] Cross-module imports use `@/` stable paths, not deep relative `../../../`.
- [ ] New env vars: `src/lib/env.ts`, `.env.example`, compose if needed.

## Types and control flow

- [ ] Discriminated unions for state machines and result types where branches differ.
- [ ] Early returns for guards; avoid deep nesting (&gt; 3 levels without extraction).
- [ ] Side effects at the edges; pure helpers in the middle when it aids testing.

## Security and tenancy (CIMA)

- [ ] AuthZ before mutation; session tenant fields — not user-supplied IDs.
- [ ] Audit metadata whitelisted; no secrets, tokens, or message bodies in logs.

## Comments and docs

- [ ] Comments explain **why** or **invariants**, not **what** the code does.
- [ ] User-facing docs only in `docs/` when the team needs them — not in skill files.

## Anti-patterns (reject in review)

| Pattern | Why it fails |
|---------|----------------|
| “AI summary” comment per function | Noise; drifts from code |
| Mega-utils catch-all | Agents cannot tell what is safe to call |
| Dynamic `import(variable)` paths | Breaks static analysis and tracing |
| Barrel re-exports for app code | Slower builds, unclear ownership |
| Feature flags in comments only | Agents and humans miss behavior |

## Measuring success

Good outcomes:

- A new agent session finds the lifecycle file in **one or two greps**.
- A human reviewer understands the PR without oral handoff.
- `tsc` and lint stay green without suppressions.

Bad outcomes:

- More lines but same ambiguity.
- Humans stop reviewing because structure is hostile.
- Tests only assert mocks, not lifecycle behavior.
