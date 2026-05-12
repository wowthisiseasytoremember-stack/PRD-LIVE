import React, { useState, useEffect, useRef } from "react";
import { ProjectState, ProjectSession } from "@workspace/api-client-react";
import { Copy, Download, Zap, MessageSquarePlus, X, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import SessionCard from "./SessionCard";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface BlueprintBoardProps {
  projectState?: ProjectState | null;
  completedSessions: string[];
  onToggleComplete: (id: string) => void;
  isStreaming: boolean;
  blueprintVersion: number;
  onSendAnnotation: (elementLabel: string, comment: string) => void;
}

// Inline annotation widget that appears when user clicks an element
function AnnotationBox({
  label,
  onSubmit,
  onClose,
}: {
  label: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
      transition={{ duration: 0.18 }}
      className="mt-2 rounded-lg border border-primary/40 bg-card shadow-lg shadow-primary/5 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-primary/5">
        <MessageSquarePlus className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-mono text-primary truncate flex-1">
          Comment on: <span className="text-foreground">{label}</span>
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-2 flex gap-2 items-end">
        <Textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder="Your feedback or question…"
          className="min-h-[60px] max-h-[120px] resize-none border-border text-sm bg-background"
          rows={2}
        />
        <Button
          size="icon"
          disabled={!text.trim()}
          onClick={submit}
          className="shrink-0 h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md mb-0.5"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground px-3 pb-2 font-mono">
        ↵ sends to chat · Esc to dismiss
      </p>
    </motion.div>
  );
}

// Pulsing skeleton shown while AI is thinking
function BuildingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-6 pt-6">
      {/* Scanner line */}
      <div className="relative h-0.5 bg-border overflow-hidden rounded-full mb-8">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ x: ["−100%", "400%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-xs font-mono uppercase tracking-widest text-primary">Constructing blueprint</span>
      </div>

      {/* Goal + Structure skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/50 p-4 space-y-3"
          >
            <div className="h-3 w-24 rounded bg-border animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <div
                  key={j}
                  className="h-2.5 rounded bg-border/70 animate-pulse"
                  style={{ width: `${70 + Math.random() * 25}%`, animationDelay: `${j * 0.1}s` }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Session skeletons */}
      <div className="space-y-4 pt-2">
        <div className="h-3 w-36 rounded bg-border animate-pulse" />
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.18, duration: 0.4 }}
            className="rounded-xl border border-border bg-card/50 p-4 space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-2 w-20 rounded bg-border animate-pulse" />
                <div className="h-4 w-48 rounded bg-border/70 animate-pulse" />
              </div>
              <div className="h-6 w-6 rounded-full bg-border animate-pulse ml-4" />
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-16 rounded-full bg-border/60 animate-pulse" />
              <div className="h-5 w-24 rounded bg-border/60 animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Annotatable wrapper: clicking shows inline annotation box
function Annotatable({
  id,
  label,
  activeId,
  onActivate,
  onSendAnnotation,
  children,
  className = "",
}: {
  id: string;
  label: string;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  onSendAnnotation: (label: string, text: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = activeId === id;
  return (
    <div className={`group/annotate relative ${className}`}>
      <div
        onClick={() => onActivate(isActive ? null : id)}
        className="cursor-pointer rounded-xl ring-1 ring-transparent hover:ring-primary/30 transition-all duration-200"
      >
        {children}
        {/* Hover hint */}
        {!isActive && (
          <div className="absolute top-2 right-2 opacity-0 group-hover/annotate:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-[10px] font-mono text-primary/70 bg-background/80 backdrop-blur-sm border border-primary/20 rounded px-1.5 py-0.5">
              <MessageSquarePlus className="w-2.5 h-2.5" /> comment
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {isActive && (
          <AnnotationBox
            label={label}
            onSubmit={text => onSendAnnotation(label, text)}
            onClose={() => onActivate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BlueprintBoard({
  projectState,
  completedSessions,
  onToggleComplete,
  isStreaming,
  blueprintVersion,
  onSendAnnotation,
}: BlueprintBoardProps) {
  const { toast } = useToast();
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);

  // Clear annotation on new blueprint version
  useEffect(() => {
    setActiveAnnotation(null);
  }, [blueprintVersion]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(projectState, null, 2));
    toast({ title: "Copied JSON", description: "Project state copied to clipboard." });
  };

  const handleOpenObsidian = () => {
    if (!projectState?.obsidian_markdown) {
      toast({ title: "Markdown not ready", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(projectState.obsidian_markdown);
    const uri = `obsidian://new?name=${encodeURIComponent("FocusFlow Blueprint")}&content=${encodeURIComponent(projectState.obsidian_markdown)}`;
    window.location.href = uri;
    toast({ title: "Copied & Opened", description: "Markdown copied and Obsidian opened." });
  };

  const hasState = projectState && (projectState.goal || projectState.sessions?.length);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="text-sm font-mono uppercase tracking-widest text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Blueprint
          {isStreaming && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-[10px] text-primary ml-1"
            >
              ● LIVE
            </motion.span>
          )}
        </h2>
        {hasState && !isStreaming && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyJson} className="border-border h-7 text-xs">
              <Copy className="w-3 h-3 mr-1.5" /> JSON
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenObsidian}
              disabled={!projectState?.obsidian_markdown}
              className="bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white h-7 text-xs"
            >
              <Download className="w-3 h-3 mr-1.5" /> Obsidian
            </Button>
          </div>
        )}
        {!hasState && !isStreaming && (
          <span className="text-[10px] font-mono text-muted-foreground">Click any element to comment</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {/* Streaming / building skeleton */}
          {isStreaming && !hasState && (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BuildingSkeleton />
            </motion.div>
          )}

          {/* Empty / awaiting state */}
          {!isStreaming && !hasState && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[calc(100vh-10rem)] flex items-center justify-center p-8 text-center"
            >
              <div className="max-w-sm space-y-4 opacity-40">
                <Zap className="w-14 h-14 text-primary mx-auto" />
                <h2 className="text-lg font-mono uppercase tracking-wider">Awaiting Input</h2>
                <p className="text-sm text-muted-foreground">
                  The Blueprint Board will populate as the Tri-Model Orchestrator structures your project.
                </p>
              </div>
            </motion.div>
          )}

          {/* Blueprint content — stagger reveal on new version */}
          {hasState && (
            <motion.div
              key={`blueprint-${blueprintVersion}`}
              className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-6 pt-6"
            >
              {/* Tip bar when just built */}
              {!isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 text-[11px] text-primary/70 font-mono border border-primary/15 bg-primary/5 rounded-lg px-3 py-2"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                  Click any card to leave feedback — it'll be sent to the Orchestrator
                </motion.div>
              )}

              {/* Goal + Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectState.goal && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, type: "spring", stiffness: 280, damping: 28 }}
                  >
                    <Annotatable
                      id="goal"
                      label="Core Goal"
                      activeId={activeAnnotation}
                      onActivate={setActiveAnnotation}
                      onSendAnnotation={onSendAnnotation}
                    >
                      <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs uppercase tracking-widest text-primary">Core Goal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-foreground leading-relaxed">{projectState.goal}</p>
                        </CardContent>
                      </Card>
                    </Annotatable>
                  </motion.div>
                )}

                {projectState.outline && projectState.outline.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 28 }}
                  >
                    <Annotatable
                      id="structure"
                      label="Structure"
                      activeId={activeAnnotation}
                      onActivate={setActiveAnnotation}
                      onSendAnnotation={onSendAnnotation}
                    >
                      <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs uppercase tracking-widest text-secondary">Structure</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="space-y-1.5">
                            {projectState.outline.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                                <ChevronRight className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    </Annotatable>
                  </motion.div>
                )}
              </div>

              {/* Sessions */}
              {projectState.sessions && projectState.sessions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Execution Sessions
                    </h3>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {completedSessions.length}/{projectState.sessions.length} complete
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {projectState.sessions.map((session: ProjectSession, i: number) => (
                      <motion.div
                        key={session.id || i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 260, damping: 26 }}
                      >
                        <Annotatable
                          id={`session-${session.id}`}
                          label={session.title || `Session ${i + 1}`}
                          activeId={activeAnnotation}
                          onActivate={setActiveAnnotation}
                          onSendAnnotation={onSendAnnotation}
                        >
                          <SessionCard
                            session={session}
                            index={i}
                            isCompleted={completedSessions.includes(session.id)}
                            onToggleComplete={onToggleComplete}
                          />
                        </Annotatable>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
