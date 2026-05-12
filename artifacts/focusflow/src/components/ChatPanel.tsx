import React, { useRef, useEffect } from "react";
import { ProjectMessage } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Cpu, MessageSquarePlus, WandSparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatPanelProps {
  messages: ProjectMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isBuildMode: boolean;
  onSendMessage: (content: string) => void;
}

type PromptModel = "auto" | "glm" | "claude" | "gpt" | "gemini" | "deepseek" | "grok";

type PromptRewriteResult = {
  model: Exclude<PromptModel, "auto">;
  label: string;
  prompt: string;
};

const PROMPT_MODEL_OPTIONS: { value: PromptModel; label: string; helper: string }[] = [
  { value: "auto", label: "Auto-pick", helper: "Let FocusFlow choose the best prompt style" },
  { value: "glm", label: "GLM", helper: "Structured build specs and implementation detail" },
  { value: "claude", label: "Claude", helper: "Context-rich reasoning with clear constraints" },
  { value: "gpt", label: "GPT", helper: "Instruction-first execution with acceptance criteria" },
  { value: "gemini", label: "Gemini", helper: "Multimodal research and source-aware planning" },
  { value: "deepseek", label: "DeepSeek", helper: "Code-heavy decomposition and verification" },
  { value: "grok", label: "Grok", helper: "Fast iteration with direct decision points" },
];

const MODEL_LABELS: Record<Exclude<PromptModel, "auto">, string> = {
  glm: "GLM",
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  grok: "Grok",
};

function inferPromptModel(prompt: string): Exclude<PromptModel, "auto"> {
  const normalized = prompt.toLowerCase();
  if (/\b(image|video|screenshot|diagram|visual|multimodal|slides?|pdf|research|sources?)\b/.test(normalized)) return "gemini";
  if (/\b(code|debug|refactor|api|database|schema|typescript|python|tests?|repo|bug|implementation)\b/.test(normalized)) return "deepseek";
  if (/\b(strategy|ethics|policy|legal|memo|long context|analyze|reason|trade[- ]?offs?)\b/.test(normalized)) return "claude";
  if (/\b(ship|mvp|product|plan|requirements?|acceptance criteria|workflow|user stories?)\b/.test(normalized)) return "gpt";
  if (/\b(funny|tone|social|x post|tweet|hot take|current events?|roast)\b/.test(normalized)) return "grok";
  return "glm";
}

function rewritePromptForModel(prompt: string, targetModel: PromptModel): PromptRewriteResult {
  const trimmed = prompt.trim();
  const model = targetModel === "auto" ? inferPromptModel(trimmed) : targetModel;
  const label = MODEL_LABELS[model];

  const sectionsByModel: Record<Exclude<PromptModel, "auto">, string[]> = {
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

// Parse annotation messages into a label + text pair
function parseAnnotation(content: string): { label: string; text: string } | null {
  const m = content.match(/^\[Feedback on "(.+?)"\]: ([\s\S]+)$/);
  return m ? { label: m[1], text: m[2] } : null;
}

function MessageBubble({ role, content, isStreaming }: { role: string; content: string; isStreaming?: boolean }) {
  const isUser = role === "user";
  const annotation = isUser ? parseAnnotation(content) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex gap-2.5 mb-5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser ? "bg-secondary/20 border border-secondary/30" : "bg-primary/15 border border-primary/30"
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full ${isUser ? "bg-secondary" : "bg-primary"}`} />
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1 min-w-0 max-w-[88%] ${isUser ? "items-end" : "items-start"}`}>
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider px-1">
          {isUser ? "You" : "Orchestrator"}
        </div>

        {annotation ? (
          // Beautiful annotation pill message
          <div className="px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquarePlus className="w-3 h-3 text-primary shrink-0" />
              <Badge
                variant="outline"
                className="text-[10px] font-mono px-1.5 py-0 text-primary border-primary/30 bg-primary/10"
              >
                {annotation.label}
              </Badge>
            </div>
            <p className="text-foreground/90 leading-relaxed">{annotation.text}</p>
          </div>
        ) : (
          // Standard message bubble
          <div className={`px-3 py-2.5 rounded-lg text-sm whitespace-pre-wrap leading-relaxed break-words ${
            isUser
              ? "bg-secondary/8 border border-secondary/15 text-secondary-foreground"
              : "bg-card border border-border text-card-foreground"
          }`}>
            {content}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle rounded-sm" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatPanel({ messages, isStreaming, streamingContent, isBuildMode, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = React.useState("");
  const [promptModel, setPromptModel] = React.useState<PromptModel>("auto");
  const [rewriteLabel, setRewriteLabel] = React.useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
    setRewriteLabel(null);
    resetTextareaHeight();
  };

  const handleRewritePrompt = () => {
    if (!input.trim() || isStreaming) return;
    const result = rewritePromptForModel(input, promptModel);
    setInput(result.prompt);
    setRewriteLabel(promptModel === "auto" ? `Auto picked ${result.label}` : `Rewritten for ${result.label}`);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      textareaRef.current.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setRewriteLabel(null);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden">
      {/* Messages — swap between build-status and full history */}
      <AnimatePresence mode="wait">
        {isBuildMode ? (
          <motion.div
            key="build-status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 p-5 text-center"
          >
            {/* Pulsing CPU icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary shrink-0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-primary">
                <span>Orchestrating</span>
                <span className="flex gap-0.5 items-end">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="inline-block w-1 h-1 rounded-full bg-primary"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Blueprint building on the right →</p>
            </div>

            {/* Last user message preview */}
            {messages.length > 0 && (
              <div className="w-full mt-1 bg-card/50 border border-border/60 rounded-lg p-3 text-left">
                <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-1">Your prompt</div>
                <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                  {messages.filter(m => m.role === "user").slice(-1)[0]?.content}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chat-messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto p-4 md:p-5"
            ref={scrollRef}
          >
            {messages.length === 0 && !streamingContent ? (
              <div className="h-full flex flex-col items-center justify-center max-w-xs mx-auto py-8 gap-6">
                <div className="text-center space-y-2 opacity-70">
                  <Sparkles className="w-9 h-9 text-primary mx-auto mb-1 shrink-0" />
                  <p className="text-sm font-medium text-foreground">Tri-Model Orchestration</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Describe any project. FocusFlow breaks it into 45–90 min sessions and routes each to the optimal AI.
                  </p>
                </div>
                {/* Clickable starter prompts */}
                <div className="w-full space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 text-center">Try one of these</p>
                  {[
                    "Build a SaaS analytics dashboard with React and Supabase",
                    "Plan a mobile fitness app with AI coaching features",
                    "Create an automated content pipeline with AI writing",
                    "Design a personal finance tracker with investment insights",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => onSendMessage(prompt)}
                      className="w-full text-left text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card hover:border-primary/30 hover:text-foreground transition-all duration-150 leading-relaxed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col pb-4">
                {messages.map((msg, i) => (
                  <MessageBubble key={msg.id || i} role={msg.role} content={msg.content} />
                ))}
                {streamingContent && (
                  <MessageBubble role="assistant" content={streamingContent} isStreaming />
                )}
                {isStreaming && !streamingContent && (
                  <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                    <span className="text-xs font-mono">Thinking…</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar — always visible, locked during streaming */}
      <div className="p-3 border-t border-border bg-background/80 backdrop-blur-md shrink-0">
        {isStreaming ? (
          // ── Locked state: premium "processing" look ──
          <div className="relative rounded-lg border border-primary/25 bg-card overflow-hidden">
            {/* Sweeping glow line */}
            <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
              <motion.div
                className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-mono text-primary tracking-wider uppercase">Orchestrating</span>
              <span className="flex-1" />
              <span className="text-[10px] text-muted-foreground/50 font-mono">Stand by…</span>
            </div>
          </div>
        ) : (
          // ── Active input ──
          <div className="relative group space-y-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/70 p-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <WandSparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                <select
                  value={promptModel}
                  onChange={(event) => setPromptModel(event.target.value as PromptModel)}
                  className="h-8 min-w-[118px] rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground outline-none transition-colors focus:border-primary"
                  aria-label="Prompt rewrite target model"
                  data-testid="select-prompt-model"
                >
                  {PROMPT_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="hidden min-w-0 truncate text-[10px] text-muted-foreground sm:inline">
                  {rewriteLabel ?? PROMPT_MODEL_OPTIONS.find(option => option.value === promptModel)?.helper}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRewritePrompt}
                disabled={!input.trim()}
                className="h-8 shrink-0 gap-1.5 border-primary/30 bg-primary/5 px-2.5 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
                data-testid="button-rewrite-prompt"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                Improve prompt
              </Button>
            </div>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-15 group-focus-within:opacity-40 transition duration-500" />
            <div className="relative flex items-end gap-2 bg-card rounded-lg border border-border p-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isBuildMode ? "Continue or ask a follow-up…" : "Describe your project idea…"}
                className="min-h-[40px] max-h-[130px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-2 px-2 scrollbar-hide text-sm"
                rows={1}
                data-testid="input-chat"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                className="shrink-0 mb-0.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground w-8 h-8"
                data-testid="button-send"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
