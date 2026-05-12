import { Router, type IRouter } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const VALID_MODELS = ["auto", "OpenAI", "Gemini", "Z.AI"] as const;
type TargetModel = (typeof VALID_MODELS)[number];

function parseForgeBody(body: unknown): { raw_prompt: string; target_model: TargetModel } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const raw = typeof b["raw_prompt"] === "string" ? b["raw_prompt"].trim() : "";
  if (!raw || raw.length > 5000) return null;
  const model = VALID_MODELS.includes(b["target_model"] as TargetModel)
    ? (b["target_model"] as TargetModel)
    : "auto";
  return { raw_prompt: raw, target_model: model };
}

const buildSystemInstruction = (targetModel: string): string => {
  const modelDirective =
    targetModel === "auto"
      ? `First, analyze the task and select the optimal AI model from: OpenAI, Gemini, or Z.AI. Explain your reasoning briefly in the "rationale" field (1–2 sentences covering WHY this model is the best fit).`
      : `The target model is ${targetModel}. Apply that model's exact dialect. Set "rationale" to a 1-sentence explanation of why this model suits the task.`;

  return `You are the Autonomous Prompt Architect. Your sole job: transform a raw prompt idea into a fully-engineered, production-ready system prompt optimized for the target AI model.

${modelDirective}

TRI-MODEL TRANSLATION MATRIX — apply the exact dialect for the selected model:

• OPENAI (GPT-5): Wrap every section in strict XML tags (<context>, <task>, <constraints>, <rules>, <thinking_process>). Open with a senior role-play persona, e.g. "You are a senior staff engineer with 15 years of experience in [domain]...". Include step-by-step reasoning anchors inside <thinking_process> tags. Use numbered lists for multi-step procedures.

• GEMINI (3.1/Pro): Front-load ALL context in the very first paragraph — no preamble. Use imperative command verbs: Analyze, Implement, Generate, Audit, Extract, Produce. No personas or flowery intros. Enforce strict Markdown structure with ## headers for every section: ## Context, ## Task, ## Constraints, ## Success Criteria, ## Output Format.

• Z.AI (GLM-4.7/5): Format as a stable AGENTS.md-style configuration with a YAML-like header block. Set "preserved_thinking: true" for any task with complex multi-step logic. For UI/frontend tasks set "mode: vibe_coding" and use Vibe Coding keywords. Specify model variant: GLM-4.7 for UI/creative, GLM-4.5 for reasoning/logic.

ZERO-HITL GUARDRAILS — the optimized_prompt MUST include ALL THREE of these verbatim blocks:

1. AUTONOMY DIRECTIVE (insert near the top of the prompt):
"Execute this task end-to-end without pausing for clarifying questions or intermediate human check-ins. Do not ask for permission to proceed between steps. The only acceptable exception is a catastrophic, unresolvable blocker with no path forward."

2. SELF-VERIFICATION (insert after the task description):
Include the user's original success criteria verbatim, then add: "Before presenting any results, self-verify your entire output against these criteria. Fix any gaps silently before presenting."

3. HALT DIRECTIVE (must be the very last sentence of the prompt, verbatim):
"Once you have verified your output against the criteria above, present ALL deliverables to the user in full and HALT. Do NOT proceed further. Await an explicit GO / NO-GO from the user before concluding this session."

The "optimized_prompt" field must be the complete, standalone, copy-pasteable prompt text — no placeholders, no ellipsis, no "insert your X here". It must be ready to paste directly into the target AI.`;
};

router.post("/prompt-forge", async (req, res): Promise<void> => {
  const parsed = parseForgeBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "raw_prompt is required (max 5000 chars)" });
    return;
  }

  const { raw_prompt, target_model } = parsed;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: raw_prompt }] }],
      config: {
        systemInstruction: buildSystemInstruction(target_model),
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as const,
          properties: {
            target_model: { type: "STRING" as const },
            rationale: { type: "STRING" as const },
            optimized_prompt: { type: "STRING" as const },
          },
          required: ["target_model", "rationale", "optimized_prompt"],
        },
        maxOutputTokens: 4096,
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error forging prompt");
    res.status(500).json({ error: "Failed to forge prompt" });
  }
});

export default router;
