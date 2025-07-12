import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signOutUser } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Daily Convo</h1>
        <p className="text-gray-600 mb-8">Practice English conversation with AI</p>
        <div className="space-y-4">
          <Button onClick={signInWithGoogle} size="lg">
            Sign in with Google
          </Button>
          <div className="text-sm text-gray-500">
            You can also continue as a guest (data won't be saved)
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Continue as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {isAuthenticated && (
        <div className="p-4 bg-blue-50 text-blue-800 flex justify-between items-center">
          <span>Welcome, {user?.email}!</span>
          <Button variant="outline" size="sm" onClick={signOutUser}>
            Sign Out
          </Button>
        </div>
      )}
      
      {!isAuthenticated && (
        <div className="p-4 bg-yellow-50 text-yellow-800 text-center">
          You're using the app as a guest. Your data won't be saved. 
          <Button variant="link" onClick={signInWithGoogle} className="ml-2">
            Sign in with Google to save your progress
          </Button>
          <div className="text-xs mt-2 text-gray-600">
            Note: Google sign-in requires Firebase Authentication to be enabled in the console
          </div>
        </div>
      )}
      
      <AuthenticatedApp />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
