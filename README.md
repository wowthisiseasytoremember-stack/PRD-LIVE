# FocusFlow

FocusFlow is a pnpm/TypeScript workspace for a Socratic AI project manager. The app turns rough project ideas into a structured blueprint, 45–90 minute execution sessions, and model-routing recommendations for OpenAI, Gemini, and Z.AI/GLM.

## LLM quick context

- **Primary app:** `artifacts/focusflow` (React + Vite + Tailwind + shadcn/ui).
- **API server:** `artifacts/api-server` (Express 5, SSE endpoint under `/api/projects/:id/messages`).
- **Database package:** `lib/db` (Drizzle schema for projects and project messages).
- **OpenAPI contract:** `lib/api-spec/openapi.yaml`; generated clients live in `lib/api-client-react` and `lib/api-zod`.
- **AI integration:** `lib/integrations-gemini-ai` wraps `@google/genai` through Replit AI Integrations environment variables.
- **Canonical project state shape:** `ProjectState` has `goal`, `outline`, `sessions`, and `obsidian_markdown`; `ProjectSession` has model routing, stack rules, win conditions, deliverables, and dependencies.
- **Do not hand-edit generated files** unless intentionally regenerating from the OpenAPI spec.

For deeper LLM handoff notes, read [`docs/LLM_CONTEXT.md`](docs/LLM_CONTEXT.md). For the current audit, read [`docs/AUDIT.md`](docs/AUDIT.md).

## Prerequisites

- Node.js 24-compatible runtime.
- pnpm (the root `preinstall` script rejects npm/yarn lockfiles).
- PostgreSQL database reachable through `DATABASE_URL`.
- Replit Gemini AI Integration variables:
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`
  - `AI_INTEGRATIONS_GEMINI_API_KEY`

## Common commands

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/focusflow run dev
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

The frontend Vite config requires `PORT` and `BASE_PATH`. The API server requires `PORT`. In Replit, these are normally provided by the runtime.

## Workspace map

| Path | Purpose | Notes for LLM agents |
| --- | --- | --- |
| `artifacts/focusflow/src/pages/home.tsx` | Top-level SPA state orchestration | Owns selected project, local optimistic messages, SSE parsing, mobile tab state, and blueprint completion state. |
| `artifacts/focusflow/src/components/ChatPanel.tsx` | Chat UI | Contains starter prompts, input locking while the AI is working, and message bubbles. |
| `artifacts/focusflow/src/components/BlueprintBoard.tsx` | Blueprint and annotation UI | Shows generated goal, outline, sessions, Obsidian export, and annotation affordances. |
| `artifacts/focusflow/src/components/SessionCard.tsx` | Individual execution session UI | Shows route-to model, stack rules, win condition, dependencies, deliverables, copy prompt, and completion toggle. |
| `artifacts/api-server/src/routes/projects/index.ts` | Projects CRUD + AI message route | Validates requests, persists messages, calls Gemini, parses structured JSON, and emits SSE completion events. |
| `lib/api-spec/openapi.yaml` | API contract | Regenerate clients after changing this file. |
| `lib/db/src/schema/projects.ts` | Drizzle and Zod schemas | Keep this in sync with OpenAPI `ProjectState`/`ProjectSession`. |
| `lib/integrations-gemini-ai/src/client.ts` | Gemini client bootstrap | Reads Replit AI Integration env vars and configures base URL. |

## Development workflow

1. Change the OpenAPI spec first when API shapes change.
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate React Query hooks and Zod validators.
3. Update DB schema and migrations/push scripts if persisted shapes change.
4. Update server route validation and frontend usage.
5. Run `pnpm run typecheck` and `pnpm run build`.
6. Update docs, especially `docs/LLM_CONTEXT.md`, if architecture or workflows change.

## Operational notes

- The AI response is requested as structured JSON. The server parses the final payload and sends a clean SSE `done` event containing `assistant_content` and `project_state` so the UI does not render raw JSON fragments.
- The frontend currently uses a raw `fetch` for `/api/projects/:id/messages` because generated React Query hooks are not well-suited to `ReadableStream` parsing.
- `pnpm-workspace.yaml` intentionally enforces a minimum npm release age for supply-chain defense. Do not disable it.
