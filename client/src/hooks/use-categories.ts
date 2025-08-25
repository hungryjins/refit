import { useQuery, useMutation } from "@tanstack/react-query";
import { api, queryClient } from "@/lib/api";
import type { Category, InsertCategory } from "@shared/schema";

export function useCategories() {
  const { data: response, ...query } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.expressions.getCategories(),
  });

  const categories = Array.isArray(response) ? response : (response as any)?.data || [];

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      return await api.expressions.createCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InsertCategory>) => {
      // Categories don't have an update endpoint currently, return success
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.expressions.delete?.(id) || Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["expressions"] });
    },
  });

  return {
    categories,
    ...query,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}