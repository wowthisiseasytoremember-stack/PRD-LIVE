import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Cpu,
  Layers,
  ClipboardCopy,
  Check,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectSession } from "@workspace/api-client-react";

interface SessionCardProps {
  session: ProjectSession;
  index: number;
  isCompleted: boolean;
  isNew?: boolean;
  onToggleComplete: (id: string) => void;
}

const MODEL_STYLES: Record<string, { badge: string; bar: string }> = {
  OpenAI: {
    badge: "text-blue-400 border-blue-400/40 bg-blue-400/8",
    bar: "bg-blue-400",
  },
  Gemini: {
    badge: "text-orange-400 border-orange-400/40 bg-orange-400/8",
    bar: "bg-orange-400",
  },
  "Z.AI": {
    badge: "text-teal-400 border-teal-400/40 bg-teal-400/8",
    bar: "bg-teal-400",
  },
  GLM: {
    badge: "text-teal-400 border-teal-400/40 bg-teal-400/8",
    bar: "bg-teal-400",
  },
};
const DEFAULT_STYLE = {
  badge: "text-primary border-primary/40 bg-primary/8",
  bar: "bg-primary",
};

function getModelStyle(agent: string): { badge: string; bar: string } {
  const normalized = agent.toLowerCase();
  if (normalized.includes("openai") || normalized.includes("gpt"))
    return MODEL_STYLES.OpenAI;
  if (normalized.includes("gemini")) return MODEL_STYLES.Gemini;
  if (normalized.includes("z.ai") || normalized.includes("glm"))
    return MODEL_STYLES["Z.AI"];
  return DEFAULT_STYLE;
}

function buildPrompt(session: ProjectSession, index: number): string {
  const lines: string[] = [
    `# Session ${session.id || index + 1}: ${session.title}`,
    "",
  ];
  if (session.description) lines.push(session.description, "");
  if (session.tech_stack_rules)
    lines.push(`**Stack rules:** ${session.tech_stack_rules}`, "");
  if (session.win_condition)
    lines.push(`**Win condition:** ${session.win_condition}`, "");
  if (session.deliverables?.length) {
    lines.push("**Deliverables:**");
    session.deliverables.forEach((d: string) => lines.push(`- ${d}`));
    lines.push("");
  }
  if (session.dependencies?.length) {
    lines.push(`**Depends on:** ${session.dependencies.join(", ")}`);
  }
  return lines.join("\n").trim();
}

export default function SessionCard({
  session,
  index,
  isCompleted,
  isNew = false,
  onToggleComplete,
}: SessionCardProps) {
  const style = getModelStyle(session.recommended_agent);
  const [copied, setCopied] = useState(false);
  const [stackExpanded, setStackExpanded] = useState(false);
  const stackRulesLong = session.tech_stack_rules.length > 42;

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(buildPrompt(session, index));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${
        isCompleted ? "opacity-45 grayscale-[0.35]" : "hover:border-border/70"
      }`}
      data-testid={`card-session-${session.id}`}
    >
      {/* Model-color left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${style.bar} opacity-60 shrink-0`}
      />

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

          {/* Actions: copy prompt + complete toggle */}
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={handleCopyPrompt}
              title={`Copy prompt for ${session.recommended_agent}`}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <ClipboardCopy className="w-3.5 h-3.5 shrink-0" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(session.id);
              }}
              data-testid={`button-toggle-session-${session.id}`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStackExpanded((expanded) => !expanded);
                }}
                className={`group/stack text-left text-xs font-mono text-foreground/80 bg-muted px-2 py-1 rounded border border-border/40 hover:border-primary/30 hover:text-foreground transition-colors ${
                  stackExpanded
                    ? "max-w-full whitespace-normal leading-relaxed"
                    : "max-w-[240px] truncate"
                }`}
                title={
                  stackRulesLong ? "Click to expand stack rules" : undefined
                }
              >
                <span>{session.tech_stack_rules}</span>
                {stackRulesLong && (
                  <ChevronDown
                    className={`inline-block ml-1 h-3 w-3 text-muted-foreground transition-transform ${
                      stackExpanded ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Win condition */}
        {session.win_condition && (
          <div className="bg-muted/40 px-3 py-2 rounded-md border border-border/60">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Win Condition
            </div>
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
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Dependencies
            </div>
            <div className="flex flex-wrap gap-1.5">
              {session.dependencies.map((dep: string) => (
                <Badge
                  key={dep}
                  variant="outline"
                  className="text-yellow-400 border-yellow-400/35 bg-yellow-400/8 text-[10px]"
                >
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables */}
        {session.deliverables && session.deliverables.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Deliverables
            </div>
            <ul className="space-y-0.5">
              {session.deliverables.map((del: string, i: number) => (
                <li
                  key={i}
                  className={`text-xs text-foreground/80 flex items-start gap-1.5 ${isNew ? "text-reveal" : ""}`}
                  style={
                    isNew
                      ? { animationDelay: `${0.22 + i * 0.05}s` }
                      : undefined
                  }
                >
                  <span className="text-primary mt-0.5 shrink-0">›</span>
                  {del}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Copy prompt hint — only on hover via CSS group */}
        {copied && (
          <div className="text-[10px] font-mono text-primary/70 flex items-center gap-1">
            <Check className="w-3 h-3 shrink-0" />
            Prompt copied — paste into {session.recommended_agent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
