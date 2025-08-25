import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PracticeModeSelector, { PracticeMode } from "./practice-mode-selector";
import NewChatInterface from "./new-chat-interface"; // Modified Original Chat
import AIConversationChat from "./ai-conversation-chat"; // New AI Conversation
import FriendsScriptChat from "./friends-script-chat"; // New Friends Script
import type { Expression, Category } from "@shared/schema";

export default function PracticeChatInterface() {
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<Expression[]>(
    []
  );
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);

  const { data: expressions = [] } = useQuery<Expression[]>({
    queryKey: ["/api/expressions"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/expressions/categories"],
  });

  const handleModeSelect = (mode: PracticeMode) => {
    setSelectedMode(mode);
    setShowExpressionSelector(true);
  };

  const handleBack = () => {
    setSelectedMode(null);
    setShowExpressionSelector(false);
    setSelectedExpressions([]);
  };

  const handleStartPractice = (expressions: Expression[]) => {
    setSelectedExpressions(expressions);
    setShowExpressionSelector(false);
  };

  // Mode selection screen
  if (!selectedMode) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <PracticeModeSelector
          onModeSelect={handleModeSelect}
          selectedMode={selectedMode}
        />
      </div>
    );
  }

  // Expression selection screen
  if (showExpressionSelector) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <ExpressionSelector
          expressions={expressions}
          categories={categories}
          selectedMode={selectedMode}
          onBack={handleBack}
          onStart={handleStartPractice}
        />
      </div>
    );
  }

  // Render chat interface based on selected mode
  if (selectedMode === "original") {
    return (
      <div className="container mx-auto px-4 py-8">
        <NewChatInterface />
      </div>
    );
  }

  if (selectedMode === "ai-conversation") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AIConversationChat
          selectedExpressions={selectedExpressions}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (selectedMode === "friends-script") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <FriendsScriptChat
          selectedExpressions={selectedExpressions}
          onBack={handleBack}
        />
      </div>
    );
  }

  return null;
}

// Expression selection component
interface ExpressionSelectorProps {
  expressions: Expression[];
  categories: Category[];
  selectedMode: PracticeMode;
  onBack: () => void;
  onStart: (expressions: Expression[]) => void;
}

function ExpressionSelector({
  expressions,
  categories,
  selectedMode,
  onBack,
  onStart,
}: ExpressionSelectorProps) {
  const [selectedExpressionIds, setSelectedExpressionIds] = useState<string[]>(
    []
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const filteredExpressions = selectedCategoryId
    ? expressions.filter((expr) => expr.categoryId === selectedCategoryId)
    : expressions;

  const selectedExpressions = expressions.filter((expr) =>
    selectedExpressionIds.includes(expr.id)
  );

  const handleExpressionToggle = (expressionId: string) => {
    setSelectedExpressionIds((prev) =>
      prev.includes(expressionId)
        ? prev.filter((id) => id !== expressionId)
        : [...prev, expressionId]
    );
  };

  const handleStart = () => {
    if (selectedExpressions.length === 0) return;
    onStart(selectedExpressions);
  };

  const getModeTitle = () => {
    switch (selectedMode) {
      case "original":
        return "Original Chat";
      case "ai-conversation":
        return "AI Conversation";
      case "friends-script":
        return "Friends Script";
      default:
        return "Practice Mode";
    }
  };

  const getModeDescription = () => {
    switch (selectedMode) {
      case "original":
        return "Scenario-based practice with existing expressions";
      case "ai-conversation":
        return "Expression practice through free conversation with AI";
      case "friends-script":
        return "Real situation practice through RAG-based dialogue scripts";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to mode selection
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{getModeTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {getModeDescription()}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category filter */}
          <div className="space-y-2">
            <h3 className="font-medium">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategoryId === null
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategoryId === category.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Expression selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Select Expressions to Practice</h3>
              <span className="text-sm text-gray-500">
                {selectedExpressionIds.length} selected
              </span>
            </div>

            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {filteredExpressions.map((expression) => (
                <label
                  key={expression.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedExpressionIds.includes(expression.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedExpressionIds.includes(expression.id)}
                    onChange={() => handleExpressionToggle(expression.id)}
                    className="rounded"
                  />
                  <span className="flex-1">{expression.text}</span>
                  <div className="text-xs text-gray-500">
                    {expression.correctCount}/{expression.totalCount}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Start button */}
          <div className="pt-4 border-t">
            <button
              onClick={handleStart}
              disabled={selectedExpressions.length === 0}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                selectedExpressions.length > 0
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {selectedExpressions.length > 0
                ? `Start Practice with ${selectedExpressions.length} Expressions`
                : "Please select expressions to practice"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
