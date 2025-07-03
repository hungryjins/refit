import { useQuery } from "@tanstack/react-query";
import type { UserStats, Achievement } from "@shared/schema";

export function useProgress() {
  const statsQuery = useQuery<UserStats>({
    queryKey: ["/api/stats"],
  });

  const achievementsQuery = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
  });

  return {
    stats: statsQuery.data,
    achievements: achievementsQuery.data || [],
    isLoading: statsQuery.isLoading || achievementsQuery.isLoading,
    error: statsQuery.error || achievementsQuery.error,
  };
}
