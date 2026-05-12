import React, { useRef, useEffect } from "react";
import { ProjectMessage } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatPanelProps {
  messages: ProjectMessage[];
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (content: string) => void;
}

function MessageBubble({ role, content, isStreaming }: { role: string; content: string; isStreaming?: boolean }) {
  const isUser = role === "user";
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      data-testid={`chat-message-${role}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-secondary' : 'bg-primary'}`}>
        <div className="w-3 h-3 rounded-full bg-background" />
      </div>
      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          {isUser ? 'You' : 'Orchestrator'}
        </div>
        <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${isUser ? 'bg-secondary/10 border border-secondary/20 text-secondary-foreground' : 'bg-card border border-border text-card-foreground'}`}>
          {content}
          {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPanel({ messages, isStreaming, streamingContent, onSendMessage }: ChatPanelProps) {
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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
    <div className="flex flex-col h-full bg-background border-r border-border relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
        {messages.length === 0 && !streamingContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-muted-foreground opacity-60">
            <Sparkles className="w-12 h-12 text-primary mb-2" />
            <p className="text-lg font-medium text-foreground">Tri-Model Orchestration</p>
            <p className="text-sm">Describe your project idea. FocusFlow will act as a Socratic project manager, breaking it down into 45-90 minute execution sessions and routing each to the optimal AI model.</p>
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
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
          <div className="relative flex items-end gap-2 bg-card rounded-lg border border-border p-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Describe your project idea..."
              className="min-h-[44px] max-h-[150px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-2.5 px-3 scrollbar-hide text-sm"
              rows={1}
              data-testid="input-chat"
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!input.trim() || isStreaming}
              className="shrink-0 mb-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
