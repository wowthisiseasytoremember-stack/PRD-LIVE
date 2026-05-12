import React, { useState, useEffect, useCallback } from "react";
import {
  useListProjects, useCreateProject, useGetProject, useDeleteProject,
  useUpdateProject, getListProjectsQueryKey, getGetProjectQueryKey,
  ProjectState, Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Terminal, MessageSquare, LayoutDashboard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

import ProjectDrawer from "@/components/ProjectDrawer";
import ChatPanel from "@/components/ChatPanel";
import BlueprintBoard from "@/components/BlueprintBoard";

type TabView = "chat" | "board";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<TabView>("chat");
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const [isBlueprintNew, setIsBlueprintNew] = useState(true);

  const { data: projects = [], isLoading: loadingProjects } = useListProjects();
  const { data: currentProject } = useGetProject(currentProjectId as number, {
    query: { enabled: !!currentProjectId, queryKey: getGetProjectQueryKey(currentProjectId as number) },
  });

  const createProjectMut = useCreateProject();
  const deleteProjectMut = useDeleteProject();
  const updateProjectMut = useUpdateProject();

  const [localProjectState, setLocalProjectState] = useState<ProjectState | null>(null);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [blueprintVersion, setBlueprintVersion] = useState(0);

  useEffect(() => {
    if (!loadingProjects && projects.length === 0 && !currentProjectId) {
      handleNewProject();
    } else if (!loadingProjects && projects.length > 0 && !currentProjectId) {
      setCurrentProjectId(projects[0].id);
    }
  }, [projects, loadingProjects, currentProjectId]);

  useEffect(() => {
    if (currentProject) {
      setLocalProjectState(currentProject.projectState || null);
      setCompletedSessions(currentProject.completedSessions || []);
      setLocalMessages(currentProject.messages || []);
    } else {
      setLocalProjectState(null);
      setCompletedSessions([]);
      setLocalMessages([]);
    }
  }, [currentProject]);

  const handleNewProject = async () => {
    try {
      const newProj = await createProjectMut.mutateAsync({ data: { title: "New Project" } });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setCurrentProjectId(newProj.id);
      setDrawerOpen(false);
    } catch {
      toast({ title: "Error creating project", variant: "destructive" });
    }
  };

  const handleSelectProject = (id: number) => {
    setCurrentProjectId(id);
    setDrawerOpen(false);
    setMobileTab("chat");
    setBuildMode(false);
  };

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProjectMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      if (currentProjectId === id) {
        setCurrentProjectId(projects.find((p: Project) => p.id !== id)?.id || null);
      }
    } catch {
      toast({ title: "Error deleting project", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (sessionId: string) => {
    if (!currentProjectId) return;
    const newCompleted = completedSessions.includes(sessionId)
      ? completedSessions.filter((id: string) => id !== sessionId)
      : [...completedSessions, sessionId];
    setCompletedSessions(newCompleted);
    setIsSyncing(true);
    try {
      await updateProjectMut.mutateAsync({ id: currentProjectId, data: { completedSessions: newCompleted } });
      queryClient.setQueryData(getGetProjectQueryKey(currentProjectId), (old: any) =>
        old ? { ...old, completedSessions: newCompleted } : old,
      );
    } catch {
      toast({ title: "Error updating session", variant: "destructive" });
      setCompletedSessions(completedSessions);
    } finally {
      setIsSyncing(false);
    }
  };

  // Core send — isAnnotation controls whether stagger replays
  const handleSendMessage = async (content: string, isAnnotation = false) => {
    if (!currentProjectId) return;
    const BASE = import.meta.env.BASE_URL;

    setIsStreaming(true);
    setBuildMode(true);
    setIsBlueprintNew(!isAnnotation);
    setStreamingContent("");
    setIsSyncing(true);
    if (mobileTab === "chat") setMobileTab("board");

    const tempUserMsg = {
      id: Date.now(), projectId: currentProjectId,
      role: "user", content, createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`${BASE}api/projects/${currentProjectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullAssistantContent = "";
      let finalProjectState: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.content) {
                fullAssistantContent += json.content;
                setStreamingContent(fullAssistantContent);
              }
              if (json.project_state) {
                finalProjectState = json.project_state;
                setLocalProjectState(json.project_state);
                setBlueprintVersion(v => v + 1);
              }
            } catch { /* partial line */ }
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(currentProjectId) });

      // Auto-rename "New Project" → derived from goal after first blueprint
      if (!isAnnotation && finalProjectState?.goal) {
        const cached = queryClient.getQueryData(getGetProjectQueryKey(currentProjectId)) as any;
        if (cached?.title === "New Project") {
          const derived = finalProjectState.goal.length > 52
            ? finalProjectState.goal.slice(0, 49).trimEnd() + "…"
            : finalProjectState.goal;
          await updateProjectMut.mutateAsync({ id: currentProjectId, data: { title: derived } });
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        }
      }
    } catch {
      toast({ title: "Error communicating with AI", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setIsSyncing(false);
      setTimeout(() => setBuildMode(false), 800);
    }
  };

  const handleSendAnnotation = (elementLabel: string, comment: string) => {
    toast({ title: `Feedback sent`, description: `Re: ${elementLabel}` });
    handleSendMessage(`[Feedback on "${elementLabel}"]: ${comment}`, true);
  };

  const hasSessions = localProjectState?.sessions && localProjectState.sessions.length > 0;
  const uncompletedCount = localProjectState?.sessions?.filter((s: any) => !completedSessions.includes(s.id)).length || 0;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground flex-col font-sans">
      <ProjectDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onDeleteProject={handleDeleteProject}
        isSyncing={isSyncing}
      />

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card z-10 relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} className="md:hidden shrink-0">
              <Menu className="w-5 h-5 shrink-0" />
            </Button>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none tracking-wide">FocusFlow</span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">Tri_Model_Orchestrator</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} className="text-muted-foreground hover:text-foreground shrink-0">
              <Menu className="w-5 h-5 shrink-0" />
            </Button>
          </div>

          {/* Mobile tabs */}
          <div className="flex md:hidden bg-muted/50 p-1 rounded-md border border-border">
            <Button
              variant={mobileTab === "chat" ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-3 text-xs ${mobileTab === "chat" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setMobileTab("chat")}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Chat
            </Button>
            <Button
              variant={mobileTab === "board" ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-3 text-xs relative ${mobileTab === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setMobileTab("board")}
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Board
              {hasSessions && uncompletedCount > 0 && mobileTab === "chat" && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              )}
            </Button>
          </div>
        </header>

        {/* Main panels — spring-animated width */}
        <div className="flex-1 flex overflow-hidden relative">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 320, damping: 38 }}
            className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex flex-col h-full shrink-0 z-10 overflow-hidden`}
            style={{ width: buildMode ? "28%" : "42%" }}
          >
            <ChatPanel
              messages={localMessages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              isBuildMode={buildMode}
              onSendMessage={handleSendMessage}
            />
          </motion.div>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 320, damping: 38 }}
            className={`${mobileTab === "board" ? "flex" : "hidden"} md:flex flex-col h-full`}
            style={{ width: buildMode ? "72%" : "58%" }}
          >
            <BlueprintBoard
              projectState={localProjectState}
              completedSessions={completedSessions}
              onToggleComplete={handleToggleComplete}
              isStreaming={isStreaming}
              blueprintVersion={blueprintVersion}
              isBlueprintNew={isBlueprintNew}
              onSendAnnotation={handleSendAnnotation}
            />
          </motion.div>
        </div>
      </div>

      {/* Mobile "Return to Chat" FAB — shows when board is active during build */}
      <AnimatePresence>
        {mobileTab === "board" && (
          <motion.button
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => setMobileTab("chat")}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-primary/40 shadow-xl shadow-black/40 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-primary shrink-0" />
            {isStreaming ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary ping-glow" />
                Building…
              </span>
            ) : "Return to Chat"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
