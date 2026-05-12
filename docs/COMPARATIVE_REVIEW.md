# FocusFlow Comparative Review and Next Steps

Review date: 2026-05-12.

Use this document when comparing FocusFlow against another app with a similar review document. It is intentionally written as an evaluation artifact: another agent should be able to score product maturity, architecture, UX quality, implementation risk, and roadmap priority without needing to rediscover the repo from scratch.

## One-page verdict

FocusFlow is a strong early-stage AI planning workspace. Its best differentiator is the pairing of a chat-based Socratic planning flow with a structured execution board that routes each session to a recommended AI model. The visual direction is more polished than a typical prototype, and the data contract is clear enough to extend. The biggest gap is production readiness: authentication, tests, migration discipline, observability, and deterministic model-output validation are not yet at the level expected for a shared or commercial deployment.

**Overall maturity:** promising prototype / pre-production beta.

**Best fit today:** a single-user or trusted-team planning tool for turning fuzzy ideas into scoped execution sessions.

**Not yet a fit for:** untrusted multi-user deployments, compliance-heavy workspaces, or production workflows that require audited state transitions and guaranteed model-output consistency.

## Product comparison snapshot

| Dimension             | Current FocusFlow assessment                                                                                                            | Compare against another app by asking                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Core workflow clarity | Strong. Chat creates a blueprint, sessions, win conditions, deliverables, and model-routing recommendations.                            | Does the other app produce a concrete artifact, or only a conversation?                                     |
| Differentiation       | Strong. Tri-model routing and Obsidian export give it a distinct point of view.                                                         | Does the other app have a unique planning philosophy or just generic AI chat?                               |
| UX polish             | Above average for prototype stage. Dark UI, motion, split-pane layout, session cards, and mobile board transition feel intentional.     | Are visual states, loading states, empty states, and mobile affordances similarly complete?                 |
| Data contract         | Good. `ProjectState` and `ProjectSession` are explicit and shared through OpenAPI/generated types.                                      | Is the other app's AI output structured, validated, persisted, and typed?                                   |
| Reliability           | Medium. Typecheck/build pass, but there are no route or UI tests covering critical flows.                                               | Does the other app have automated coverage for AI failures, stream parsing, persistence, and optimistic UI? |
| Production readiness  | Low to medium. Missing auth, migrations, test suite, and observability.                                                                 | Can the other app safely support multiple users and recover from bad model output?                          |
| Extensibility         | Medium-high. Workspace separation and generated clients are a good foundation, but `home.tsx` is still a central orchestration hotspot. | Are feature boundaries clearer or more modular in the other app?                                            |

## Scoring rubric

Score each category from 1 to 5. A future agent can use the same rubric for another app and compare totals.

| Category               | Score | Why                                                                                                                                                  |
| ---------------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product concept        |     4 | Clear audience and differentiated AI-routing premise. Needs validation from real users.                                                              |
| Workflow completeness  |     4 | Covers project creation, chat, blueprint generation, session completion, annotation, and export. Lacks collaboration/history depth.                  |
| Visual design          |     4 | Strong prototype polish with cohesive components. Needs touch-first annotation improvements and long-content handling.                               |
| Frontend code health   |     3 | Typed generated API usage and component split are good. `home.tsx` should eventually be decomposed.                                                  |
| Backend code health    |     3 | Straightforward Express route structure and validation. Needs tests, more granular error handling, and model-output telemetry.                       |
| Data/API design        |     4 | Contract-first approach is sensible. Needs migrations and tighter enums for model routing.                                                           |
| AI integration quality |     3 | Structured JSON schema is a good start. Needs deterministic fallbacks, schema-error logging, and possibly separate streaming prose from final state. |
| Security/readiness     |     2 | Environment variables are documented, but auth/authorization and multi-user boundaries are not implemented.                                          |
| Observability          |     2 | Basic request logging exists. Needs app-level metrics, AI failure reasons, validation counters, and user-safe debug traces.                          |
| Test coverage          |     1 | Typecheck/build pass, but no meaningful automated route/UI coverage was found.                                                                       |

**Weighted overall:** 3.0 / 5.0. This is good for a fast prototype, but the next phase should prioritize reliability and product proof over more surface-area features.

## Strengths to preserve

1. **Concrete artifact generation.** The right-side blueprint board makes AI output operational rather than ephemeral.
2. **Session-level model routing.** The `recommended_agent` and `tech_stack_rules` fields are the product's strongest strategic wedge.
3. **Contract-first foundation.** OpenAPI, generated React Query hooks, generated Zod validators, and Drizzle schemas give future agents a clear integration path.
4. **Polished initial UX.** The split-pane composition, loading states, motion, session cards, and Obsidian export create a more complete feel than a plain chatbot.
5. **LLM maintainability direction.** The repository now has LLM handoff docs and explicit generated-code guidance.

## Weaknesses and risks

1. **Critical-flow tests are missing.** The AI message route is the most important path and should have mocked integration tests.
2. **Authentication is absent.** Any shared deployment needs user identity, project ownership, and authorization checks.
3. **AI output can still be semantically wrong.** Schema validation checks shape, not quality. A valid but low-quality plan can still be persisted.
4. **Free-form model labels reduce consistency.** Routing visuals and analytics would be more reliable with model/provider enums plus a display label.
5. **Centralized frontend orchestration will get harder to modify.** `home.tsx` owns loading, streaming, messages, board state, project selection, and mobile behavior.
6. **Streaming tradeoff is unresolved.** Avoiding raw JSON leakage is correct, but the UI no longer gets true token-by-token assistant prose unless the response protocol is redesigned.
7. **No production migration story.** `drizzle-kit push` is not enough for predictable production changes.

## Suggested next steps

### Phase 1: Stabilize the core loop

These are the highest-leverage improvements before adding new features.

1. **Add route tests for the AI message endpoint.** Mock Gemini and Postgres access. Cover success, invalid request body, missing project, malformed JSON response, invalid `project_state`, and provider errors.
2. **Extract a frontend streaming hook.** Move the raw SSE parsing and optimistic message reconciliation from `home.tsx` into `useProjectMessageStream`.
3. **Add model-routing enums.** Keep human-readable labels, but store a stable provider/model key such as `gemini`, `openai`, or `zai`.
4. **Log validation outcomes.** When `projectStateSchema.safeParse` fails, log field-level errors in a way that does not leak private prompt content.
5. **Add linting.** Use ESLint or an equivalent TypeScript-aware checker to catch hook dependency issues and unhandled async work.

### Phase 2: Make it safe for real users

1. **Implement auth and ownership.** Add users, project ownership, and authorization checks to every project/message route.
2. **Introduce migrations.** Generate versioned Drizzle migrations and document deploy/rollback steps.
3. **Add observability.** Track endpoint latency, AI latency, validation failures, provider errors, message count, project update success, and SSE disconnects.
4. **Improve failure UX.** Show recoverable error states on the board/chat rather than only a toast.
5. **Add export/import safety.** Include deterministic Obsidian export tests and consider import support for round-tripping plans.

### Phase 3: Improve product depth

1. **Plan quality evaluation.** Add a rubric that scores generated sessions for specificity, dependency order, right-sized duration, clear deliverables, and route appropriateness.
2. **Editable blueprint fields.** Let users edit goals, outline items, sessions, stack rules, and win conditions directly from the board.
3. **Session execution mode.** Add a guided view that turns a session into a ready-to-paste prompt for the selected AI model and tracks outputs/artifacts.
4. **Comparison mode.** Let users generate alternative plans using different orchestration strategies and compare them side-by-side.
5. **Collaboration.** Add comments, shared project links, and role-aware access once auth exists.

## Visual and UX improvement backlog

| Improvement                           | Impact | Notes                                                                                     |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Touch-visible annotation controls     | High   | Current hover-oriented affordances are less discoverable on mobile/tablet.                |
| Expandable stack-rule sections        | Medium | Long `tech_stack_rules` text currently risks truncation in session cards.                 |
| Blueprint diff after feedback         | High   | Show what changed after an annotation so users trust the iteration loop.                  |
| Persistent progress summary           | Medium | Add percent complete, session count, and next recommended action near the board header.   |
| Empty/error state screenshots in docs | Medium | Helps future agents compare UI completeness with other apps.                              |
| Optional lighter theme                | Low    | Current dark theme is cohesive; theme expansion can wait until core reliability improves. |

## Architecture improvement backlog

| Improvement                    | Impact | Suggested owner area                                                                        |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| `useProjectMessageStream` hook | High   | `artifacts/focusflow/src/pages/home.tsx` and a new hook under `src/hooks`.                  |
| Project service layer          | Medium | API server route can delegate persistence/model orchestration to testable functions.        |
| Provider adapter abstraction   | Medium | Encapsulate Gemini-specific calls so OpenAI/Z.AI routes can become real integrations later. |
| Versioned `ProjectState`       | Medium | Add a `schema_version` field if the blueprint structure will evolve.                        |
| Test fixtures for AI JSON      | High   | Store representative valid/invalid model payloads for route and parser tests.               |
| Error taxonomy                 | Medium | Standardize user-facing errors vs. internal logs across API and frontend.                   |

## Comparison checklist for another agent

When comparing FocusFlow to another app, gather the following facts for both apps:

1. **Primary user promise:** What job does the app claim to do?
2. **Primary artifact:** What durable output is produced besides chat messages?
3. **AI contract:** Is model output structured, schema-validated, streamed, persisted, and recoverable?
4. **State model:** Is the core state shape documented and shared across backend/frontend?
5. **Critical path:** What is the most important user flow, and is it tested?
6. **Failure behavior:** What happens when the model returns malformed output or the provider fails?
7. **Security boundary:** Is there authentication, authorization, tenant isolation, and secret hygiene?
8. **UX completeness:** Are empty/loading/error/success states designed on desktop and mobile?
9. **Operational readiness:** Are migrations, logs, metrics, and deploy requirements documented?
10. **Extension path:** Can another agent add a feature without editing a generated file or touching unrelated layers?

## Bottom-line recommendation

FocusFlow should not chase broad feature expansion yet. The next best investment is to harden the existing chat-to-blueprint loop with tests, cleaner streaming architecture, enum-backed model routing, and better failure observability. Once that loop is trustworthy, the product can differentiate further with editable blueprints, execution mode, and plan-quality evaluation.
