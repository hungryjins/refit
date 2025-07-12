import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Also fetch user data from backend to sync with database
  const { data: userInfo } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !isLoading, // Only fetch after Firebase auth state is determined
    retry: false,
  });

  return {
    user,
    userInfo,
    isLoading,
    isAuthenticated: !!user,
    isGuest: !user,
  };
}