import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Clipboard, Copy, Sparkles, WandSparkles } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PROMPT_MODEL_OPTIONS, PromptModel, rewritePromptForModel } from "@/lib/prompt-rewriter";

export default function PromptGenerator() {
  const { toast } = useToast();
  const [sourcePrompt, setSourcePrompt] = React.useState("");
  const [targetModel, setTargetModel] = React.useState<PromptModel>("auto");
  const [rewrittenPrompt, setRewrittenPrompt] = React.useState("");
  const [rewriteLabel, setRewriteLabel] = React.useState("Waiting for a prompt");

  const selectedOption = PROMPT_MODEL_OPTIONS.find((option) => option.value === targetModel) ?? PROMPT_MODEL_OPTIONS[0];

  const handleGenerate = () => {
    if (!sourcePrompt.trim()) return;
    const result = rewritePromptForModel(sourcePrompt, targetModel);
    setRewrittenPrompt(result.prompt);
    setRewriteLabel(targetModel === "auto" ? `Auto picked ${result.label}` : `Rewritten for ${result.label}`);
  };

  const handleCopy = async () => {
    if (!rewrittenPrompt.trim()) return;
    await navigator.clipboard.writeText(rewrittenPrompt);
    toast({ title: "Prompt copied", description: "Paste it into your target model or send it back to FocusFlow." });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <WandSparkles className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold leading-none tracking-wide">Standalone Prompt Generator</h1>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Model-aware rewrite workspace</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="hidden border-primary/30 bg-primary/10 text-primary sm:inline-flex">
            /prompt-generator
          </Badge>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="h-full border-border/80 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clipboard className="h-4 w-4 text-primary" />
                Source prompt
              </CardTitle>
              <CardDescription>
                Paste the master prompt or rough request here, choose a target model style, then generate a rewritten version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="prompt-model" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Target model
                </label>
                <select
                  id="prompt-model"
                  value={targetModel}
                  onChange={(event) => setTargetModel(event.target.value as PromptModel)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  data-testid="select-standalone-prompt-model"
                >
                  {PROMPT_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{selectedOption.helper}</p>
              </div>

              <Textarea
                value={sourcePrompt}
                onChange={(event) => setSourcePrompt(event.target.value)}
                placeholder="Paste your prompt here…"
                className="min-h-[360px] resize-y border-border bg-background/80 text-sm leading-relaxed"
                data-testid="textarea-source-prompt"
              />

              <Button
                onClick={handleGenerate}
                disabled={!sourcePrompt.trim()}
                className="w-full gap-2"
                data-testid="button-generate-standalone-prompt"
              >
                <Sparkles className="h-4 w-4" />
                Generate improved prompt
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
          <Card className="h-full border-primary/20 bg-card/80">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <WandSparkles className="h-4 w-4 text-primary" />
                    Rewritten prompt
                  </CardTitle>
                  <CardDescription>{rewriteLabel}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!rewrittenPrompt.trim()}
                  className="gap-2 border-primary/30 text-primary"
                  data-testid="button-copy-standalone-prompt"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rewrittenPrompt}
                onChange={(event) => setRewrittenPrompt(event.target.value)}
                placeholder="Your rewritten prompt will appear here. You can edit it before copying."
                className="min-h-[500px] resize-y border-border bg-background/80 font-mono text-xs leading-relaxed"
                data-testid="textarea-rewritten-prompt"
              />
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
}
