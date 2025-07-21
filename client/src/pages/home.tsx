import { useState } from "react";
import { motion } from "framer-motion";
import NavigationHeader from "@/components/navigation-header";
import PracticeChatInterface from "@/components/practice-chat-interface";
import ExpressionManager from "@/components/expression-manager";
import ProgressRepository from "@/components/progress-repository";
import FloatingActionButton from "@/components/floating-action-button";
import AdSenseContainer from "@/components/adsense-container";
import { useLanguage } from "@/contexts/language-context";

type Tab = "chat" | "expressions" | "repository";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const { t } = useLanguage();

  const tabs = [
    { id: "chat", label: t('nav.practice'), icon: "💬" },
    { id: "expressions", label: t('nav.expressions'), icon: "📚" },
    { id: "repository", label: t('nav.progress'), icon: "📊" },
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

        {/* Main Content Area with Ads */}
        <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "chat" && <PracticeChatInterface />}
              {activeTab === "expressions" && <ExpressionManager />}
              {activeTab === "repository" && <ProgressRepository />}
            </motion.div>
          </div>

          {/* Sidebar with Ads */}
          <div className="lg:col-span-1 space-y-4">
            {/* Top Ad */}
            <AdSenseContainer 
              slot="1234567890"
              format="auto"
              style="minimal"
              className="sticky top-20"
            />
            
            {/* Middle Ad (only on larger screens) */}
            <div className="hidden lg:block">
              <AdSenseContainer 
                slot="1234567891" 
                format="vertical"
                style="gradient"
              />
            </div>
          </div>
        </div>

        {/* Bottom Banner Ad (mobile friendly) */}
        <div className="sticky bottom-0 bg-white border-t lg:hidden">
          <AdSenseContainer 
            slot="1234567892"
            format="horizontal"
            style="outlined"
            className="mx-4 my-2"
          />
        </div>
      </div>

      <FloatingActionButton onAdd={() => setActiveTab("expressions")} />
    </div>
  );
}
