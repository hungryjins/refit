import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signOutUser } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";
import NewChatInterface from "@/components/new-chat-interface";
import ExpressionManager from "@/components/expression-manager";
import ProgressRepository from "@/components/progress-repository";

type Tab = "chat" | "expressions" | "repository";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: "chat", label: "Practice", icon: "💬" },
    { id: "expressions", label: "Expressions", icon: "📚" },
    { id: "repository", label: "Progress", icon: "📊" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Modern Header */}
      <div className="backdrop-blur-md bg-white/10 border-b border-white/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">DC</span>
            </div>
            <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              Daily Convo
            </h1>
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs font-semibold px-3 py-1 rounded-full border-0 ml-2">
              AI Powered
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{user?.email}</div>
                  <div className="text-xs text-purple-300">Premium Member</div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={signOutUser}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button 
                onClick={signInWithGoogle} 
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg"
              >
                <User className="w-4 h-4 mr-2" />
                구글 로그인
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="backdrop-blur-lg bg-white/10 rounded-3xl shadow-2xl p-3 mb-8 border border-white/20"
        >
          <div className="flex space-x-3">
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex-1 py-4 px-6 rounded-2xl font-semibold transition-all duration-300 relative overflow-hidden ${
                  activeTab === tab.id
                    ? "text-white shadow-xl"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                  <span className="text-2xl">{tab.icon}</span>
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative backdrop-blur-lg bg-white/5 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
        >
          <div className="p-6">
            {activeTab === "chat" && <NewChatInterface />}
            {activeTab === "expressions" && <ExpressionManager />}
            {activeTab === "repository" && <ProgressRepository />}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
