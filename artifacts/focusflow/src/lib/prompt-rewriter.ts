export type PromptModel = "auto" | "glm" | "claude" | "gpt" | "gemini" | "deepseek" | "grok";

export type ConcretePromptModel = Exclude<PromptModel, "auto">;

export type PromptRewriteResult = {
  model: ConcretePromptModel;
  label: string;
  prompt: string;
};

export const PROMPT_MODEL_OPTIONS: { value: PromptModel; label: string; helper: string }[] = [
  { value: "auto", label: "Auto-pick", helper: "Let FocusFlow choose the best prompt style" },
  { value: "glm", label: "GLM", helper: "Structured build specs and implementation detail" },
  { value: "claude", label: "Claude", helper: "Context-rich reasoning with clear constraints" },
  { value: "gpt", label: "GPT", helper: "Instruction-first execution with acceptance criteria" },
  { value: "gemini", label: "Gemini", helper: "Multimodal research and source-aware planning" },
  { value: "deepseek", label: "DeepSeek", helper: "Code-heavy decomposition and verification" },
  { value: "grok", label: "Grok", helper: "Fast iteration with direct decision points" },
];

export const MODEL_LABELS: Record<ConcretePromptModel, string> = {
  glm: "GLM",
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  grok: "Grok",
};

export function inferPromptModel(prompt: string): ConcretePromptModel {
  const normalized = prompt.toLowerCase();
  if (/\b(image|video|screenshot|diagram|visual|multimodal|slides?|pdf|research|sources?)\b/.test(normalized)) return "gemini";
  if (/\b(code|debug|refactor|api|database|schema|typescript|python|tests?|repo|bug|implementation)\b/.test(normalized)) return "deepseek";
  if (/\b(strategy|ethics|policy|legal|memo|long context|analyze|reason|trade[- ]?offs?)\b/.test(normalized)) return "claude";
  if (/\b(ship|mvp|product|plan|requirements?|acceptance criteria|workflow|user stories?)\b/.test(normalized)) return "gpt";
  if (/\b(funny|tone|social|x post|tweet|hot take|current events?|roast)\b/.test(normalized)) return "grok";
  return "glm";
}

export function rewritePromptForModel(prompt: string, targetModel: PromptModel): PromptRewriteResult {
  const trimmed = prompt.trim();
  const model = targetModel === "auto" ? inferPromptModel(trimmed) : targetModel;
  const label = MODEL_LABELS[model];

  const sectionsByModel: Record<ConcretePromptModel, string[]> = {
    glm: [
      "Act as a precise implementation planner. Convert the request into a structured execution spec.",
      "Prioritize concrete architecture, component boundaries, data flow, edge cases, and handoff-ready tasks.",
      "Return: objective, assumptions, step-by-step plan, files/components to touch, risks, and done criteria.",
    ],
    claude: [
      "Act as a careful senior collaborator. Reason through the request before proposing the final plan.",
      "Make constraints explicit, compare trade-offs, and preserve important nuance from the source prompt.",
      "Return: clarified goal, context, reasoning summary, recommended approach, caveats, and next actions.",
    ],
    gpt: [
      "Act as an execution-focused product engineer. Follow the instructions exactly and optimize for a shippable result.",
      "Use concise structure, clear priorities, and measurable acceptance criteria.",
      "Return: final prompt interpretation, implementation steps, acceptance criteria, and validation checklist.",
    ],
    gemini: [
      "Act as a multimodal research and planning assistant. Look for visual, document, and source-aware details that may matter.",
      "Separate known facts from assumptions, call out missing assets, and suggest evidence to gather if needed.",
      "Return: task framing, relevant inputs/assets, research questions, plan, and output format.",
    ],
    deepseek: [
      "Act as a code-first systems engineer. Optimize for correctness, maintainability, and verifiable changes.",
      "Break the work into implementation units, note dependencies, and include tests or checks for each unit.",
      "Return: technical objective, proposed changes, pseudocode if helpful, test plan, and failure modes.",
    ],
    grok: [
      "Act as a fast, direct iteration partner. Challenge weak assumptions and move quickly toward a useful draft.",
      "Keep the response practical, opinionated, and easy to revise.",
      "Return: best interpretation, direct recommendation, quick plan, open questions, and a first-pass output.",
    ],
  };

  return {
    model,
    label,
    prompt: [
      `[Optimized for ${label}]`,
      "",
      ...sectionsByModel[model],
      "",
      "Original task:",
      trimmed,
      "",
      "Before answering, ask only the minimum necessary clarifying questions. If the task is clear, proceed with the best reasonable assumptions and state them briefly.",
    ].join("\n"),
  };
}
