import React, { useRef, useEffect } from "react";
import { ProjectMessage } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Cpu, MessageSquarePlus } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
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
          <div className="relative group">
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
