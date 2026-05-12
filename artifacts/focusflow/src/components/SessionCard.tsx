import React from "react";
import { CheckCircle2, Circle, Cpu, Layers } from "lucide-react";
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

const MODEL_STYLES: Record<string, { badge: string; bar: string; label: string }> = {
  OpenAI: { badge: "text-blue-400 border-blue-400/40 bg-blue-400/8",   bar: "bg-blue-400",   label: "OpenAI" },
  Gemini: { badge: "text-orange-400 border-orange-400/40 bg-orange-400/8", bar: "bg-orange-400", label: "Gemini" },
  "Z.AI": { badge: "text-teal-400 border-teal-400/40 bg-teal-400/8",   bar: "bg-teal-400",   label: "Z.AI" },
  GLM:    { badge: "text-teal-400 border-teal-400/40 bg-teal-400/8",   bar: "bg-teal-400",   label: "GLM" },
};
const DEFAULT_STYLE = { badge: "text-primary border-primary/40 bg-primary/8", bar: "bg-primary", label: "AI" };

export default function SessionCard({ session, index, isCompleted, isNew = false, onToggleComplete }: SessionCardProps) {
  const style = MODEL_STYLES[session.recommended_agent] ?? DEFAULT_STYLE;

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
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
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

          {/* Complete toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0 h-8 w-8 hover:bg-primary/10 mt-0.5"
            onClick={e => { e.stopPropagation(); onToggleComplete(session.id); }}
            data-testid={`button-toggle-session-${session.id}`}
          >
            {isCompleted
              ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
            }
          </Button>
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
              <div className="text-xs font-mono text-foreground/80 bg-muted px-2 py-0.5 rounded truncate max-w-[180px]">
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
      </CardContent>
    </Card>
  );
}
