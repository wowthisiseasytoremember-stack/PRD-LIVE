import React from "react";
import { Project } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Plus, Trash2, Folder, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";

interface ProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  currentProjectId: number | null;
  onSelectProject: (id: number) => void;
  onNewProject: () => void;
  onDeleteProject: (id: number, e: React.MouseEvent) => void;
  isSyncing: boolean;
}

export default function ProjectDrawer({
  open,
  onOpenChange,
  projects,
  currentProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  isSyncing
}: ProjectDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent className="w-80 h-full bg-card border-r border-border rounded-none" data-testid="drawer-projects">
        <DrawerHeader className="border-b border-border text-left flex items-center justify-between">
          <DrawerTitle className="font-mono uppercase tracking-wider text-foreground">Projects</DrawerTitle>
          <Button variant="outline" size="sm" onClick={onNewProject} data-testid="button-new-project" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> New
          </Button>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {projects?.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center p-4">No projects yet.</div>
            ) : (
              projects?.map(project => (
                <div 
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group border ${
                    currentProjectId === project.id 
                      ? 'bg-primary/10 border-primary/30 text-primary' 
                      : 'bg-background hover:bg-accent border-transparent text-foreground hover:text-accent-foreground'
                  }`}
                  data-testid={`item-project-${project.id}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Folder className={`w-4 h-4 shrink-0 ${currentProjectId === project.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex flex-col items-start truncate">
                      <span className="text-sm font-medium truncate w-full">{project.title || `Project ${project.id}`}</span>
                      <span className="text-xs text-muted-foreground opacity-80">
                        {project.updatedAt ? format(new Date(project.updatedAt), "MMM d, h:mm a") : 'New'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => onDeleteProject(project.id, e)}
                    data-testid={`button-delete-project-${project.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background/50 h-14 flex items-center">
          {isSyncing ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Loader2 className="w-3 h-3 animate-spin" /> Syncing...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <div className="w-2 h-2 rounded-full bg-primary/50"></div> Synced
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
