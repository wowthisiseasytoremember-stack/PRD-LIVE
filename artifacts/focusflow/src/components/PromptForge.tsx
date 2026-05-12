import React, { useState, useRef, useEffect } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, ClipboardCopy, Check, Cpu, Zap, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface PromptForgeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TargetModel = "auto" | "OpenAI" | "Gemini" | "Z.AI";

interface ForgeResult {
  target_model: string;
  rationale: string;
  optimized_prompt: string;
}

const MODEL_CONFIG: Record<TargetModel, { label: string; color: string; activeClass: string; badge: string }> = {
  auto:   { label: "Auto",   color: "text-primary",    activeClass: "bg-primary/15 border-primary text-primary",       badge: "text-primary border-primary/40 bg-primary/10" },
  OpenAI: { label: "OpenAI", color: "text-blue-400",   activeClass: "bg-blue-400/15 border-blue-400 text-blue-400",    badge: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
  Gemini: { label: "Gemini", color: "text-orange-400", activeClass: "bg-orange-400/15 border-orange-400 text-orange-400", badge: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  "Z.AI": { label: "Z.AI",   color: "text-teal-400",   activeClass: "bg-teal-400/15 border-teal-400 text-teal-400",    badge: "text-teal-400 border-teal-400/40 bg-teal-400/10" },
};

// Lightweight syntax highlighter — same pattern as SessionCard
function HighlightedPrompt({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <code className="block whitespace-pre-wrap font-mono text-[11.5px] leading-[1.65] break-words">
      {lines.map((line, i) => {
        if (/^<[^/]/.test(line.trim()) || /^<\//.test(line.trim()))
          return <span key={i} className="text-[#7ee787]">{line}{"\n"}</span>;
        if (/^##/.test(line.trim()))
          return <span key={i} className="text-[#e6edf3] font-semibold">{line}{"\n"}</span>;
        if (/^\w[\w_-]+:/.test(line.trim())) {
          const c = line.indexOf(":");
          return (
            <span key={i}>
              <span className="text-[#79c0ff]">{line.slice(0, c + 1)}</span>
              <span className="text-[#a5d6ff]">{line.slice(c + 1)}</span>
              {"\n"}
            </span>
          );
        }
        if (/HALT|GO \/ NO-GO|win condition|success criteria/i.test(line))
          return <span key={i} className="text-[#ffa657]">{line}{"\n"}</span>;
        if (/^\d+\./.test(line.trim()))
          return <span key={i} className="text-[#d2a8ff]">{line}{"\n"}</span>;
        if (/^[-•*]/.test(line.trim()))
          return <span key={i} className="text-[#8b949e]">{line}{"\n"}</span>;
        return <span key={i} className="text-[#c9d1d9]">{line}{"\n"}</span>;
      })}
    </code>
  );
}

export default function PromptForge({ open, onOpenChange }: PromptForgeProps) {
  const { toast } = useToast();
  const [rawPrompt, setRawPrompt] = useState("");
  const [targetModel, setTargetModel] = useState<TargetModel>("auto");
  const [isForging, setIsForging] = useState(false);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const BASE = import.meta.env.BASE_URL;

  // Auto-resize textarea
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawPrompt(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
  };

  // Focus textarea when sheet opens
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  const handleForge = async () => {
    if (!rawPrompt.trim() || isForging) return;
    setIsForging(true);
    setResult(null);

    try {
      const res = await fetch(`${BASE}api/prompt-forge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_prompt: rawPrompt.trim(), target_model: targetModel }),
      });
      if (!res.ok) throw new Error("Forge request failed");
      const data: ForgeResult = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Forge failed", description: "Could not reach the AI. Try again.", variant: "destructive" });
    } finally {
      setIsForging(false);
    }
  };

  const handleCopy = () => {
    if (!result?.optimized_prompt) return;
    navigator.clipboard.writeText(result.optimized_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setRawPrompt("");
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleForge();
    }
  };

  const resolvedModel = (result?.target_model ?? targetModel) as TargetModel;
  const modelCfg = MODEL_CONFIG[resolvedModel] ?? MODEL_CONFIG["auto"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[540px] p-0 flex flex-col bg-background border-l border-border overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary shrink-0" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-sm font-mono uppercase tracking-widest text-foreground">
                Prompt Forge
              </SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground font-mono mt-0.5">
                Expand any idea into a model-optimized autonomous prompt
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Model selector */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono block">
              Target Model
            </label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(MODEL_CONFIG) as TargetModel[]).map((m) => {
                const cfg = MODEL_CONFIG[m];
                const active = targetModel === m;
                return (
                  <button
                    key={m}
                    onClick={() => setTargetModel(m)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all duration-150 ${
                      active
                        ? cfg.activeClass
                        : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground bg-transparent"
                    }`}
                  >
                    {m === "auto" ? "⚡ Auto" : cfg.label}
                  </button>
                );
              })}
            </div>
            {targetModel === "auto" && (
              <p className="text-[10px] text-muted-foreground/70 font-mono">
                AI selects the best model for your task
              </p>
            )}
          </div>

          {/* Raw prompt input */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono block">
              Raw Prompt Idea
            </label>
            <Textarea
              ref={textareaRef}
              value={rawPrompt}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              placeholder={
                `e.g. "Refactor the auth module to use JWT instead of sessions, keeping all existing tests green"\n\nor paste any existing prompt to expand and optimize it…`
              }
              className="font-mono text-xs leading-relaxed resize-none bg-muted/30 border-border/60 focus:border-primary/50 placeholder:text-muted-foreground/40 min-h-[100px]"
              style={{ height: "120px" }}
              disabled={isForging}
            />
            <p className="text-[10px] text-muted-foreground/50 font-mono text-right">
              ⌘↵ to forge
            </p>
          </div>

          {/* Forge button */}
          <Button
            onClick={handleForge}
            disabled={isForging || !rawPrompt.trim()}
            className="w-full gap-2 font-mono uppercase tracking-wider text-xs h-10"
          >
            {isForging ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Cpu className="w-4 h-4 shrink-0" />
                </motion.div>
                Forging…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 shrink-0" />
                Forge Prompt
              </>
            )}
          </Button>

          {/* Forging animation */}
          <AnimatePresence>
            {isForging && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-mono uppercase tracking-widest text-primary">Applying Translation Matrix</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Engineering Zero-HITL guardrails…</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && !isForging && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-3"
              >
                {/* Selected model + rationale */}
                <div className="flex items-start gap-3 bg-muted/40 rounded-lg px-3 py-2.5 border border-border/60">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Routed to</span>
                      <Badge variant="outline" className={`text-[10px] w-fit font-mono ${modelCfg.badge}`}>
                        {result.target_model}
                      </Badge>
                    </div>
                    {result.rationale && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{result.rationale}</p>
                    )}
                  </div>
                </div>

                {/* Terminal prompt block */}
                <div className="rounded-lg border border-[#30363d] overflow-hidden shadow-xl">
                  {/* Chrome */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                      </div>
                      <span className="text-[10px] font-mono text-[#8b949e] ml-1">
                        optimized_prompt · {result.target_model}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]"
                        onClick={handleReset}
                        title="Forge a new prompt"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]"
                        onClick={handleCopy}
                        title="Copy prompt"
                      >
                        {copied
                          ? <Check className="w-3 h-3 text-[#3fb950]" />
                          : <ClipboardCopy className="w-3 h-3" />
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Prompt body */}
                  <div className="bg-[#0d1117] px-4 py-3 max-h-[480px] overflow-y-auto">
                    <HighlightedPrompt text={result.optimized_prompt} />
                  </div>

                  {/* Copy confirmation strip */}
                  <AnimatePresence>
                    {copied && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-3 py-1.5 bg-[#0d1117] border-t border-[#30363d] flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-[#3fb950]" />
                        <span className="text-[10px] font-mono text-[#3fb950]">
                          Copied — paste into {result.target_model}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quick copy button below terminal */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="w-full gap-2 text-xs font-mono border-border/60"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Copied!</>
                    : <><ClipboardCopy className="w-3.5 h-3.5 shrink-0" /> Copy Optimized Prompt</>
                  }
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
