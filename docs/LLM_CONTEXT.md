# LLM Context: FocusFlow

This document is optimized for coding agents and LLM handoffs. It describes the repository as it is intended to be edited, not just as a user-facing README.

## Product intent

FocusFlow is a Tri-Model AI Orchestrator. A user describes a project, then the system acts as a Socratic project manager and decomposes the work into execution sessions. Each session should be routed to the most appropriate AI model family:

- **Gemini:** multimodal research, large-context ingestion, live research, video/mockup analysis.
- **OpenAI / GPT-5.5:** core engineering, backend logic, multi-file refactors, abstract reasoning, strict API orchestration.
- **Z.AI / GLM:** high-aesthetic UI generation, long terminal-agent loops, preserved-thinking workflows, rigid OCR/schema extraction.

The output is not just chat. The critical artifact is the structured `project_state` that powers the right-side blueprint board.

## Data model contract

The canonical persisted state is defined in `lib/db/src/schema/projects.ts` and mirrored in `lib/api-spec/openapi.yaml`.

```ts
type ProjectState = {
  goal: string;
  outline: string[];
  sessions: ProjectSession[];
  obsidian_markdown: string;
};

type ProjectSession = {
  id: string;
  title: string;
  description: string;
  recommended_agent: string;
  tech_stack_rules: string;
  win_condition: string;
  deliverables: string[];
  dependencies: string[];
};
```

When changing this shape, update in this order:

1. `lib/api-spec/openapi.yaml`
2. `lib/db/src/schema/projects.ts`
3. `pnpm --filter @workspace/api-spec run codegen`
4. `artifacts/api-server/src/routes/projects/index.ts`
5. `artifacts/focusflow/src/**/*` consumers

## Request/response flow

1. `Home` loads projects through generated React Query hooks.
2. `ChatPanel` passes user text to `Home.handleSendMessage`.
3. `Home.handleSendMessage` uses raw `fetch` against `${import.meta.env.BASE_URL}api/projects/:id/messages` because the endpoint returns an SSE stream.
4. `artifacts/api-server/src/routes/projects/index.ts` persists the user message, calls Gemini with a structured JSON response schema, validates the returned `project_state`, persists the assistant message, updates the project, and emits a final SSE event.
5. `Home` consumes `assistant_content` and `project_state`, updates local UI state, and invalidates the project query to reconcile with the database.

## Generated code policy

Generated files are useful context but should not be manually edited during normal feature work:

- `lib/api-client-react/src/generated/*`
- `lib/api-zod/src/generated/*`

Regenerate them from `lib/api-spec/openapi.yaml` with:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## UI architecture notes

- `artifacts/focusflow/src/pages/home.tsx` is intentionally stateful. It coordinates the selected project, streaming lifecycle, local optimistic messages, blueprint updates, and mobile chat/board tabs.
- `ChatPanel` should remain focused on text input, starter prompts, lock-state visuals, and message rendering.
- `BlueprintBoard` should remain focused on goal/outline/session display, empty/building states, Obsidian export, and annotation entry points.
- `SessionCard` should remain focused on one session, including copy-prompt and completion interactions.
- Prefer shadcn/ui primitives and existing design tokens from `src/index.css`; avoid one-off hard-coded colors unless matching existing model-routing accents.

## API and AI notes

- The Gemini SDK expects `systemInstruction` inside `config` for the installed `@google/genai` type definitions.
- Do not stream raw structured JSON to the user interface. If a future change restores token-by-token UX, stream a separate user-facing text field or implement robust JSON-field extraction.
- Server-side validation intentionally preserves the prior project state when the AI omits optional state fields.
- The message route should keep returning SSE-compatible events because the frontend is built around `ReadableStream` parsing.

## Environment variables

| Variable                          | Required by                         | Purpose                                                      |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `PORT`                            | API server and frontend dev/preview | Runtime port.                                                |
| `BASE_PATH`                       | FocusFlow Vite app                  | Base path used by Vite and by frontend API URL construction. |
| `DATABASE_URL`                    | `lib/db`                            | PostgreSQL connection string.                                |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini integration                  | Replit AI Integration proxy base URL.                        |
| `AI_INTEGRATIONS_GEMINI_API_KEY`  | Gemini integration                  | Replit AI Integration API key.                               |

## Safe change checklist for LLM agents

- Run `rg --files` instead of recursive `ls` or `grep`.
- Run `pnpm run typecheck` before committing.
- Run `pnpm run build` for runtime/bundling validation when app code changed.
- If changing visible UI, inspect the app manually and capture a screenshot when environment permits.
- Keep docs in sync with architecture changes.
- Do not wrap imports in `try/catch`.
