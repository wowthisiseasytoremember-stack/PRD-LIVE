import React from "react";
import { ProjectState } from "@workspace/api-client-react/src/generated/api.schemas";
import { Copy, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import SessionCard from "./SessionCard";
import { useToast } from "@/hooks/use-toast";

interface BlueprintBoardProps {
  projectState?: ProjectState | null;
  completedSessions: string[];
  onToggleComplete: (id: string) => void;
}

export default function BlueprintBoard({ projectState, completedSessions, onToggleComplete }: BlueprintBoardProps) {
  const { toast } = useToast();

  if (!projectState || (!projectState.goal && !projectState.sessions?.length)) {
    return (
      <div className="h-full flex items-center justify-center bg-card/30 p-8 text-center border-l border-border">
        <div className="max-w-sm space-y-4 opacity-50">
          <Zap className="w-16 h-16 text-primary mx-auto opacity-50" />
          <h2 className="text-xl font-mono uppercase tracking-wider text-foreground">Awaiting Input</h2>
          <p className="text-sm text-muted-foreground">The Blueprint Board will populate as the Tri-Model Orchestrator structures your project.</p>
        </div>
      </div>
    );
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(projectState, null, 2));
    toast({
      title: "Copied JSON",
      description: "Project state copied to clipboard.",
    });
  };

  const handleOpenObsidian = () => {
    if (!projectState.obsidian_markdown) {
      toast({
        title: "Markdown not ready",
        description: "Obsidian markdown is not yet available.",
        variant: "destructive"
      });
      return;
    }
    navigator.clipboard.writeText(projectState.obsidian_markdown);
    
    // Attempt to open Obsidian URL scheme
    const uri = `obsidian://new?name=${encodeURIComponent("FocusFlow Blueprint")}&content=${encodeURIComponent(projectState.obsidian_markdown)}`;
    window.location.href = uri;
    
    toast({
      title: "Copied & Opened",
      description: "Markdown copied and Obsidian opened.",
    });
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="text-lg font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Blueprint
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyJson} data-testid="button-copy-json" className="border-border">
            <Copy className="w-4 h-4 mr-2" /> JSON
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleOpenObsidian} 
            disabled={!projectState.obsidian_markdown}
            className="bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white"
            data-testid="button-open-obsidian"
          >
            <Download className="w-4 h-4 mr-2" /> Obsidian
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-primary">Core Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{projectState.goal}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-secondary">Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-decimal list-inside text-sm text-foreground leading-relaxed space-y-1">
                  {projectState.outline?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Execution Sessions</h3>
            <div className="grid grid-cols-1 gap-4">
              {projectState.sessions?.map((session, i) => (
                <SessionCard 
                  key={session.id || i} 
                  session={session} 
                  index={i} 
                  isCompleted={completedSessions.includes(session.id)}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
