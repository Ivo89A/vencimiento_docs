---
name: agent-navigable-code
description: >-
  Writes and refactors code so humans and coding agents can navigate it with
  minimal context — explicit boundaries, grep-friendly names, colocated contracts,
  and predictable layout. Use when implementing features, refactoring, designing
  modules, or when the user mentions AI-readable code, agent-friendly structure,
  or maintainability for LLM tooling.
user-invocable: false
---

# Agent-navigable code (human-first)

Optimize for **discoverability and local reasoning**, not for replacing human
readability. Agents search, slice diffs, and follow imports; humans review PRs
and debug production. Good agent-navigable code is usually **better for both**.

Read [reference.md](./reference.md) for the checklist and anti-patterns.

## Principles

1. **Explicit over clever** — Prefer clear control flow and named steps over
   dense one-liners, implicit coercion, or framework magic without types.
2. **Local over global** — A reader (human or agent) should understand a file
   from that file plus its direct imports; push cross-cutting rules into
   `src/lib/*-lifecycle.ts`, Zod schemas, or `docs/` — not tribal knowledge.
3. **Stable map** — Same kind of thing lives in the same place every time (CIMA
   route colocation: `_actions`, `_schemas`, `_components`).
4. **Contracts at the edge** — Validate and type at boundaries (HTTP, Server
   Actions, jobs, webhooks). Inside domain code, use narrow types and
   discriminated unions instead of `unknown` or wide `Record`.
5. **Grep is an API** — Use consistent vocabulary from `docs/HANDOFF.md` and
   domain terms already in the repo; avoid new abbreviations unless the codebase
   already uses them.

## Do

### Layout and size

- Keep files **focused** (rough guide: &lt; ~400 lines). Split by responsibility,
  not by arbitrary “one function per file.”
- Colocate what changes together: schema + action + UI field types for one
  feature under the same route folder.
- Put **orchestration** in lifecycle modules; keep Server Actions thin (auth,
  parse, call lifecycle, revalidate, map errors to Spanish UI strings).

### Names and types

- Functions: verb + object (`requireAgencyPermission`, `recordInboxEvent`).
- Booleans: `is*`, `has*`, `can*`; collections: plural nouns.
- Export types that cross boundaries; use `as const` + unions for finite sets
  (status, error codes). Map domain codes to user messages in one place
  (`LIFECYCLE_ERROR_MESSAGES` pattern).

### Agent landmarks (sparse)

Use **short** module headers only when the file encodes non-obvious invariants:

```ts
/** Tenant: session.activeSubaccountId only — never trust route/body IDs alone. */
```

Do not narrate obvious code. Do not duplicate `AGENTS.md` in every file.

### Package boundaries

For a new service or top-level area (e.g. under `services/`), add a small
`README.md` or local `AGENTS.md` with: entrypoints, env vars, and “start reading
here” paths. Link to `docs/HANDOFF.md` for product truth.

### Verification hooks

After structural changes, run what the repo already expects: `npm run lint`,
`npx tsc --noEmit`, and focused self-checks when touching auth/jobs/audit.

## Do not (AI-slop)

- Giant comment blocks that restate the code.
- Hungarian or encoded names (`procCtx2`, `handleThing`) to “help the model.”
- Splitting every helper into micro-files with no semantic boundary.
- Duplicating business rules in actions, lifecycle, and UI “for clarity.”
- Writing **only** for the model: obfuscated terse code, excessive metaprogramming,
  or patterns humans cannot review safely.

## CIMA-specific anchors

When touching this repo, agents should read **`docs/HANDOFF.md`** before assuming
behavior. Align structure with **`AGENTS.md`** at the root:

- Permissions via `requireAgencyPermission` / `requireSubaccountPermission`.
- Mutations through lifecycle modules with audit in the same transaction.
- Jobs: inbox/outbox + idempotency keys; no raw provider payloads in logs.

## When editing vs greenfield

| Situation | Approach |
|-----------|----------|
| New feature in `src/app` | Match neighboring routes; colocate `_schemas` / `_actions`. |
| New cross-route logic | `src/lib/<domain>-lifecycle.ts` + tests/self-check if critical. |
| New service folder | Clear HTTP/job entrypoints + env in `src/lib/env.ts` / `.env.example`. |
| Refactor for agents | Rename for grep, extract lifecycle, add types — avoid drive-by rewrites. |

## Related skills

- `next-best-practices`, `vercel-react-best-practices` — React/Next performance
  and boundaries (complementary, not redundant).
- Project rules: `AGENTS.md`, `docs/HANDOFF.md`.
