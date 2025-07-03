import { useState } from "react";
import { motion } from "framer-motion";
import NavigationHeader from "@/components/navigation-header";
import ChatInterface from "@/components/chat-interface";
import ExpressionManager from "@/components/expression-manager";
import ProgressRepository from "@/components/progress-repository";
import FloatingActionButton from "@/components/floating-action-button";

type Tab = "chat" | "expressions" | "repository";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  const tabs = [
    { id: "chat", label: "Practice Chat", icon: "💬" },
    { id: "expressions", label: "My Expressions", icon: "📚" },
    { id: "repository", label: "Progress", icon: "📊" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
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
                    ? "text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 gradient-primary rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "chat" && <ChatInterface />}
          {activeTab === "expressions" && <ExpressionManager />}
          {activeTab === "repository" && <ProgressRepository />}
        </motion.div>
      </div>

      <FloatingActionButton onAdd={() => setActiveTab("expressions")} />
    </div>
  );
}
