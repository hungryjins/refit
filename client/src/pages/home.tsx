import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Daily Convo</h1>
          {isAuthenticated && (
            <div className="text-sm text-gray-600">
              Welcome, {user?.email}
            </div>
          )}
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? "text-white shadow-md bg-blue-500"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {activeTab === "chat" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Practice Chat</h2>
              <p className="text-gray-600">
                {isAuthenticated 
                  ? "Start practicing English expressions with AI chat!" 
                  : "Sign in to save your progress, or continue as a guest."}
              </p>
            </div>
          )}
          {activeTab === "expressions" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Your Expressions</h2>
              <p className="text-gray-600">
                {isAuthenticated 
                  ? "Manage your saved expressions here." 
                  : "Sign in to save and manage expressions."}
              </p>
            </div>
          )}
          {activeTab === "repository" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Progress</h2>
              <p className="text-gray-600">
                {isAuthenticated 
                  ? "Track your learning progress." 
                  : "Sign in to see your progress and statistics."}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
