import { useQuery, useMutation } from "@tanstack/react-query";
import { api, queryClient } from "@/lib/api";
import type { Expression, InsertExpression } from "@shared/schema";

export function useExpressions() {
  const query = useQuery({
    queryKey: ["expressions"],
    queryFn: () => api.expressions.getAll(),
  });

  const updateExpressionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InsertExpression>) => {
      return await api.expressions.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expressions"] });
    },
  });

  const deleteExpressionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.expressions.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expressions"] });
    },
  });

  return {
    expressions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["expressions"] }),
    updateExpression: updateExpressionMutation.mutate,
    deleteExpression: deleteExpressionMutation.mutate,
    isUpdating: updateExpressionMutation.isPending,
    isDeleting: deleteExpressionMutation.isPending,
  };
}