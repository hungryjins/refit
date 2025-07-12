import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Send, Play, AlertCircle, CheckCircle2, Clock, Trophy, Star, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Expression, Category, ChatMessage, ChatSession } from "@shared/schema";

interface ChatBubbleProps {
  message: ChatMessage;
  targetExpression?: Expression;
}

function ChatBubble({ message, targetExpression }: ChatBubbleProps) {
  const isBot = !message.isUser;
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-6`}>
      <div className={`max-w-[80%] p-5 rounded-2xl backdrop-blur-lg shadow-xl ${
        isBot 
          ? 'bg-white/20 text-white border border-white/30' 
          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'
      }`}>
        {isBot && message.content.includes('<상황>') ? (
          // 게임 형식으로 상황-역할-대사 파싱
          <div className="space-y-3">
            {message.content.split('\n').map((line, index) => {
              if (line.includes('<상황>')) {
                return (
                  <div key={index} className="bg-yellow-400/20 border-l-4 border-yellow-400 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300 font-bold text-lg">🎬 상황</span>
                    </div>
                    <p className="text-yellow-100 font-medium">{line.replace('<상황>', '').trim()}</p>
                  </div>
                );
              } else if (line.includes('<역할>')) {
                return (
                  <div key={index} className="bg-blue-400/20 border-l-4 border-blue-400 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-300 font-bold text-lg">👤 역할</span>
                    </div>
                    <p className="text-blue-100 font-medium">{line.replace('<역할>', '').trim()}</p>
                  </div>
                );
              } else if (line.includes('<대사>')) {
                return (
                  <div key={index} className="bg-green-400/20 border-l-4 border-green-400 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-300 font-bold text-lg">💬 대사</span>
                    </div>
                    <p className="text-green-100 font-semibold">{line.replace('<대사>', '').trim()}</p>
                  </div>
                );
              } else if (line.trim()) {
                return <p key={index} className="text-sm">{line}</p>;
              }
              return null;
            })}
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        
        {message.isUser && message.expressionUsed !== null && (
          <div className="mt-3 p-2 bg-white bg-opacity-20 rounded text-xs">
            {message.isCorrect ? (
              <span className="flex items-center gap-1 text-green-200">
                <CheckCircle2 size={12} />
                ✨ 훌륭해요! 표현을 완벽하게 사용했습니다!
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-200">
                <AlertCircle size={12} />
                💡 다시 시도해보세요
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-6">
      <div className="bg-white/10 backdrop-blur-lg text-white p-5 rounded-2xl border border-white/30 max-w-[80%] shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="font-medium">AI가 응답을 생성하고 있습니다...</span>
        </div>
      </div>
    </div>
  );
}

export default function NewChatInterface() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<Expression[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [usedExpressions, setUsedExpressions] = useState<Set<number>>(new Set());
  const [expressionResults, setExpressionResults] = useState<Map<number, boolean>>(new Map());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const { t } = useLanguage();
  const t = (key: string) => key; // Simplified translation function
  const queryClient = useQueryClient();

  // Fetch expressions and categories
  const { data: expressions = [] } = useQuery<Expression[]>({
    queryKey: ['/api/expressions'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (expressionIds: number[]) => {
      const response = await fetch('/api/chat/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedExpressions: expressionIds }),
      });
      if (!response.ok) throw new Error('Failed to start session');
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Session started:', data);
      
      // Create session object from response
      const session = {
        id: data.sessionId,
        scenario: data.scenario,
        isActive: true,
        createdAt: new Date().toISOString(),
        endedAt: null,
      };
      
      setCurrentSession(session);
      setMessages([{
        id: data.messageId || Date.now(),
        sessionId: data.sessionId,
        content: data.initialMessage,
        isUser: false,
        expressionUsed: null,
        isCorrect: null,
        createdAt: new Date().toISOString(),
      }]);
      setUsedExpressions(new Set());
      setSessionComplete(false);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sessionId, targetExpressionId }: { 
      message: string; 
      sessionId: number;
      targetExpressionId?: number;
    }) => {
      const response = await fetch('/api/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          sessionId,
          targetExpressionId: targetExpressionId || selectedExpressions[0]?.id
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Message response:', data);
      
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now(),
        sessionId: currentSession!.id,
        content: currentInput,
        isUser: true,
        expressionUsed: data.usedExpression || null,
        isCorrect: data.isCorrect || null,
        createdAt: new Date().toISOString(),
      };

      // Add bot response
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sessionId: currentSession!.id,
        content: data.response || "응답을 받을 수 없습니다.",
        isUser: false,
        expressionUsed: null,
        isCorrect: null,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage, botMessage]);

      // Update progress based on actual server response
      console.log('Server progress data:', data.progress);
      if (data.progress && Array.isArray(data.progress.completedExpressions)) {
        // Update used expressions based on server's completed list
        setUsedExpressions(new Set(data.progress.completedExpressions));
        
        // Update expression results (correct/incorrect)
        if (data.progress.expressionResults) {
          const resultsMap = new Map();
          data.progress.expressionResults.forEach((result: {id: number, isCorrect: boolean}) => {
            resultsMap.set(result.id, result.isCorrect);
          });
          setExpressionResults(resultsMap);
        }
        
        console.log('Updated used expressions:', data.progress.completedExpressions);
        console.log('Updated expression results:', data.progress.expressionResults);
      } else {
        console.log('No valid progress data received');
      }

      // Check if session is complete
      if (data.sessionComplete) {
        setSessionComplete(true);
        // Show completion modal after a brief delay
        setTimeout(() => {
          setShowCompletionModal(true);
        }, 1000);
      }

      setCurrentInput("");
    },
  });

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    const categoryExpressions = expressions.filter(expr => expr.categoryId === category.id);
    setSelectedExpressions(categoryExpressions);
  };

  const handleStartSession = () => {
    if (selectedExpressions.length === 0) return;
    startSessionMutation.mutate(selectedExpressions.map(expr => expr.id));
  };

  const handleSendMessage = () => {
    if (!currentInput.trim() || !currentSession) return;
    
    sendMessageMutation.mutate({
      message: currentInput.trim(),
      sessionId: currentSession.id,
      targetExpressionId: selectedExpressions[0]?.id,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Update stats mutation for progress tracking
  const updateStatsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalSessions: 1, // increment by 1
          currentStreak: 1, // increment by 1
          lastPracticeDate: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to update stats');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expressions'] });
    },
  });

  const handleCloseModal = () => {
    setShowCompletionModal(false);
    // Update progress stats when modal is closed
    updateStatsMutation.mutate();
    // Reset for new session
    handleNewSession();
  };

  const handleNewSession = () => {
    setCurrentSession(null);
    setMessages([]);
    setSessionComplete(false);
    setShowCompletionModal(false);
    setSelectedCategory(null);
    setSelectedExpressions([]);
    setUsedExpressions(new Set());
    setExpressionResults(new Map());
    setCurrentInput("");
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show category selection if no session active
  if (!currentSession) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-3xl font-bold text-white mb-2">연습할 표현 선택</h2>
          <p className="text-white/80 text-lg">카테고리를 선택하고 영어 표현을 연습해보세요!</p>
        </div>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-white">
              <span>📚</span> 카테고리 선택
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className={`group relative p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                    selectedCategory?.id === category.id 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl' 
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/30'
                  }`}
                >
                  <div className="text-3xl mb-3">{category.icon}</div>
                  <div className="font-semibold text-lg mb-1">{category.name}</div>
                  <div className="text-sm opacity-80">
                    {expressions.filter(expr => expr.categoryId === category.id).length} 개 표현
                  </div>
                  {selectedCategory?.id === category.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedExpressions.length > 0 && (
            <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-white">
                <span>🎯</span> 연습할 표현들 ({selectedExpressions.length}개)
              </h3>
              <div className="space-y-3 mb-6">
                {selectedExpressions.map((expr) => (
                  <div key={expr.id} className="flex items-center justify-between p-4 bg-white/10 rounded-xl text-white">
                    <span className="font-medium">{expr.text}</span>
                    <span className="text-xs bg-purple-500/30 px-3 py-1 rounded-full">
                      대기 중
                    </span>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleStartSession}
                disabled={startSessionMutation.isPending}
                className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
              >
                {startSessionMutation.isPending ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    세션 시작 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    🚀 대화 시작하기
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show chat interface with expression tracking
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Expression Tracking Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 backdrop-blur-lg bg-white/10 rounded-2xl shadow-2xl border border-white/20">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-white">
              <span>📊</span> 표현 체크리스트
            </h3>
            <div className="space-y-3">
              {selectedExpressions.map((expr) => {
                const isUsed = usedExpressions.has(expr.id);
                const isCorrect = expressionResults.get(expr.id);
                const lastMessage = messages[messages.length - 1];
                const isCurrentExpression = lastMessage && !lastMessage.isUser && 
                  (lastMessage.content.includes('새로운 표현') || lastMessage.content.includes(expr.text));
                
                return (
                  <div key={expr.id} className={`p-4 rounded-xl transition-all duration-300 ${
                    isUsed 
                      ? isCorrect 
                        ? 'bg-green-500/20 border border-green-400/50 shadow-lg' 
                        : 'bg-red-500/20 border border-red-400/50 shadow-lg'
                      : isCurrentExpression
                      ? 'bg-blue-500/20 border border-blue-400/50 ring-2 ring-blue-300/50'
                      : 'bg-white/10 border border-white/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        isUsed 
                          ? isCorrect 
                            ? 'text-green-300' 
                            : 'text-red-300'
                          : isCurrentExpression ? 'text-blue-300' : 'text-white'
                      }`}>
                        {expr.text}
                      </span>
                      {isUsed ? (
                        isCorrect ? (
                          <CheckCircle2 size={20} className="text-green-400" />
                        ) : (
                          <XCircle size={20} className="text-red-400" />
                        )
                      ) : isCurrentExpression ? (
                        <Play size={18} className="text-blue-400" />
                      ) : (
                        <Clock size={18} className="text-white/60" />
                      )}
                    </div>
                    <div className={`text-sm mt-2 ${
                      isUsed 
                        ? isCorrect 
                          ? 'text-green-400' 
                          : 'text-red-400'
                        : isCurrentExpression ? 'text-blue-400' : 'text-white/70'
                    }`}>
                      {isUsed 
                        ? isCorrect 
                          ? '✅ 성공!' 
                          : '❌ 다시 시도'
                        : isCurrentExpression ? '🎯 연습 중...' : '⏳ 대기 중...'}
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/30">
                <div className="text-lg font-semibold text-white mb-3">
                  진행률: {usedExpressions.size}/{selectedExpressions.length}
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-pink-400 h-3 rounded-full transition-all duration-500 shadow-lg"
                    style={{ width: `${(usedExpressions.size / selectedExpressions.length) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm text-white/80 mt-2">
                  {Math.round((usedExpressions.size / selectedExpressions.length) * 100)}% 완료
                </div>
              </div>

              {sessionComplete && (
                <button 
                  onClick={handleNewSession}
                  className="w-full mt-6 py-3 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  🎉 새 세션 시작
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl shadow-2xl border border-white/20 h-[700px] flex flex-col">
            <div className="flex-shrink-0 p-6 border-b border-white/20 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎭</div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">영어 대화 연습</h2>
                    <p className="text-white/80">상황에 맞는 표현을 사용해보세요!</p>
                  </div>
                </div>
                <button 
                  onClick={handleNewSession}
                  className="px-4 py-2 bg-white/20 text-white hover:bg-white/30 rounded-xl transition-all duration-300 border border-white/30"
                >
                  새 세션
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {sendMessageMutation.isPending && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 p-6 border-t border-white/20 bg-white/5">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`p-3 rounded-xl transition-all duration-300 ${
                      isRecording 
                        ? "bg-red-500/20 border-red-400/50 text-red-300" 
                        : "bg-white/10 border-white/30 text-white/80 hover:bg-white/20"
                    } border`}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="상황에 맞는 영어 표현을 사용해서 대화해보세요..."
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:bg-white/20 focus:border-purple-400/50 focus:outline-none transition-all duration-300"
                    disabled={sendMessageMutation.isPending}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || sendMessageMutation.isPending || sessionComplete}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                {sessionComplete && (
                  <div className="mt-4 p-4 bg-green-500/20 border border-green-400/50 rounded-xl text-center">
                    <span className="text-green-300 font-semibold text-lg">
                      🎉 모든 표현을 성공적으로 사용했습니다! 축하합니다!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Completion Modal - Modern Design */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent className="max-w-lg bg-gradient-to-br from-purple-900 to-pink-900 text-white border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-3xl font-bold text-center justify-center">
                <Trophy className="h-10 w-10 text-yellow-400 animate-bounce" />
                세션 완료!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-8 w-8 text-yellow-400 fill-current animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="text-2xl font-bold mb-6">
                  🎉 훌륭합니다!
                </p>
                <div className="p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-lg">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-green-400 mb-2">
                      {Array.from(expressionResults.values()).filter(Boolean).length} / {usedExpressions.size}
                    </div>
                    <div className="text-lg text-green-300">
                      정답률: {usedExpressions.size > 0 ? Math.round((Array.from(expressionResults.values()).filter(Boolean).length / usedExpressions.size) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 정답 표현 */}
              {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && expressionResults.get(expr.id)).length > 0 && (
                <div className="bg-green-500/20 border border-green-400/50 rounded-xl p-5">
                  <h4 className="font-bold text-green-300 mb-3 text-lg">✅ 성공한 표현:</h4>
                  <div className="space-y-2">
                    {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && expressionResults.get(expr.id)).map(expr => (
                      <div key={expr.id} className="flex items-center gap-3 text-green-100">
                        <CheckCircle2 size={18} className="text-green-400" />
                        <span className="font-medium">{expr.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 오답 표현 */}
              {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && !expressionResults.get(expr.id)).length > 0 && (
                <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-5">
                  <h4 className="font-bold text-red-300 mb-3 text-lg">❌ 다시 시도 필요:</h4>
                  <div className="space-y-2">
                    {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && !expressionResults.get(expr.id)).map(expr => (
                      <div key={expr.id} className="flex items-center gap-3 text-red-100">
                        <XCircle size={18} className="text-red-400" />
                        <span className="font-medium">{expr.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={handleCloseModal}
                className="w-full py-4 text-xl font-semibold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                확인
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}