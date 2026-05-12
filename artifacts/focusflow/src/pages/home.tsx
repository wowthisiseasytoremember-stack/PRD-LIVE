import React, { useState, useEffect, useRef, useCallback } from "react";
import { useListProjects, useCreateProject, useGetProject, useDeleteProject, useUpdateProject, getListProjectsQueryKey, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Project, ProjectWithMessages, ProjectState } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Terminal, MessageSquare, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  // Queries
  const { data: projects = [], isLoading: loadingProjects } = useListProjects();
  const { data: currentProject, isLoading: loadingProject } = useGetProject(currentProjectId as number, { 
    query: { enabled: !!currentProjectId, queryKey: getGetProjectQueryKey(currentProjectId as number) } 
  });

  // Mutations
  const createProjectMut = useCreateProject();
  const deleteProjectMut = useDeleteProject();
  const updateProjectMut = useUpdateProject();

  // Local state for optimistic updates during streaming/toggling
  const [localProjectState, setLocalProjectState] = useState<ProjectState | null>(null);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<any[]>([]);

  // Initialize new project if none exists on load
  useEffect(() => {
    if (!loadingProjects && projects.length === 0 && !currentProjectId) {
      handleNewProject();
    } else if (!loadingProjects && projects.length > 0 && !currentProjectId) {
      setCurrentProjectId(projects[0].id);
    }
  }, [projects, loadingProjects, currentProjectId]);

  // Sync local state when project changes
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
    } catch (e) {
      toast({ title: "Error creating project", variant: "destructive" });
    }
  };

  const handleSelectProject = (id: number) => {
    setCurrentProjectId(id);
    setDrawerOpen(false);
    setMobileTab("chat");
  };

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProjectMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      if (currentProjectId === id) {
        setCurrentProjectId(projects.find(p => p.id !== id)?.id || null);
      }
    } catch (e) {
      toast({ title: "Error deleting project", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (sessionId: string) => {
    if (!currentProjectId) return;
    
    const newCompleted = completedSessions.includes(sessionId)
      ? completedSessions.filter(id => id !== sessionId)
      : [...completedSessions, sessionId];
      
    setCompletedSessions(newCompleted);
    setIsSyncing(true);
    
    try {
      await updateProjectMut.mutateAsync({ 
        id: currentProjectId, 
        data: { completedSessions: newCompleted } 
      });
      // Patch cache
      queryClient.setQueryData(getGetProjectQueryKey(currentProjectId), (old: any) => 
        old ? { ...old, completedSessions: newCompleted } : old
      );
    } catch (e) {
      toast({ title: "Error updating session", variant: "destructive" });
      setCompletedSessions(completedSessions); // revert
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentProjectId) return;
    
    const BASE = import.meta.env.BASE_URL;
    setIsStreaming(true);
    setStreamingContent("");
    setIsSyncing(true);

    // Optimistic UI for user message
    const tempUserMsg = { id: Date.now(), projectId: currentProjectId, role: "user", content, createdAt: new Date().toISOString() };
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
      let finalProjectState = null;

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
                setLocalProjectState(finalProjectState);
                if (mobileTab === "chat") {
                    // Pulsing dot logic will be handled by UI observing projectState.sessions vs completed
                }
              }
              if (json.done) {
                // Done parsing
              }
            } catch (err) {
              console.error("Error parsing SSE line", err);
            }
          }
        }
      }

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(currentProjectId) });
      
    } catch (e) {
      toast({ title: "Error communicating with AI", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setIsSyncing(false);
    }
  };

  // Has available sessions (for mobile notification dot)
  const hasSessions = localProjectState?.sessions && localProjectState.sessions.length > 0;
  const uncompletedCount = localProjectState?.sessions?.filter(s => !completedSessions.includes(s.id)).length || 0;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground flex-col md:flex-row font-sans">
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
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} data-testid="button-menu" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none tracking-wide">FocusFlow</span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">Tri_Model_Orchestrator</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center">
             <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} data-testid="button-menu-desktop" className="text-muted-foreground hover:text-foreground">
               <Menu className="w-5 h-5" />
             </Button>
          </div>

          {/* Mobile Tabs */}
          <div className="flex md:hidden bg-muted/50 p-1 rounded-md border border-border">
            <Button 
              variant={mobileTab === "chat" ? "default" : "ghost"} 
              size="sm" 
              className={`h-7 px-3 text-xs ${mobileTab === 'chat' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setMobileTab("chat")}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Chat
            </Button>
            <Button 
              variant={mobileTab === "board" ? "default" : "ghost"} 
              size="sm" 
              className={`h-7 px-3 text-xs relative ${mobileTab === 'board' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setMobileTab("board")}
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Board
              {hasSessions && uncompletedCount > 0 && mobileTab === "chat" && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              )}
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left Panel (Chat) */}
          <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[45%] lg:w-[40%] h-full shrink-0 z-10`}>
            <ChatPanel 
              messages={localMessages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              onSendMessage={handleSendMessage}
            />
          </div>

          {/* Right Panel (Board) */}
          <div className={`${mobileTab === 'board' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[55%] lg:w-[60%] h-full bg-card shrink-0`}>
            <BlueprintBoard 
              projectState={localProjectState}
              completedSessions={completedSessions}
              onToggleComplete={handleToggleComplete}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
