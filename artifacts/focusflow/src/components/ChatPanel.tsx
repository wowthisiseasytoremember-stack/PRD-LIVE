import React, { useRef, useEffect } from "react";
import { ProjectMessage } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Cpu } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatPanelProps {
  messages: ProjectMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isBuildMode: boolean;
  onSendMessage: (content: string) => void;
}

function MessageBubble({ role, content, isStreaming }: { role: string; content: string; isStreaming?: boolean }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 mb-5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-secondary/80' : 'bg-primary/20 border border-primary/40'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${isUser ? 'bg-background' : 'bg-primary'}`} />
      </div>
      <div className={`flex flex-col gap-1 min-w-0 ${isUser ? 'items-end' : 'items-start'} max-w-[88%]`}>
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider px-1">
          {isUser ? 'You' : 'Orchestrator'}
        </div>
        <div className={`px-3 py-2.5 rounded-lg text-sm whitespace-pre-wrap leading-relaxed break-words ${
          isUser
            ? 'bg-secondary/10 border border-secondary/20 text-secondary-foreground'
            : 'bg-card border border-border text-card-foreground'
        }`}>
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle rounded-sm" />
          )}
        </div>
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border relative overflow-hidden">
      {/* Messages area — fades/shrinks during build mode */}
      <AnimatePresence mode="wait">
        {isBuildMode ? (
          <motion.div
            key="build-status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center"
          >
            <div className="relative">
              <Cpu className="w-8 h-8 text-primary opacity-60" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-widest text-primary">Orchestrating</p>
              <p className="text-[11px] text-muted-foreground">Blueprint building →</p>
            </div>
            {/* Last user message preview */}
            {messages.length > 0 && (
              <div className="mt-2 w-full text-left bg-card/50 border border-border rounded-lg p-2.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {messages[messages.length - 1]?.content}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chat-messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-4 md:p-5"
            ref={scrollRef}
          >
            {messages.length === 0 && !streamingContent ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-3 text-muted-foreground opacity-60">
                <Sparkles className="w-10 h-10 text-primary mb-1" />
                <p className="text-base font-medium text-foreground">Tri-Model Orchestration</p>
                <p className="text-xs leading-relaxed">Describe your project. FocusFlow will Socratically break it into 45–90 min sessions and route each to the best AI model.</p>
              </div>
            ) : (
              <div className="flex flex-col pb-4">
                {messages.map((msg, i) => (
                  <MessageBubble key={msg.id || i} role={msg.role} content={msg.content} />
                ))}
                {streamingContent && (
                  <MessageBubble role="assistant" content={streamingContent} isStreaming={true} />
                )}
                {isStreaming && !streamingContent && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs font-mono">Thinking...</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar — always visible */}
      <div className="p-3 border-t border-border bg-background/80 backdrop-blur-md shrink-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-20 group-focus-within:opacity-50 transition duration-500" />
          <div className="relative flex items-end gap-2 bg-card rounded-lg border border-border p-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isBuildMode ? "Continue or ask a follow-up..." : "Describe your project idea..."}
              className="min-h-[40px] max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-2 px-2 scrollbar-hide text-sm"
              rows={1}
              disabled={isStreaming}
              data-testid="input-chat"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 mb-0.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground w-8 h-8"
              data-testid="button-send"
            >
              {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
