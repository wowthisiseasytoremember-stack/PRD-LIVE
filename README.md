# FocusFlow

**Tri-Model AI Project Orchestrator** — Turn raw ideas into structured execution plans.

FocusFlow is a Socratic AI project manager that decomposes fuzzy project ideas into 45–90 minute execution sessions, routes each to the optimal AI model (OpenAI, Gemini, or Z.AI/GLM), and generates an actionable blueprint with win conditions, deliverables, and standalone agent prompts — all within a polished dark-themed single-page app.

## Overview

Describe any project in natural language. FocusFlow's AI acts as a Socratic coach — asking clarifying questions, then producing a structured **Blueprint** composed of:

- **Core Goal** — a concise statement of what's being built
- **Structure Outline** — high-level breakdown of the work
- **Execution Sessions** — 45–90 minute sessions, each routed to the best-fit AI model with tech stack rules, win conditions, deliverables, dependencies, and a fully-engineered optimized agent prompt
- **Obsidian Export** — a markdown file ready to import into Obsidian, with each session prompt embedded

The app is a **pnpm monorepo** with workspaces for the React frontend (`artifacts/focusflow`), Express API server (`artifacts/api-server`), database layer (`lib/db`), OpenAPI codegen pipeline (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`), and Gemini AI integration (`lib/integrations-gemini-ai`).

## Key Features

- **Chat-driven planning** — natural language conversation with a Socratic AI that builds structured project blueprints
- **Tri-model routing** — each session is routed to OpenAI (core engineering/logic), Gemini (multimodal research/large context), or Z.AI/GLM (UI generation/terminal agents) based on the task
- **Optimized agent prompts** — every session includes a complete, standalone system prompt engineered for zero human-in-the-loop interruptions, using the target model's native dialect (XML tags for OpenAI, Markdown headers for Gemini, YAML config for Z.AI)
- **Blueprint Board** — live-updating right panel showing goal, outline, sessions with progress tracking
- **Session completion tracking** — check off sessions as complete with animated progress bar
- **Annotation system** — hover any blueprint element and leave targeted feedback for the AI to refine
- **Obsidian export** — one-click export of the full plan as Obsidian markdown with embedded prompts
- **Prompt Forge** — standalone tool to rewrite any raw prompt for a specific target model dialect
- **SSE streaming** — real-time streaming of AI responses via Server-Sent Events
- **Mobile responsive** — tab-based chat/board views on smaller screens

## Architecture

```
PRD-LIVE/
├── artifacts/
│   ├── focusflow/           # React + Vite + Tailwind + shadcn/ui frontend
│   │   └── src/
│   │       ├── pages/home.tsx          # SPA state orchestration
│   │       ├── components/
│   │       │   ├── ChatPanel.tsx       # Chat UI with SSE streaming
│   │       │   ├── BlueprintBoard.tsx  # Blueprint + annotation UI
│   │       │   ├── SessionCard.tsx     # Individual session display
│   │       │   ├── ProjectDrawer.tsx   # Sliding project manager drawer
│   │       │   └── PromptForge.tsx     # Prompt rewriting tool
│   │       ├── hooks/                  # Custom React hooks
│   │       └── lib/                    # Utilities and prompt rewriter
│   ├── api-server/          # Express 5 backend with SSE endpoint
│   │   └── src/routes/
│   │       ├── projects/index.ts       # Projects CRUD + AI message route
│   │       └── prompt-forge/index.ts   # Prompt rewriting API
│   └── mockup-sandbox/      # UI prototyping sandbox
├── lib/
│   ├── db/                  # Drizzle ORM schema + PostgreSQL client
│   │   └── src/schema/projects.ts     # Project and message schemas
│   ├── api-spec/            # OpenAPI 3.x contract + Orval codegen
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validators
│   └── integrations-gemini-ai/  # Gemini API client wrapper
├── docs/
│   ├── LLM_CONTEXT.md       # LLM-optimized architecture notes
│   ├── AUDIT.md             # Known issues and follow-up priorities
│   ├── COMPARATIVE_REVIEW.md # Product maturity review
│   └── audits/              # Additional audit artifacts
├── docker-compose.yml       # PostgreSQL + app containers
├── Dockerfile               # Multi-stage production build
├── .env.example             # Environment variable template
└── pnpm-workspace.yaml      # Workspace configuration
```

## Data Model

The core domain objects that power the Blueprint:

```typescript
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
  recommended_agent: string;     // "OpenAI" | "Gemini" | "Z.AI"
  tech_stack_rules: string;
  win_condition: string;
  deliverables: string[];
  dependencies: string[];
  optimized_agent_prompt?: string; // Standalone prompt for the target model
};
```

## Request/Response Flow

1. User types a message in ChatPanel
2. Frontend sends a raw `fetch` POST to `/api/projects/:id/messages`
3. The API server persists the user message, calls Gemini with a structured JSON response schema
4. Gemini returns `{ chat_response, project_state }` — the server parses and validates it
5. Server emits an SSE `done` event with `assistant_content` and `project_state`
6. Frontend updates local state, Blueprint Board, and invalidates the project query
7. The Blueprint Board renders the goal, outline, sessions with animated cards

## Prerequisites

- Node.js 22+ runtime
- **pnpm** (the root `preinstall` script rejects npm/yarn)
- PostgreSQL database
- Gemini API access (via Replit AI Integrations or direct API key)

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

# Push database schema
pnpm --filter @workspace/db run push

# Run API server (terminal 1)
pnpm --filter @workspace/api-server run dev

# Run frontend (terminal 2 - requires PORT and BASE_PATH)
pnpm --filter @workspace/focusflow run dev
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-server run dev` | Start API server |
| `pnpm --filter @workspace/focusflow run dev` | Start frontend dev server |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API clients from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes (dev) |
| `docker compose up -d` | Start PostgreSQL + app in production mode |

## Environment Variables

| Variable | Required By | Purpose |
|----------|-------------|---------|
| `PORT` | API server + frontend | Runtime port |
| `BASE_PATH` | FocusFlow Vite app | Base path for routing |
| `DATABASE_URL` | `lib/db` | PostgreSQL connection string |
| `GEMINI_API_KEY` | `integrations-gemini-ai` | Google Gemini API key |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini integration | Replit AI Integrations proxy URL |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini integration | Replit AI Integrations API key |

## Development Workflow

1. Change the OpenAPI spec first when API shapes change
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate React Query hooks and Zod validators
3. Update DB schema and run push if persisted shapes change
4. Update server route validation and frontend consumers
5. Run `pnpm run typecheck` and `pnpm run build`
6. Keep docs in sync — especially `docs/LLM_CONTEXT.md`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | pnpm workspaces |
| **Language** | TypeScript 5.9 |
| **Frontend** | React 19 + Vite + Tailwind CSS 4 + shadcn/ui + Framer Motion |
| **API** | Express 5 |
| **Database** | PostgreSQL + Drizzle ORM + Drizzle Zod |
| **AI** | Gemini 1.5 Flash via `@google/genai` |
| **API Codegen** | Orval (OpenAPI → React Query + Zod) |
| **Build** | esbuild |
| **Containers** | Docker + docker-compose (PostgreSQL + app) |

## Operational Notes

- AI responses are requested as structured JSON with a response schema — the server parses and validates before updating the UI, preventing raw JSON fragments from rendering as chat text
- The `sendProjectMessage` SSE endpoint uses raw `fetch` + `ReadableStream` parsing (generated React Query hooks aren't suited for streaming)
- The frontend is a single-page app with no client-side routing — all state is managed in `home.tsx`
- Server-side validation preserves prior project state when the AI omits optional fields
- `pnpm-workspace.yaml` enforces a minimum npm release age for supply-chain security
- Generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` should not be hand-edited

## License

MIT
