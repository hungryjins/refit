import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful! 🎉",
        description: "Welcome!",
      });
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Failed to sign in.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(result.user, { displayName });
      toast({
        title: "Sign Up Successful! 🎉",
        description: "Account created successfully.",
      });
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to sign up.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Sign Out Complete",
        description: "You have been safely signed out.",
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        title: "Sign Out Failed",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Google Login Successful! 🎉",
        description: "Welcome!",
      });
    } catch (error: any) {
      console.error("Google sign in error:", error);
      toast({
        title: "Google Login Failed",
        description: error.message || "Failed to sign in with Google.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOutUser,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
