import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Cpu, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectSession } from "@workspace/api-client-react/src/generated/api.schemas";

interface SessionCardProps {
  session: ProjectSession;
  index: number;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
}

const modelColors: Record<string, string> = {
  "OpenAI": "text-blue-400 border-blue-400 bg-blue-400/10",
  "Gemini": "text-orange-400 border-orange-400 bg-orange-400/10",
  "Z.AI": "text-teal-400 border-teal-400 bg-teal-400/10",
  "GLM": "text-teal-400 border-teal-400 bg-teal-400/10",
};

export default function SessionCard({ session, index, isCompleted, onToggleComplete }: SessionCardProps) {
  const modelColor = modelColors[session.recommended_agent] || "text-primary border-primary bg-primary/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`relative overflow-hidden transition-all ${isCompleted ? 'opacity-50 grayscale-[0.5]' : ''}`} data-testid={`card-session-${session.id}`}>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="w-fit text-xs font-mono text-muted-foreground border-border">
                SESSION_{session.id}
              </Badge>
              <CardTitle className={`text-lg mt-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {session.title}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => onToggleComplete(session.id)}
              data-testid={`button-toggle-session-${session.id}`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{session.description}</p>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Route To
              </div>
              <Badge variant="outline" className={modelColor}>
                {session.recommended_agent}
              </Badge>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Stack Rules
              </div>
              <div className="text-sm font-mono text-foreground/80 bg-muted px-2 py-1 rounded">
                {session.tech_stack_rules}
              </div>
            </div>
          </div>

          {session.dependencies && session.dependencies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Dependencies</div>
              <div className="flex flex-wrap gap-2">
                {session.dependencies.map(dep => (
                  <Badge key={dep} variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">
                    {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-md border border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Win Condition</div>
            <div className="text-sm font-medium">{session.win_condition}</div>
          </div>

          {session.deliverables && session.deliverables.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Deliverables</div>
              <ul className="list-disc list-inside pl-4 text-sm text-foreground/80 space-y-1">
                {session.deliverables.map((del, i) => (
                  <li key={i}>{del}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
