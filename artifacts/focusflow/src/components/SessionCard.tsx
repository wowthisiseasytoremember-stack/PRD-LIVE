import React, { useState } from "react";
import { CheckCircle2, Circle, Cpu, Layers, ClipboardCopy, Check, Terminal, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectSession } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

interface SessionCardProps {
  session: ProjectSession;
  index: number;
  isCompleted: boolean;
  isNew?: boolean;
  onToggleComplete: (id: string) => void;
}

const MODEL_STYLES: Record<string, { badge: string; bar: string }> = {
  OpenAI: { badge: "text-blue-400 border-blue-400/40 bg-blue-400/8",     bar: "bg-blue-400" },
  Gemini: { badge: "text-orange-400 border-orange-400/40 bg-orange-400/8", bar: "bg-orange-400" },
  "Z.AI": { badge: "text-teal-400 border-teal-400/40 bg-teal-400/8",     bar: "bg-teal-400" },
  GLM:    { badge: "text-teal-400 border-teal-400/40 bg-teal-400/8",     bar: "bg-teal-400" },
};
const DEFAULT_STYLE = { badge: "text-primary border-primary/40 bg-primary/8", bar: "bg-primary" };

// Simple keyword highlighter — wraps XML tags, markdown headers, and keywords in colored spans
function HighlightedPrompt({ text }: { text: string }) {
  // Split into lines and apply per-line colouring
  const lines = text.split("\n");
  return (
    <code className="block whitespace-pre-wrap font-mono text-[11.5px] leading-[1.65] break-words">
      {lines.map((line, i) => {
        // XML tags → dim green
        if (/^<[^/]/.test(line.trim()) || /^<\//.test(line.trim())) {
          return <span key={i} className="text-[#7ee787]">{line}{"\n"}</span>;
        }
        // Markdown ## headers → bright white / bold
        if (/^##/.test(line.trim())) {
          return <span key={i} className="text-[#e6edf3] font-semibold">{line}{"\n"}</span>;
        }
        // yaml-style keys (key: value)
        if (/^\w[\w_]+:/.test(line.trim())) {
          const colonIdx = line.indexOf(":");
          return (
            <span key={i}>
              <span className="text-[#79c0ff]">{line.slice(0, line.indexOf(":") + 1)}</span>
              <span className="text-[#a5d6ff]">{line.slice(colonIdx + 1)}</span>
              {"\n"}
            </span>
          );
        }
        // HALT DIRECTIVE line — accent it in orange/amber
        if (/HALT|GO \/ NO-GO|win condition/i.test(line)) {
          return <span key={i} className="text-[#ffa657]">{line}{"\n"}</span>;
        }
        // Numbered list items
        if (/^\d+\./.test(line.trim())) {
          return <span key={i} className="text-[#d2a8ff]">{line}{"\n"}</span>;
        }
        // Bullet points
        if (/^[-•*]/.test(line.trim())) {
          return <span key={i} className="text-[#8b949e]">{line}{"\n"}</span>;
        }
        // Default
        return <span key={i} className="text-[#c9d1d9]">{line}{"\n"}</span>;
      })}
    </code>
  );
}

export default function SessionCard({ session, index, isCompleted, isNew = false, onToggleComplete }: SessionCardProps) {
  const style = MODEL_STYLES[session.recommended_agent] ?? DEFAULT_STYLE;
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const hasPrompt = !!session.optimized_agent_prompt;

  const handleCopyPromptInline = () => {
    if (!session.optimized_agent_prompt) return;
    navigator.clipboard.writeText(session.optimized_agent_prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleCopyCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = [
      `# Session ${session.id || index + 1}: ${session.title}`,
      "",
      session.description,
      "",
      `**Stack rules:** ${session.tech_stack_rules}`,
      `**Win condition:** ${session.win_condition}`,
      "",
      "**Deliverables:**",
      ...(session.deliverables ?? []).map((d: string) => `- ${d}`),
    ];
    if (session.optimized_agent_prompt) {
      lines.push("", "**Optimized Agent Prompt:**", "```prompt", session.optimized_agent_prompt, "```");
    }
    navigator.clipboard.writeText(lines.join("\n").trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${
        isCompleted ? "opacity-45 grayscale-[0.35]" : "hover:border-border/70"
      }`}
      data-testid={`card-session-${session.id}`}
    >
      {/* Model-color left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${style.bar} opacity-60 shrink-0`} />

      <CardHeader className="pb-2.5 border-b border-border/40 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <Badge
              variant="outline"
              className="w-fit text-[10px] font-mono text-muted-foreground border-border/60 px-1.5 py-0"
            >
              SESSION_{session.id || String(index + 1).padStart(2, "0")}
            </Badge>
            <CardTitle
              className={`text-[15px] font-semibold mt-1 leading-snug ${
                isCompleted ? "line-through text-muted-foreground" : ""
              } ${isNew ? "text-reveal" : ""}`}
              style={isNew ? { animationDelay: "0.05s" } : undefined}
            >
              {session.title}
            </CardTitle>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {/* Terminal / prompt toggle */}
            {hasPrompt && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-md hover:bg-muted transition-colors ${
                  promptOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPromptOpen(v => !v)}
                title="View optimized agent prompt"
              >
                <Terminal className="w-3.5 h-3.5 shrink-0" />
              </Button>
            )}

            {/* Copy card summary */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={handleCopyCard}
              title="Copy session as markdown"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                : <ClipboardCopy className="w-3.5 h-3.5 shrink-0" />
              }
            </Button>

            {/* Complete toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 hover:bg-primary/10"
              onClick={e => { e.stopPropagation(); onToggleComplete(session.id); }}
              data-testid={`button-toggle-session-${session.id}`}
            >
              {isCompleted
                ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              }
            </Button>
          </div>
        </div>

        {session.description && (
          <p
            className={`text-xs text-muted-foreground mt-1.5 leading-relaxed ${isNew ? "text-reveal" : ""}`}
            style={isNew ? { animationDelay: "0.1s" } : undefined}
          >
            {session.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-3 pb-4 pl-5 flex flex-col gap-3">
        {/* Route + Stack */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Cpu className="w-3 h-3 shrink-0" /> Route To
            </div>
            <Badge variant="outline" className={`text-xs w-fit ${style.badge}`}>
              {session.recommended_agent}
            </Badge>
          </div>

          {session.tech_stack_rules && (
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3 shrink-0" /> Stack Rules
              </div>
              <div className="text-xs font-mono text-foreground/80 bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
                {session.tech_stack_rules}
              </div>
            </div>
          )}
        </div>

        {/* Win condition */}
        {session.win_condition && (
          <div className="bg-muted/40 px-3 py-2 rounded-md border border-border/60">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Win Condition</div>
            <div
              className={`text-sm font-medium leading-snug ${isNew ? "text-reveal" : ""}`}
              style={isNew ? { animationDelay: "0.18s" } : undefined}
            >
              {session.win_condition}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {session.dependencies && session.dependencies.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dependencies</div>
            <div className="flex flex-wrap gap-1.5">
              {session.dependencies.map((dep: string) => (
                <Badge key={dep} variant="outline" className="text-yellow-400 border-yellow-400/35 bg-yellow-400/8 text-[10px]">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables */}
        {session.deliverables && session.deliverables.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Deliverables</div>
            <ul className="space-y-0.5">
              {session.deliverables.map((del: string, i: number) => (
                <li
                  key={i}
                  className={`text-xs text-foreground/80 flex items-start gap-1.5 ${isNew ? "text-reveal" : ""}`}
                  style={isNew ? { animationDelay: `${0.22 + i * 0.05}s` } : undefined}
                >
                  <span className="text-primary mt-0.5 shrink-0">›</span>
                  {del}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Optimized Agent Prompt Terminal Block ── */}
        <AnimatePresence initial={false}>
          {promptOpen && hasPrompt && (
            <motion.div
              key="prompt-terminal"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: "hidden" }}
            >
              {/* Terminal chrome */}
              <div className="mt-1 rounded-lg border border-[#30363d] overflow-hidden shadow-xl">
                {/* Title bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#8b949e] ml-1">
                      optimized_agent_prompt · {session.recommended_agent}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]"
                    onClick={handleCopyPromptInline}
                    title="Copy prompt"
                  >
                    {promptCopied
                      ? <Check className="w-3 h-3 text-[#3fb950]" />
                      : <ClipboardCopy className="w-3 h-3" />
                    }
                  </Button>
                </div>

                {/* Prompt body */}
                <div className="bg-[#0d1117] px-4 py-3 max-h-[420px] overflow-y-auto">
                  <HighlightedPrompt text={session.optimized_agent_prompt!} />
                </div>

                {/* Footer copy confirmation */}
                <AnimatePresence>
                  {promptCopied && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="px-3 py-1.5 bg-[#0d1117] border-t border-[#30363d] flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3 text-[#3fb950]" />
                      <span className="text-[10px] font-mono text-[#3fb950]">
                        Copied — paste into {session.recommended_agent}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt toggle hint when no prompt yet */}
        {!hasPrompt && (
          <div className="text-[10px] font-mono text-muted-foreground/40 flex items-center gap-1">
            <Terminal className="w-3 h-3 shrink-0" />
            Prompt generates with full blueprint
          </div>
        )}
      </CardContent>
    </Card>
  );
}
