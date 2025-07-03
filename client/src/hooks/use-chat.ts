import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatSession, InsertChatSession } from "@shared/schema";

export function useChatSession() {
  const queryClient = useQueryClient();
  
  const { data: activeSession } = useQuery<ChatSession | null>({
    queryKey: ["/api/chat/active"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (scenario: string): Promise<ChatSession> => {
      const data: InsertChatSession = { scenario };
      const response = await apiRequest("POST", "/api/chat/sessions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("PATCH", `/api/chat/sessions/${sessionId}/end`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
    },
  });

  return {
    activeSession,
    createSession: createSessionMutation.mutateAsync,
    endSession: endSessionMutation.mutateAsync,
    isCreating: createSessionMutation.isPending,
    isEnding: endSessionMutation.isPending,
  };
}
