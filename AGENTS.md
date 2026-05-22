# FocusFlow — Agent Context

**Last updated:** 2026-05-19

## Project Description

FocusFlow is a Tri-Model AI Project Orchestrator — a Socratic AI project manager that decomposes fuzzy project ideas into 45–90 minute execution sessions, routes each to the optimal AI model (OpenAI, Gemini, Z.AI/GLM), and generates an actionable blueprint with win conditions, deliverables, and standalone agent prompts. Built as a dark-themed single-page app with SSE streaming for real-time AI responses.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9 |
| Frontend | React 19 + Vite + Tailwind CSS 4 + shadcn/ui + Framer Motion |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM + Drizzle Zod |
| AI | Gemini 1.5 Flash via `@google/genai` |
| API Codegen | Orval (OpenAPI → React Query + Zod) |
| Build | esbuild |
| Containers | Docker + docker-compose |

## Key Files

- `artifacts/focusflow/src/App.tsx` — Frontend entry point
- `artifacts/focusflow/src/pages/home.tsx` — SPA state orchestration
- `artifacts/focusflow/src/components/ChatPanel.tsx` — Chat UI with SSE streaming
- `artifacts/focusflow/src/components/BlueprintBoard.tsx` — Blueprint + annotation UI
- `artifacts/api-server/src/routes/projects/index.ts` — API routes (CRUD + AI messages)
- `artifacts/api-server/src/routes/prompt-forge/index.ts` — Prompt rewriting API
- `lib/db/src/schema/projects.ts` — Drizzle ORM schema
- `lib/integrations-gemini-ai/` — Gemini API client wrapper
- `lib/api-spec/` — OpenAPI 3.x contract
- `docs/LLM_CONTEXT.md` — LLM-optimized architecture notes
- `pnpm-workspace.yaml` — Workspace configuration
- `.env.example` — Environment variable template

## Run Commands

```bash
pnpm install                          # Install dependencies (pnpm required, npm/yarn rejected)
pnpm --filter @workspace/db run push  # Push DB schema to PostgreSQL
pnpm --filter @workspace/api-server run dev  # Start Express 5 API server
pnpm --filter @workspace/focusflow run dev   # Start Vite frontend dev server
pnpm run typecheck                    # Full typecheck across all packages
pnpm run build                        # Typecheck + build all packages
docker compose up -d                  # Start PostgreSQL + app (production)
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Runtime port |
| `BASE_PATH` | FocusFlow Vite base path |

## Development Workflow

1. Edit OpenAPI spec first when API shapes change
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks/validators
3. Update DB schema and run push if persisted shapes change
4. Update server routes and frontend consumers
5. Run `pnpm run typecheck && pnpm run build`
6. Keep docs in sync

## Notes

- AI responses use structured JSON with response schema validation
- SSE via raw `fetch` + `ReadableStream` (generated React Query hooks not suitable for streaming)
- No client-side routing — single-page, state managed in `home.tsx`
- Server preserves prior project state when AI omits optional fields
- Generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` should not be hand-edited
