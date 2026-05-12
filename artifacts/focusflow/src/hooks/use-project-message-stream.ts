import { useCallback } from "react";
import { ProjectMessage, ProjectState } from "@workspace/api-client-react";

interface SendProjectMessageInput {
  projectId: number;
  content: string;
  onStatus?: (status: string) => void;
  onContent?: (content: string) => void;
  onAssistantMessage?: (message: ProjectMessage) => void;
  onProjectState?: (state: ProjectState) => void;
}

interface SendProjectMessageResult {
  assistantContent: string;
  projectState: ProjectState | null;
}

interface StreamEvent {
  content?: string;
  status?: string;
  assistant_content?: string;
  project_state?: ProjectState;
  error?: string;
}

function parseStreamEvent(line: string): StreamEvent | null {
  if (!line.startsWith("data: ")) return null;

  try {
    return JSON.parse(line.slice(6)) as StreamEvent;
  } catch {
    return null;
  }
}

export function useProjectMessageStream() {
  return useCallback(
    async ({
      projectId,
      content,
      onStatus,
      onContent,
      onAssistantMessage,
      onProjectState,
    }: SendProjectMessageInput): Promise<SendProjectMessageResult> => {
      const basePath = import.meta.env.BASE_URL;
      const response = await fetch(
        `${basePath}api/projects/${projectId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to send message (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response body returned");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let projectState: ProjectState | null = null;

      const handleEvent = (event: StreamEvent) => {
        if (event.error) {
          throw new Error(event.error);
        }

        if (event.status) {
          onStatus?.(event.status);
        }

        if (event.content) {
          assistantContent += event.content;
          onContent?.(assistantContent);
        }

        if (event.assistant_content) {
          assistantContent = event.assistant_content;
          onAssistantMessage?.({
            id: Date.now() + 1,
            projectId,
            role: "assistant",
            content: event.assistant_content,
            createdAt: new Date().toISOString(),
          });
        }

        if (event.project_state) {
          projectState = event.project_state;
          onProjectState?.(event.project_state);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseStreamEvent(line);
          if (event) handleEvent(event);
        }
      }

      const remainingEvent = parseStreamEvent(buffer.trim());
      if (remainingEvent) handleEvent(remainingEvent);

      return { assistantContent, projectState };
    },
    [],
  );
}
