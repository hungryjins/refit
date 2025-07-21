import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PracticeModeSelector, { PracticeMode } from "./practice-mode-selector";
import NewChatInterface from "./new-chat-interface"; // 수정된 Original Chat
import AIConversationChat from "./ai-conversation-chat"; // 새로운 AI 대화
import FriendsScriptChat from "./friends-script-chat"; // 새로운 Friends Script
import type { Expression, Category } from "@shared/schema";

export default function PracticeChatInterface() {
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<Expression[]>([]);
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  
  const { data: expressions = [] } = useQuery<Expression[]>({
    queryKey: ['/api/expressions']
  });
  
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories']
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

  // 모드 선택 화면
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

  // 표현 선택 화면
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

  // 선택된 모드에 따른 채팅 인터페이스 렌더링
  if (selectedMode === 'original') {
    return (
      <div className="container mx-auto px-4 py-8">
        <NewChatInterface />
      </div>
    );
  }

  if (selectedMode === 'ai-conversation') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AIConversationChat 
          selectedExpressions={selectedExpressions}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (selectedMode === 'friends-script') {
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

// 표현 선택 컴포넌트
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
  onStart 
}: ExpressionSelectorProps) {
  const [selectedExpressionIds, setSelectedExpressionIds] = useState<number[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const filteredExpressions = selectedCategoryId 
    ? expressions.filter(expr => expr.categoryId === selectedCategoryId)
    : expressions;

  const selectedExpressions = expressions.filter(expr => 
    selectedExpressionIds.includes(expr.id)
  );

  const handleExpressionToggle = (expressionId: number) => {
    setSelectedExpressionIds(prev => 
      prev.includes(expressionId)
        ? prev.filter(id => id !== expressionId)
        : [...prev, expressionId]
    );
  };

  const handleStart = () => {
    if (selectedExpressions.length === 0) return;
    onStart(selectedExpressions);
  };

  const getModeTitle = () => {
    switch (selectedMode) {
      case 'original': return 'Original Chat';
      case 'ai-conversation': return 'AI Conversation';
      case 'friends-script': return 'Friends Script';
      default: return 'Practice Mode';
    }
  };

  const getModeDescription = () => {
    switch (selectedMode) {
      case 'original': 
        return '기존의 표현별 시나리오 기반 연습';
      case 'ai-conversation': 
        return 'AI와의 자유로운 대화를 통한 표현 연습';
      case 'friends-script': 
        return 'RAG 기반 대화 스크립트를 통한 실제 상황 연습';
      default: 
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← 모드 선택으로 돌아가기
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{getModeTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">{getModeDescription()}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 카테고리 필터 */}
          <div className="space-y-2">
            <h3 className="font-medium">카테고리별 필터</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategoryId === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategoryId === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* 표현 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">연습할 표현 선택</h3>
              <span className="text-sm text-gray-500">
                {selectedExpressionIds.length}개 선택됨
              </span>
            </div>
            
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {filteredExpressions.map(expression => (
                <label
                  key={expression.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedExpressionIds.includes(expression.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
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

          {/* 시작 버튼 */}
          <div className="pt-4 border-t">
            <button
              onClick={handleStart}
              disabled={selectedExpressions.length === 0}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                selectedExpressions.length > 0
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedExpressions.length > 0 
                ? `${selectedExpressions.length}개 표현으로 연습 시작` 
                : '연습할 표현을 선택해주세요'
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}