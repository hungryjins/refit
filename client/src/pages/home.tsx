import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signOutUser } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

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
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={signOutUser}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button onClick={signInWithGoogle} size="sm">
                구글 로그인
              </Button>
            )}
          </div>
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
              <h2 className="text-xl font-semibold mb-4">영어 회화 연습</h2>
              <p className="text-gray-600">
                AI와 함께 영어 표현을 연습하세요!
                {!isAuthenticated && " (게스트 모드: 데이터가 저장되지 않습니다)"}
              </p>
            </div>
          )}
          {activeTab === "expressions" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">나의 표현</h2>
              <p className="text-gray-600">
                {isAuthenticated 
                  ? "저장된 영어 표현들을 관리하세요." 
                  : "로그인하면 표현을 데이터베이스에 저장할 수 있습니다."}
              </p>
            </div>
          )}
          {activeTab === "repository" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">학습 진도</h2>
              <p className="text-gray-600">
                {isAuthenticated 
                  ? "학습 진행상황을 확인하세요." 
                  : "로그인하면 진도를 추적할 수 있습니다."}
              </p>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
