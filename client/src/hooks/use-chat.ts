import { useQuery, useMutation } from "@tanstack/react-query";
import { api, queryClient } from "@/lib/api";
import type { ChatSession } from "@shared/schema";

export function useChatSession() {
  const { data: activeSession } = useQuery({
    queryKey: ["chat-active"],
    queryFn: async () => {
      const response = await api.chat.getSessions();
      return (response as any)?.data;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (): Promise<ChatSession> => {
      const response = await api.chat.startSession({ 
        selectedExpressions: []
      });
      return (response as any)?.data || {} as ChatSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-active"] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.chat.endSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-active"] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
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