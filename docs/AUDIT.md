# FocusFlow App Audit

Audit date: 2026-05-12.

## Executive summary

The application has a coherent product concept and a strong initial visual direction: a split chat/blueprint workspace, polished dark UI, model-routing labels, Obsidian export, completion toggles, and annotation affordances. The main issues found were typical of fast AI/vibe-coded implementations: type drift against an SDK, raw structured data leaking into the streaming UX, overly loose frontend types, and documentation that did not yet provide enough context for future LLM maintainers.

## Fixed in this pass

| Area | Finding | Resolution |
| --- | --- | --- |
| Type safety | The API server placed `systemInstruction` at the top level of `generateContentStream`, which does not match the installed `@google/genai` TypeScript definitions. | Moved `systemInstruction` into `config`. |
| Streaming UX | The server streamed chunks of structured JSON as chat content. This can visually expose raw JSON instead of a natural assistant message. | The server now accumulates the structured response and emits clean `assistant_content`/`project_state` in the final SSE event. |
| Frontend resilience | The SSE reader assumed `res.body` always exists. | Added an explicit response-body guard. |
| Frontend typing | `home.tsx` used several `any` casts for messages, project cache data, final project state, and session filtering. | Replaced with generated API types (`ProjectMessage`, `ProjectState`, `ProjectWithMessages`) where practical. |
| LLM maintainability | Documentation was brief and optimized for humans already familiar with the app. | Added a root README and LLM-oriented context document. |

## Remaining recommendations

### High priority

1. **Add automated route tests for `/api/projects/:id/messages`.** Mock the Gemini client and assert validation, SSE `done` payload shape, DB updates, and JSON-parse fallback behavior.
2. **Add a true migration workflow.** `drizzle-kit push` is useful for development, but production-like environments need versioned migrations and rollback guidance.
3. **Add authentication/authorization before multi-user use.** Project CRUD currently appears unauthenticated; that is acceptable for a local prototype but not for shared deployment.
4. **Improve generated state validation telemetry.** If the model returns invalid `project_state`, the server silently keeps prior state. Log structured validation details without leaking sensitive user content.

### Medium priority

1. **Revisit real token streaming.** The current safer behavior avoids JSON leakage but only shows final user-facing text. If live text is important, use a model response format that separates streaming prose from final structured state.
2. **Introduce linting.** TypeScript catches many issues, but ESLint rules would catch unhandled promises, hook dependency hazards, and unused UI code earlier.
3. **Normalize model labels.** Session cards infer model styles from free-form `recommended_agent` strings. A constrained enum would make visuals more reliable.
4. **Reduce optimistic-message duplication risk.** The UI appends local user/assistant messages then invalidates the query. It works, but dedicated optimistic IDs or reconciliation helpers would make behavior more deterministic.

### Visual polish notes

- The split-pane layout, motion transitions, and model-color accents are strong.
- The board-first mobile transition during generation is a distinctive product touch, but consider offering a clearer persistent path back to chat after generation finishes.
- Long `tech_stack_rules` values truncate in session cards. Consider a tooltip or expandable section for dense stack rules.
- Annotation affordances are promising; consider making them discoverable without relying on hover for touch devices.

### Code health notes

- `home.tsx` remains the largest orchestration surface. If it grows, extract an SSE/project-message hook such as `useProjectMessageStream`.
- Keep `ProjectState` changes contract-first. OpenAPI, DB schema, server parser, and frontend components all depend on that shape.
- Avoid duplicating the `mockup-sandbox` component tree into production app changes unless the sandbox is intentionally part of the deliverable.

## Verification performed

- `pnpm run typecheck` passes after the fixes.
- `pnpm run build` should be run after any further app changes because Vite requires runtime-like `PORT` and `BASE_PATH` values for frontend build validation.
