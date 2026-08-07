---
schema: agents-md/v1
project: PRD-LIVE
what: >-
  FocusFlow — a Socratic AI project manager that turns a fuzzy project idea
  into a structured blueprint: 45-90 minute execution sessions, each routed to
  a best-fit AI model and shipped with win conditions, deliverables and a
  standalone agent prompt. Delivered as a pnpm monorepo with a React SPA, an
  Express API and a Postgres/Drizzle data layer.
status: active
stack: [typescript, react, vite, tailwind, express, postgresql, drizzle, gemini, docker]
modules:
  - name: FocusFlow web app
    path: artifacts/focusflow
    does: React SPA — chat panel, blueprint board, annotations, Obsidian export.
  - name: API server
    path: artifacts/api-server
    does: Express 5 API with SSE streaming for AI responses and prompt rewriting.
  - name: Database layer
    path: lib/db
    does: Drizzle ORM schema and migrations for projects and blueprints.
  - name: Gemini integration
    path: lib/integrations-gemini-ai
    does: Wrapper around the Google Gemini client.
  - name: API contract
    path: lib/api-spec
    does: OpenAPI 3.x spec that drives React Query and Zod codegen.
updated: 2026-08-07 05:45 UTC
---

# FocusFlow — Agent Context

**Last updated:** 2026-05-19
**Initiative:** agent-infra (possibly earlier iteration of a current initiative — verify)
**Status:** Active prototype — may be superseded. Cross-check with current agent-infra work before extending.

## ⚠️ Continuity Note
Justin believes FocusFlow may be an earlier version of something currently being built.
Before doing significant work here, check ~/plans/initiatives.yml and recent session close-logs
for a "project orchestrator" or "Socratic PM" initiative that may have superseded this.

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
- `artifacts/api-server/src/routes/projects/index.ts` — API routes
- `artifacts/api-server/src/routes/prompt-forge/index.ts` — Prompt rewriting API
- `lib/db/src/schema/projects.ts` — Drizzle ORM schema
- `lib/integrations-gemini-ai/` — Gemini API client wrapper
- `lib/api-spec/` — OpenAPI 3.x contract
- `docs/LLM_CONTEXT.md` — LLM-optimized architecture notes

## Run Commands

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/focusflow run dev
docker compose up -d
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL
- `GEMINI_API_KEY` — Google Gemini
- `PORT`, `BASE_PATH`
