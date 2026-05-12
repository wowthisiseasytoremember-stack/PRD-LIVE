# FocusFlow

A Tri-Model AI Orchestrator that acts as a Socratic project manager — it breaks down your project ideas into 45-90 minute execution sessions and routes each to the optimal AI model (OpenAI, Gemini, or Z.AI/GLM).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/focusflow run dev` — run the frontend (port 20417)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY` — auto-set by Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Gemini 2.5 Flash via Replit AI Integrations (no user API key needed)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- OpenAPI spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/projects.ts`
- API routes: `artifacts/api-server/src/routes/projects/index.ts`
- Frontend pages: `artifacts/focusflow/src/pages/home.tsx`
- Frontend components: `artifacts/focusflow/src/components/`
  - `ProjectDrawer.tsx` — sliding left drawer for project management
  - `ChatPanel.tsx` — AI chat interface with SSE streaming
  - `BlueprintBoard.tsx` — right panel showing project blueprint
  - `SessionCard.tsx` — individual session cards with routing info

## Architecture decisions

- Gemini AI integration uses Replit AI Integrations proxy — no API key required from user
- Chat responses use SSE streaming for real-time output
- AI responds in structured JSON (`chat_response` + `project_state`) — server parses and streams text, then sends project state update on completion
- Projects and messages persist in PostgreSQL (no Firebase dependency)
- Single-page app with no routing — all state managed in `home.tsx`

## Product

- Chat with AI to plan any project
- AI asks Socratic questions to clarify scope and goals
- Generates a structured Blueprint with: Core Goal, Structure outline, execution Sessions
- Each session is routed to the optimal AI model with tech stack rules and win conditions
- Sessions can be toggled as completed
- Export to Obsidian markdown format

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, re-run codegen before using updated types
- `@google/genai` must be a direct dependency of `api-server` (externalized in esbuild)
- The `sendProjectMessage` SSE endpoint cannot use a generated React Query hook — use raw fetch + ReadableStream

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
