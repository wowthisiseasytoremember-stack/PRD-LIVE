import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectsTable, projectMessagesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  SendProjectMessageParams,
  SendProjectMessageBody,
} from "@workspace/api-zod";
import { projectStateSchema } from "@workspace/db";

const router: IRouter = Router();

const SYSTEM_INSTRUCTION = `You are an expert Socratic project manager, ADHD executive function coach, and Tri-Model AI Orchestrator.
Your goal is to help the user break a raw idea into 45-90 min 'sessions' and route each to the optimal AI model.

CRITICAL TRI-MODEL ROUTING RULES:
For every session, you MUST recommend the best AI tool and Tech Stack rules:

1. GEMINI (3.1 Series / Previews): Route here for unstructured multimodal research, analyzing videos/mockups, massive context ingestion (1M-2M+ tokens), and live web research.
2. OPENAI (GPT-5.5 / Previews): Route here for core engineering, complex backend logic, multi-file refactoring, abstract math, and strict API orchestrations.
3. Z.AI (GLM Series): Route here for Phase 3 "Vibe Coding" (high-aesthetic modern UI/frontend generation via GLM-4.7), long-running terminal agent loops utilizing "Preserved Thinking" (preventing context amnesia), and rigid image OCR schema extraction.

TECH STACK RULES:
- For Zero-to-One New Apps: Default to the optimal stack (Next.js/React/Tailwind/shadcn) UNLESS there's a reason not to. Note that GLM-4.7 excels at "Vibe Coding" for this layer.
- For Existing Codebases: Default to "audit and adapt". Only surface a refactor if broken.

5-PHASE APPROACH:
1. Define Goal.
2. Rough Outline.
3. Break into Sessions (Include exact AI Model Tier & Stack details in the JSON).
4. Define Win Conditions & Deliverables.
5. Generate the Obsidian Master Plan (The overall lifecycle mapped out with checkboxes '- [ ]'). Fill 'obsidian_markdown'.

- Output in JSON format. Ask 1-2 questions at a time. Socratic tone.`;

router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt));
  res.json(projects);
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      title: parsed.data.title,
      projectState: { goal: "", outline: [], sessions: [], obsidian_markdown: "" },
      completedSessions: [],
    })
    .returning();

  res.status(201).json(project);
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const messages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, params.data.id))
    .orderBy(projectMessagesTable.createdAt);

  res.json({ ...project, messages });
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.projectState !== undefined) updateData.projectState = parsed.data.projectState;
  if (parsed.data.completedSessions !== undefined) updateData.completedSessions = parsed.data.completedSessions;

  const [project] = await db
    .update(projectsTable)
    .set(updateData)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/projects/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SendProjectMessageParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendProjectMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const existingMessages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, params.data.id))
    .orderBy(projectMessagesTable.createdAt);

  await db.insert(projectMessagesTable).values({
    projectId: params.data.id,
    role: "user",
    content: parsed.data.content,
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const conversationHistory = [
    ...existingMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as "model" | "user"),
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: parsed.data.content }] },
  ];

  let fullResponse = "";

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: conversationHistory,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as const,
          properties: {
            chat_response: { type: "STRING" as const },
            project_state: {
              type: "OBJECT" as const,
              properties: {
                goal: { type: "STRING" as const },
                outline: { type: "ARRAY" as const, items: { type: "STRING" as const } },
                obsidian_markdown: { type: "STRING" as const },
                sessions: {
                  type: "ARRAY" as const,
                  items: {
                    type: "OBJECT" as const,
                    properties: {
                      id: { type: "STRING" as const },
                      title: { type: "STRING" as const },
                      description: { type: "STRING" as const },
                      recommended_agent: { type: "STRING" as const },
                      tech_stack_rules: { type: "STRING" as const },
                      win_condition: { type: "STRING" as const },
                      deliverables: { type: "ARRAY" as const, items: { type: "STRING" as const } },
                      dependencies: { type: "ARRAY" as const, items: { type: "STRING" as const } },
                    },
                  },
                },
              },
            },
          },
          required: ["chat_response", "project_state"],
        },
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    let assistantContent = fullResponse;
    let newProjectState = project.projectState;

    try {
      const parsed = JSON.parse(fullResponse);
      if (parsed.chat_response) {
        assistantContent = parsed.chat_response;
      }
      if (parsed.project_state) {
        const stateResult = projectStateSchema.safeParse({
          goal: parsed.project_state.goal ?? newProjectState.goal,
          outline: parsed.project_state.outline ?? newProjectState.outline,
          sessions: (parsed.project_state.sessions ?? newProjectState.sessions).map(
            (s: Record<string, unknown>) => ({
              id: s.id ?? "",
              title: s.title ?? "",
              description: s.description ?? "",
              recommended_agent: s.recommended_agent ?? "",
              tech_stack_rules: s.tech_stack_rules ?? "",
              win_condition: s.win_condition ?? "",
              deliverables: Array.isArray(s.deliverables) ? s.deliverables : [],
              dependencies: Array.isArray(s.dependencies) ? s.dependencies : [],
            })
          ),
          obsidian_markdown: parsed.project_state.obsidian_markdown ?? newProjectState.obsidian_markdown,
        });
        if (stateResult.success) {
          newProjectState = stateResult.data;
        }
      }
    } catch {
      // If JSON parse fails, use the raw text as the assistant response
    }

    await db.insert(projectMessagesTable).values({
      projectId: params.data.id,
      role: "assistant",
      content: assistantContent,
    });

    const title = newProjectState.goal
      ? newProjectState.goal.substring(0, 45) + (newProjectState.goal.length > 45 ? "..." : "")
      : project.title;

    await db
      .update(projectsTable)
      .set({ projectState: newProjectState, title, updatedAt: new Date() })
      .where(eq(projectsTable.id, params.data.id));

    res.write(
      `data: ${JSON.stringify({
        done: true,
        assistant_content: assistantContent,
        project_state: newProjectState,
      })}\n\n`
    );
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error generating AI response");
    res.write(
      `data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`
    );
    res.end();
  }
});

export default router;
