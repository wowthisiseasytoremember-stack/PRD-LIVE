import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ProjectState, ProjectSession } from "@workspace/api-client-react";
import { Copy, Download, Zap, MessageSquarePlus, X, Send, ChevronRight, CheckCircle2 } from "lucide-react";
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
  isBlueprintNew: boolean;
  onSendAnnotation: (elementLabel: string, comment: string) => void;
}

interface ActiveAnnotation {
  id: string;
  label: string;
  rect: DOMRect;
}

// ── Floating annotation portal — renders into document.body so it's never clipped ──
function AnnotationPortal({
  active,
  onClose,
  onSubmit,
}: {
  active: ActiveAnnotation;
  onClose: () => void;
  onSubmit: (label: string, text: string) => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest("[data-annotation-portal]") && !t.closest("[data-annotatable]")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(active.label, text.trim());
    onClose();
  };

  const PORTAL_W = 340;
  const vw = window.innerWidth;
  const rawLeft = active.rect.left + active.rect.width / 2 - PORTAL_W / 2;
  const left = Math.max(8, Math.min(rawLeft, vw - PORTAL_W - 8));
  const top = active.rect.bottom + 10;
  const arrowLeft = Math.max(12, Math.min(
    active.rect.left + active.rect.width / 2 - left - 7,
    PORTAL_W - 24,
  ));

  return createPortal(
    <AnimatePresence>
      <motion.div
        data-annotation-portal
        initial={{ opacity: 0, y: -6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "fixed", top, left, width: PORTAL_W, zIndex: 9999 }}
        className="rounded-xl border border-primary/40 bg-[hsl(222,47%,8%)] shadow-2xl shadow-black/60"
      >
        {/* Arrow pointer */}
        <div
          style={{ position: "absolute", top: -8, left: arrowLeft, width: 16, height: 9, overflow: "hidden" }}
        >
          <div
            style={{
              width: 11, height: 11,
              background: "hsl(222,47%,12%)",
              border: "1px solid hsl(151,100%,46%,0.35)",
              transform: "rotate(45deg)",
              margin: "4px auto 0",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-primary/5 rounded-t-xl">
          <MessageSquarePlus className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
            Re: <span className="text-primary font-medium">{active.label}</span>
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Input row */}
        <div className="p-2 flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="Your feedback or question…"
            className="flex-1 min-h-[56px] max-h-[120px] resize-none text-sm border-border bg-background/60 focus-visible:ring-primary/30"
            rows={2}
          />
          <Button
            size="icon"
            disabled={!text.trim()}
            onClick={submit}
            className="h-8 w-8 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md self-end"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 px-3 pb-2.5 font-mono">
          ↵ send · Esc cancel
        </p>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ── Annotatable wrapper — measures itself and fires the portal ──
function Annotatable({
  id,
  label,
  isActive,
  onActivate,
  children,
  className = "",
}: {
  id: string;
  label: string;
  isActive: boolean;
  onActivate: (data: { id: string; label: string; rect: DOMRect } | null) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      onActivate(isActive ? null : { id, label, rect });
    }
  };

  return (
    <div
      ref={ref}
      data-annotatable
      onClick={handleClick}
      className={`group/ann relative cursor-pointer rounded-xl ring-1 ring-transparent hover:ring-primary/25 active:ring-primary/40 transition-all duration-200 select-none ${className}`}
    >
      {children}

      {/* Hover badge */}
      <div className="absolute top-2 right-2 opacity-0 group-hover/ann:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="flex items-center gap-1 text-[10px] font-mono text-primary/80 bg-background/90 backdrop-blur-sm border border-primary/20 rounded-md px-1.5 py-0.5 shadow-sm">
          <MessageSquarePlus className="w-2.5 h-2.5 shrink-0" />
          <span>comment</span>
        </div>
      </div>

      {/* Active ring */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-primary/50 pointer-events-none" />
      )}
    </div>
  );
}

// ── Glowing scanner skeleton for the "thinking" state ──
function BuildingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 md:px-6 pt-6">
      {/* Status badge */}
      <div className="flex items-center gap-2.5 mb-6">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[11px] font-mono uppercase tracking-widest text-primary">
          Constructing blueprint
        </span>
        <span className="flex gap-0.5 items-end ml-1">
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

      {/* Goal + Structure skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.4 }}
            className="relative rounded-xl border border-border bg-card/50 p-4 overflow-hidden"
          >
            {/* Glowing sweep */}
            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
              <div className="scanner-sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>
            <div className="h-2.5 w-20 rounded-full bg-muted animate-pulse mb-4" />
            <div className="space-y-2">
              {[80, 95, 65].map((w, j) => (
                <div key={j} className="h-2 rounded-full bg-muted/70 animate-pulse" style={{ width: `${w}%`, animationDelay: `${j * 120}ms` }} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Session skeletons */}
      <div className="space-y-3 pt-2">
        <div className="h-2.5 w-32 rounded-full bg-muted/60 animate-pulse" />
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28 + i * 0.16, duration: 0.4 }}
            className="relative rounded-xl border border-border bg-card/50 p-4 overflow-hidden"
          >
            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
              <div className="scanner-sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
                style={{ animationDelay: `${i * 0.25}s` }} />
            </div>
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2 flex-1">
                <div className="h-2 w-16 rounded-full bg-muted/60 animate-pulse" />
                <div className="h-3.5 w-48 rounded-full bg-muted/70 animate-pulse" />
              </div>
              <div className="h-7 w-7 rounded-full bg-muted/50 animate-pulse ml-4 shrink-0" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-14 rounded-full bg-muted/50 animate-pulse" />
              <div className="h-5 w-24 rounded bg-muted/40 animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function BlueprintBoard({
  projectState,
  completedSessions,
  onToggleComplete,
  isStreaming,
  blueprintVersion,
  isBlueprintNew,
  onSendAnnotation,
}: BlueprintBoardProps) {
  const { toast } = useToast();
  const [activeAnnotation, setActiveAnnotation] = useState<ActiveAnnotation | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Scroll to top of board when a new blueprint arrives
  useEffect(() => {
    if (!isBlueprintNew) return;
    const viewport = boardRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (viewport) viewport.scrollTop = 0;
  }, [blueprintVersion, isBlueprintNew]);

  // Track which session IDs were already known so only truly new ones animate
  const prevSessionIdsRef = useRef<Set<string>>(new Set());
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!projectState?.sessions) return;
    const current = new Set(projectState.sessions.map((s: ProjectSession) => s.id));
    if (isBlueprintNew) {
      // Full new board — every session animates, then remember them all
      setNewSessionIds(current);
    } else {
      // Annotation response — only animate sessions that didn't exist before
      const added = new Set([...current].filter(id => !prevSessionIdsRef.current.has(id)));
      setNewSessionIds(added);
    }
    prevSessionIdsRef.current = current;
  }, [blueprintVersion]);

  // Close portal when blueprint is replaced
  useEffect(() => { setActiveAnnotation(null); }, [blueprintVersion]);

  const handleActivate = useCallback(
    (data: { id: string; label: string; rect: DOMRect } | null) => setActiveAnnotation(data),
    [],
  );

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
    window.location.href = `obsidian://new?name=${encodeURIComponent("FocusFlow Blueprint")}&content=${encodeURIComponent(projectState.obsidian_markdown)}`;
    toast({ title: "Copied & Opened" });
  };

  const hasState = projectState && (projectState.goal || (projectState.sessions?.length ?? 0) > 0);
  const totalSessions = projectState?.sessions?.length ?? 0;
  const completedCount = completedSessions.length;
  const progressPct = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;

  // Reveal animation key: changes per blueprintVersion so text re-animates on new boards only
  const revealKey = isBlueprintNew ? blueprintVersion : "static";

  return (
    <div className="flex flex-col h-full bg-background border-l border-border overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            Blueprint
            {isStreaming && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                className="text-[10px] text-primary ml-1 font-mono"
              >
                ● LIVE
              </motion.span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            {hasState && !isStreaming && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyJson} className="border-border h-7 text-xs shrink-0">
                  <Copy className="w-3 h-3 mr-1.5 shrink-0" /> JSON
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenObsidian}
                  disabled={!projectState?.obsidian_markdown}
                  className="bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white h-7 text-xs shrink-0"
                >
                  <Download className="w-3 h-3 mr-1.5 shrink-0" /> Obsidian
                </Button>
              </>
            )}
            {!hasState && !isStreaming && (
              <span className="text-[10px] font-mono text-muted-foreground/60">Hover any card to annotate</span>
            )}
          </div>
        </div>

        {/* Animated progress bar + completion celebration */}
        {totalSessions > 0 && (
          <div className="px-4 pb-2.5 space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${progressPct === 100 ? "bg-primary shadow-[0_0_8px_hsl(151,100%,46%,0.6)]" : "bg-primary"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                {completedCount}/{totalSessions}
              </span>
            </div>
            <AnimatePresence>
              {progressPct === 100 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-primary"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  All sessions complete — project done!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1" ref={boardRef}>
        <AnimatePresence mode="wait">
          {/* Building skeleton */}
          {isStreaming && !hasState && (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
              <BuildingSkeleton />
            </motion.div>
          )}

          {/* Empty state */}
          {!isStreaming && !hasState && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center p-8 text-center"
              style={{ minHeight: "calc(100vh - 10rem)" }}
            >
              <div className="max-w-xs space-y-4 opacity-35">
                <Zap className="w-14 h-14 text-primary mx-auto" />
                <h2 className="text-lg font-mono uppercase tracking-wider">Awaiting Input</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Blueprint Board will populate as the Tri-Model Orchestrator structures your project.
                </p>
              </div>
            </motion.div>
          )}

          {/* Blueprint content */}
          {hasState && (
            <motion.div
              key={`blueprint-${blueprintVersion}`}
              initial={false}
              className="max-w-4xl mx-auto space-y-6 pb-24 px-4 md:px-6 pt-5"
            >
              {/* Tip bar on first build */}
              {!isStreaming && isBlueprintNew && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="flex items-center gap-2 text-[11px] text-primary/70 font-mono border border-primary/15 bg-primary/5 rounded-lg px-3 py-2"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                  Click any card to leave feedback — it goes straight to the Orchestrator
                </motion.div>
              )}

              {/* Goal + Structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectState!.goal && (
                  <motion.div
                    initial={isBlueprintNew ? { opacity: 0, y: 18 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, type: "spring", stiffness: 280, damping: 26 }}
                  >
                    <Annotatable id="goal" label="Core Goal" isActive={activeAnnotation?.id === "goal"} onActivate={handleActivate}>
                      <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs uppercase tracking-widest text-primary">Core Goal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p
                            key={`goal-text-${revealKey}`}
                            className={`text-sm text-foreground leading-relaxed ${isBlueprintNew ? "text-reveal" : ""}`}
                          >
                            {projectState!.goal}
                          </p>
                        </CardContent>
                      </Card>
                    </Annotatable>
                  </motion.div>
                )}

                {(projectState!.outline?.length ?? 0) > 0 && (
                  <motion.div
                    initial={isBlueprintNew ? { opacity: 0, y: 18 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16, type: "spring", stiffness: 280, damping: 26 }}
                  >
                    <Annotatable id="structure" label="Structure" isActive={activeAnnotation?.id === "structure"} onActivate={handleActivate}>
                      <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs uppercase tracking-widest text-secondary">Structure</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="space-y-1.5">
                            {projectState!.outline!.map((item: string, i: number) => (
                              <li
                                key={i}
                                className={`flex items-start gap-2 text-sm text-foreground leading-relaxed ${isBlueprintNew ? "text-reveal" : ""}`}
                                style={isBlueprintNew ? { animationDelay: `${0.16 + i * 0.06}s` } : undefined}
                              >
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
              {(projectState!.sessions?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <div className="border-b border-border pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Execution Sessions
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {projectState!.sessions!.map((session: ProjectSession, i: number) => {
                      const isNew = newSessionIds.has(session.id);
                      const sessionAnnotationId = `session-${session.id}`;
                      return (
                        <motion.div
                          key={session.id || i}
                          initial={isNew ? { opacity: 0, x: 24 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: isNew ? (isBlueprintNew ? 0.28 + i * 0.11 : 0.05) : 0,
                            type: "spring",
                            stiffness: 260,
                            damping: 26,
                          }}
                        >
                          <Annotatable
                            id={sessionAnnotationId}
                            label={session.title || `Session ${i + 1}`}
                            isActive={activeAnnotation?.id === sessionAnnotationId}
                            onActivate={handleActivate}
                          >
                            <SessionCard
                              session={session}
                              index={i}
                              isCompleted={completedSessions.includes(session.id)}
                              onToggleComplete={onToggleComplete}
                              isNew={isNew && isBlueprintNew}
                            />
                          </Annotatable>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Floating annotation portal — outside ScrollArea, never clipped */}
      {activeAnnotation && (
        <AnnotationPortal
          active={activeAnnotation}
          onClose={() => setActiveAnnotation(null)}
          onSubmit={onSendAnnotation}
        />
      )}
    </div>
  );
}
