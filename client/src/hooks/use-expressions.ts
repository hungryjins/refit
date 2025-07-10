import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Expression, InsertExpression } from "@shared/schema";

export function useExpressions() {
  const queryClient = useQueryClient();
  
  const query = useQuery<Expression[]>({
    queryKey: ["/api/expressions"],
  });

  const updateExpressionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertExpression>) => {
      const response = await apiRequest("PATCH", `/api/expressions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expressions"] });
    },
  });

  const deleteExpressionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/expressions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expressions"] });
    },
  });

  return {
    expressions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["/api/expressions"] }),
    updateExpression: updateExpressionMutation.mutate,
    deleteExpression: deleteExpressionMutation.mutate,
    isUpdating: updateExpressionMutation.isPending,
    isDeleting: deleteExpressionMutation.isPending,
  };
}
