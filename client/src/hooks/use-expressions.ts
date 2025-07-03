import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Expression } from "@shared/schema";

export function useExpressions() {
  const queryClient = useQueryClient();
  
  const query = useQuery<Expression[]>({
    queryKey: ["/api/expressions"],
  });

  return {
    expressions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["/api/expressions"] }),
  };
}
