import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Send, Play, AlertCircle, CheckCircle2, Clock, Trophy, Star, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Expression, Category, ChatMessage, ChatSession } from "@shared/schema";

interface ChatBubbleProps {
  message: ChatMessage;
  targetExpression?: Expression;
}

function ChatBubble({ message, targetExpression }: ChatBubbleProps) {
  const isBot = !message.isUser;
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] p-4 rounded-lg ${
        isBot 
          ? 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 border border-blue-200' 
          : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md'
      }`}>
        {isBot && message.content.includes('<상황>') ? (
          // 게임 형식으로 상황-역할-대사 파싱
          <div className="space-y-3">
            {message.content.split('\n').map((line, index) => {
              if (line.includes('<상황>')) {
                return (
                  <div key={index} className="bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-600 font-bold">🎬 상황</span>
                    </div>
                    <p className="text-sm text-yellow-800">{line.replace('<상황>', '').trim()}</p>
                  </div>
                );
              } else if (line.includes('<역할>')) {
                return (
                  <div key={index} className="bg-blue-100 border-l-4 border-blue-500 p-3 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-600 font-bold">👤 역할</span>
                    </div>
                    <p className="text-sm text-blue-800">{line.replace('<역할>', '').trim()}</p>
                  </div>
                );
              } else if (line.includes('<대사>')) {
                return (
                  <div key={index} className="bg-green-100 border-l-4 border-green-500 p-3 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-600 font-bold">💬 대사</span>
                    </div>
                    <p className="text-sm text-green-800 font-medium">{line.replace('<대사>', '').trim()}</p>
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
    <div className="flex justify-start mb-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <span className="text-xs text-blue-600">AI가 응답을 생성 중...</span>
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
  const { t } = useLanguage();
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
      <div className="max-w-4xl mx-auto p-6">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-purple-50 backdrop-blur-sm">
          <CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-t-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-30">
              <div className="w-full h-full bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_2px,transparent_2px)] bg-[length:20px_20px]"></div>
            </div>
            <CardTitle className="flex items-center justify-center gap-4 text-3xl relative z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
                <span className="text-4xl">🎯</span>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white drop-shadow-lg">
                  {t('chat.conversation')}
                </div>
                <div className="text-sm text-white/90 font-normal">
                  AI-Powered English Practice
                </div>
              </div>
            </CardTitle>
            <p className="text-white/90 mt-3 relative z-10 font-medium">카테고리를 선택하고 영어 표현을 연습해보세요! ✨</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📚</span> {t('chat.select.category')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory?.id === category.id ? "default" : "outline"}
                    onClick={() => handleCategorySelect(category)}
                    className="p-4 h-auto text-left hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {expressions.filter(expr => expr.categoryId === category.id).length} 개 표현
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {selectedExpressions.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🎯</span> 연습할 표현들 ({selectedExpressions.length}개)
                </h3>
                <div className="space-y-3 mb-6">
                  {selectedExpressions.map((expr) => (
                    <div key={expr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{expr.text}</span>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <Badge variant="outline" className="text-xs">
                          대기 중
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleStartSession}
                  disabled={startSessionMutation.isPending}
                  className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {startSessionMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('chat.starting')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      🚀 {t('chat.start.session')}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show chat interface with expression tracking
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expression Tracking Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 shadow-lg border-0 bg-gradient-to-br from-white to-green-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📊</span> 표현 체크리스트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedExpressions.map((expr) => {
                const isUsed = usedExpressions.has(expr.id);
                const isCorrect = expressionResults.get(expr.id);
                // Check if this expression is currently being practiced
                const isCurrentTarget = currentSession && messages.length > 0;
                const lastMessage = messages[messages.length - 1];
                const isCurrentExpression = lastMessage && !lastMessage.isUser && 
                  (lastMessage.content.includes('새로운 표현') || lastMessage.content.includes(expr.text));
                
                console.log(`Expression ${expr.id} (${expr.text}): isUsed=${isUsed}, isCorrect=${isCorrect}, usedExpressions=${Array.from(usedExpressions)}`);
                
                return (
                  <div key={expr.id} className={`p-3 rounded-lg border transition-all duration-300 ${
                    isUsed 
                      ? isCorrect 
                        ? 'bg-green-100 border-green-300 shadow-sm' 
                        : 'bg-red-100 border-red-300 shadow-sm'
                      : isCurrentExpression
                      ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        isUsed 
                          ? isCorrect 
                            ? 'text-green-800' 
                            : 'text-red-800'
                          : isCurrentExpression ? 'text-blue-800' : 'text-gray-700'
                      }`}>
                        {expr.text}
                      </span>
                      {isUsed ? (
                        isCorrect ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : (
                          <XCircle size={18} className="text-red-600" />
                        )
                      ) : isCurrentExpression ? (
                        <Play size={16} className="text-blue-600" />
                      ) : (
                        <Clock size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isUsed 
                        ? isCorrect 
                          ? 'text-green-600' 
                          : 'text-red-600'
                        : isCurrentExpression ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {isUsed 
                        ? isCorrect 
                          ? '✅ 정답!' 
                          : '❌ 오답'
                        : isCurrentExpression ? '🎯 연습 중...' : '대기 중...'}
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800">
                  진행률: {usedExpressions.size}/{selectedExpressions.length}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(usedExpressions.size / selectedExpressions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {sessionComplete && (
                <Button 
                  onClick={handleNewSession}
                  className="w-full mt-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  🎉 새 세션 시작
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="shadow-2xl h-[700px] flex flex-col border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/50 backdrop-blur-sm">
            <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-t-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="w-full h-full bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:15px_15px]"></div>
            </div>
              <CardTitle className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
                    <span className="text-3xl">🎭</span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white drop-shadow-lg">영어 대화 연습</div>
                    <div className="text-sm text-white/90 font-medium">상황에 맞는 표현을 사용해보세요! ✨</div>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleNewSession}
                  className="text-white border-white/30 hover:bg-white/20 backdrop-blur-sm bg-white/10 transition-all duration-200 hover:scale-105 relative z-10"
                >
                  🔄 새 세션
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {sendMessageMutation.isPending && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50/50 backdrop-blur-sm">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsRecording(!isRecording)}
                    className={`transition-all duration-300 hover:scale-110 border-2 ${
                      isRecording 
                        ? "bg-red-100 border-red-300 shadow-lg shadow-red-200/50" 
                        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg"
                    }`}
                  >
                    {isRecording ? <MicOff className="h-4 w-4 text-red-600" /> : <Mic className="h-4 w-4 text-gray-600" />}
                  </Button>
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="상황에 맞는 영어 표현을 사용해서 대화해보세요... ✨"
                    className="flex-1 border-2 border-gray-200 focus:border-blue-400 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 focus:shadow-lg"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || sendMessageMutation.isPending || sessionComplete}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {sessionComplete && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl text-center shadow-lg">
                    <span className="text-green-800 font-bold text-lg">
                      🎉 모든 표현을 성공적으로 사용했습니다! 축하합니다! ✨
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completion Modal */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent className="max-w-lg bg-gradient-to-br from-white via-blue-50/30 to-purple-50/50 border-2 border-blue-200 shadow-2xl">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="h-12 w-12 text-white" />
              </div>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🎉 세션 완료! 🎉
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-8 w-8 text-yellow-500 fill-current animate-pulse" style={{animationDelay: `${i * 0.1}s`}} />
                  ))}
                </div>
                <p className="text-2xl font-bold text-gray-800 mb-3">
                  축하합니다! 🎊
                </p>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-md">
                  <div className="text-center mb-3">
                    <div className="text-3xl font-bold text-blue-800">
                      {Array.from(expressionResults.values()).filter(Boolean).length} / {usedExpressions.size}
                    </div>
                    <div className="text-lg text-blue-600 font-medium">
                      정답률: {usedExpressions.size > 0 ? Math.round((Array.from(expressionResults.values()).filter(Boolean).length / usedExpressions.size) * 100) : 0}% ✨
                    </div>
                  </div>
                </div>
              </div>

              {/* 정답 표현 */}
              {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && expressionResults.get(expr.id)).length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-lg">
                  <h4 className="font-bold text-green-800 mb-3 text-lg flex items-center gap-2">
                    <div className="bg-green-200 rounded-full p-1">
                      <CheckCircle2 size={20} className="text-green-700" />
                    </div>
                    정답 표현
                  </h4>
                  <div className="space-y-2">
                    {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && expressionResults.get(expr.id)).map(expr => (
                      <div key={expr.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg text-green-700 font-medium">
                        <CheckCircle2 size={18} className="text-green-600" />
                        {expr.text}
                        <span className="ml-auto text-xs text-green-600">✅</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 오답 표현 */}
              {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && !expressionResults.get(expr.id)).length > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl p-5 shadow-lg">
                  <h4 className="font-bold text-red-800 mb-3 text-lg flex items-center gap-2">
                    <div className="bg-red-200 rounded-full p-1">
                      <XCircle size={20} className="text-red-700" />
                    </div>
                    다시 연습할 표현
                  </h4>
                  <div className="space-y-2">
                    {selectedExpressions.filter(expr => usedExpressions.has(expr.id) && !expressionResults.get(expr.id)).map(expr => (
                      <div key={expr.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg text-red-700 font-medium">
                        <XCircle size={18} className="text-red-600" />
                        {expr.text}
                        <span className="ml-auto text-xs text-red-600">📚</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleCloseModal}
                className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 hover:from-green-600 hover:via-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 py-3 text-lg font-bold"
              >
                🎉 새 세션 시작하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}