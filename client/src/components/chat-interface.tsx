import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useChatSession } from "@/hooks/use-chat";
import { useExpressions } from "@/hooks/use-expressions";
import { useCategories } from "@/hooks/use-categories";
import type { ChatMessage, Expression, Category } from "@shared/schema";

interface ChatBubbleProps {
  message: ChatMessage;
  expression?: Expression;
}

function ChatBubble({ message, expression }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start space-x-3 ${message.isUser ? "justify-end" : ""}`}
    >
      {!message.isUser && (
        <div className="w-8 h-8 gradient-secondary rounded-full flex items-center justify-center text-white text-sm">
          🤖
        </div>
      )}
      
      <div className={`rounded-2xl p-4 max-w-xs shadow-md ${
        message.isUser 
          ? "chat-bubble-user text-white rounded-tr-sm" 
          : "chat-bubble-bot text-gray-800 rounded-tl-sm"
      }`}>
        <p>{message.content}</p>
        {message.isUser && message.expressionUsed && expression && (
          <motion.div 
            className="mt-2 flex items-center space-x-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full flex items-center gap-1">
              {message.isCorrect ? "✅" : "❌"} Expression {message.isCorrect ? "used correctly!" : "needs practice"}
            </div>
          </motion.div>
        )}
      </div>

      {message.isUser && (
        <div className="w-8 h-8 gradient-success rounded-full flex items-center justify-center text-white text-sm">
          👤
        </div>
      )}
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-start space-x-3"
    >
      <div className="w-8 h-8 gradient-secondary rounded-full flex items-center justify-center text-white text-sm">
        🤖
      </div>
      <div className="chat-bubble-bot rounded-2xl rounded-tl-sm p-4 shadow-md">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<Set<number>>(new Set());
  const [isSetupMode, setIsSetupMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { activeSession, createSession } = useChatSession();
  const { expressions } = useExpressions();
  const { categories } = useCategories();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: [`/api/chat/sessions/${activeSession?.id}/messages`],
    enabled: !!activeSession?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeSession) {
        const newSession = await createSession("Coffee shop conversation");
        const sessionId = newSession.id;
        
        // Send user message
        const userMessage = await apiRequest("POST", "/api/chat/messages", {
          sessionId,
          content,
          isUser: true,
          expressionUsed: null,
          isCorrect: null,
        });
        
        return { sessionId, userMessage };
      } else {
        const userMessage = await apiRequest("POST", "/api/chat/messages", {
          sessionId: activeSession.id,
          content,
          isUser: true,
          expressionUsed: null,
          isCorrect: null,
        });
        
        return { sessionId: activeSession.id, userMessage };
      }
    },
    onSuccess: async ({ sessionId, userMessage }) => {
      setIsTyping(true);
      
      // Generate bot response
      try {
        console.log("Sending request to /api/chat/respond with:", {
          message: userMessage.content,
          sessionId,
          selectedExpressions: !isSetupMode ? Array.from(selectedExpressions) : undefined,
        });
        
        console.log("User message content:", userMessage.content);
        
        const response = await apiRequest("POST", "/api/chat/respond", {
          message: userMessage.content, // Use the actual message content from the created message
          sessionId,
          selectedExpressions: !isSetupMode ? Array.from(selectedExpressions) : undefined,
        });
        
        console.log("Received response:", response);
        
        // Handle expression detection and update UI
        if (response.detectedExpression) {
          const expressionId = response.detectedExpression.id;
          const isCorrect = response.detectedExpression.isCorrect;
          
          // Update the message with expression info
          await apiRequest("PATCH", `/api/chat/messages/${userMessage.id}`, {
            expressionUsed: expressionId,
            isCorrect: isCorrect,
          });
          
          // Show feedback toast
          toast({
            title: isCorrect ? "훌륭합니다!" : "좋은 시도입니다!",
            description: isCorrect 
              ? `"${response.detectedExpression.text}" 표현을 정확하게 사용했습니다!`
              : `"${response.detectedExpression.text}" 표현과 비슷하지만 조금 더 정확하게 사용해보세요.`,
            variant: isCorrect ? "default" : "destructive",
          });
        }
        
        // Check if session is complete
        if (response.sessionComplete) {
          toast({
            title: "🎉 연습 완료!",
            description: "모든 표현을 성공적으로 사용했습니다!",
          });
          
          // Reset to setup mode after a delay
          setTimeout(() => {
            setIsSetupMode(true);
            setSelectedCategory(null);
            setSelectedExpressions(new Set());
          }, 3000);
        }
        
        // AI response is already saved by the backend, so refresh immediately
        queryClient.invalidateQueries({ queryKey: [`/api/chat/sessions/${sessionId}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/expressions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        
        // Add a small delay before stopping typing indicator for better UX
        setTimeout(() => {
          setIsTyping(false);
        }, 800);
      } catch (error) {
        console.error("Error in chat response:", error);
        setIsTyping(false);
        toast({
          title: "Error",
          description: `Failed to get bot response: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      }
      
      // Refresh messages and session data after user message is sent
      queryClient.invalidateQueries({ queryKey: [`/api/chat/sessions/${sessionId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/active"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const currentMessage = message;
    setMessage("");
    sendMessageMutation.mutate(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initialize first session with welcome message
  useEffect(() => {
    if (!activeSession && expressions.length > 0) {
      createSession("Welcome conversation").then(async (newSession) => {
        await apiRequest("POST", "/api/chat/messages", {
          sessionId: newSession.id,
          content: "Hello! I'm excited to help you practice English conversation. Let's start with a scenario at a coffee shop. You're ordering your favorite drink. What would you like to say to the barista?",
          isUser: false,
          expressionUsed: null,
          isCorrect: null,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/chat/sessions/${newSession.id}/messages`] });
      });
    }
  }, [activeSession, expressions.length, createSession, queryClient]);

  const filteredExpressions = selectedCategory 
    ? expressions.filter(expr => expr.categoryId === selectedCategory.id)
    : [];

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedExpressions(new Set());
  };

  const handleExpressionToggle = (expressionId: number) => {
    const newSelected = new Set(selectedExpressions);
    if (newSelected.has(expressionId)) {
      newSelected.delete(expressionId);
    } else {
      newSelected.add(expressionId);
    }
    setSelectedExpressions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedExpressions.size === filteredExpressions.length) {
      setSelectedExpressions(new Set());
    } else {
      setSelectedExpressions(new Set(filteredExpressions.map(expr => expr.id)));
    }
  };

  const handleStartChat = async () => {
    if (selectedExpressions.size === 0) {
      toast({
        title: "표현을 선택하세요",
        description: "최소 하나의 표현을 선택해야 대화를 시작할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSetupMode(false);
    
    // Create new session
    const categoryName = selectedCategory?.name || "Practice";
    const newSession = await createSession(`${categoryName} Practice`);
    
    // Generate initial AI scenario message
    try {
      const response = await apiRequest("POST", "/api/chat/respond", {
        message: "START_SESSION", // Special message to trigger initial scenario
        sessionId: newSession.id,
        selectedExpressions: Array.from(selectedExpressions),
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/chat/sessions/${newSession.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/active"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start chat session",
        variant: "destructive",
      });
    }
  };

  const handleBackToSetup = () => {
    setIsSetupMode(true);
    setSelectedCategory(null);
    setSelectedExpressions(new Set());
  };

  const expressionsUsed = messages.filter(m => m.isUser && m.expressionUsed).length;
  const totalExpressions = Array.from(selectedExpressions).length;

  if (isSetupMode) {
    return (
      <div className="space-y-6">
        {/* Setup Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl shadow-lg p-6 text-white"
        >
          <h2 className="text-2xl font-bold mb-2">🎯 대화 연습 설정</h2>
          <p className="opacity-90">연습하고 싶은 카테고리를 선택하고, 특정 표현들을 골라서 집중 연습해보세요.</p>
        </motion.div>

        {/* Category Selection */}
        {!selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              📚 카테고리 선택
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleCategorySelect(category)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
                    <CardHeader className={`bg-gradient-to-r ${category.color} text-white`}>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{category.icon}</span>
                        {category.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">
                        {expressions.filter(expr => expr.categoryId === category.id).length} 표현
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Expression Selection */}
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span>{selectedCategory.icon}</span>
                {selectedCategory.name} 표현 선택
              </h3>
              <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                뒤로가기
              </Button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="text-sm"
                >
                  {selectedExpressions.size === filteredExpressions.length ? "전체 해제" : "전체 선택"}
                </Button>
                <span className="text-sm text-gray-600">
                  {selectedExpressions.size} / {filteredExpressions.length} 선택됨
                </span>
              </div>
              <Button 
                onClick={handleStartChat}
                disabled={selectedExpressions.size === 0}
                className="gradient-primary text-white"
              >
                대화 시작하기 ({selectedExpressions.size}개 표현)
              </Button>
            </div>

            <div className="space-y-3">
              {filteredExpressions.map((expr, index) => {
                const accuracy = expr.totalCount > 0 
                  ? Math.round((expr.correctCount / expr.totalCount) * 100) 
                  : 0;
                
                return (
                  <motion.div
                    key={expr.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      selectedExpressions.has(expr.id) 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                    onClick={() => handleExpressionToggle(expr.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedExpressions.has(expr.id)}
                          onChange={() => handleExpressionToggle(expr.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">"{expr.text}"</p>
                          <p className="text-sm text-gray-600">{selectedCategory.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {expr.totalCount > 0 ? (
                          <div className="space-y-1">
                            <div className={`text-sm font-medium ${
                              accuracy >= 80 ? "text-green-600" : 
                              accuracy >= 60 ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {accuracy >= 80 ? "✅" : accuracy >= 60 ? "⚠️" : "❌"} {accuracy}%
                            </div>
                            <div className="text-xs text-gray-500">
                              ✅ {expr.correctCount} ❌ {expr.totalCount - expr.correctCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              📅 {expr.lastUsed ? new Date(expr.lastUsed).toLocaleDateString() : "Never"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {expr.totalCount} attempts
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">새로운 표현</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Chat Header */}
        <div className="gradient-primary text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                🤖
              </div>
              <div>
                <h3 className="font-semibold">AI Practice Partner</h3>
                <div className="flex items-center space-x-2 text-xs opacity-90">
                  <motion.div 
                    className="w-2 h-2 bg-green-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span>Online • {selectedCategory?.name} 연습중</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs opacity-90">Session Progress</p>
                <p className="font-bold">{expressionsUsed}/{totalExpressions} expressions used</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBackToSetup}
                className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30"
              >
                새 연습
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => {
              const expression = msg.expressionUsed 
                ? expressions.find(e => e.id === msg.expressionUsed)
                : undefined;
              return (
                <ChatBubble 
                  key={msg.id} 
                  message={msg} 
                  expression={expression} 
                />
              );
            })}
            {isTyping && <TypingIndicator />}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="선택한 표현들을 사용해서 대화해보세요..."
                className="w-full bg-gray-100 rounded-2xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-200"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 gradient-primary text-white rounded-full hover:opacity-90 transition-all duration-200"
              >
                ✈️
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors duration-200"
              title="Voice input"
            >
              🎤
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Expressions Reference */}
      {!isSetupMode && selectedCategory && (
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>{selectedCategory.icon}</span>
            연습중인 표현들 ({selectedExpressions.size}개)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from(selectedExpressions).map((exprId) => {
              const expr = expressions.find(e => e.id === exprId);
              if (!expr) return null;
              
              const usedMessage = messages.find(m => m.isUser && m.expressionUsed === exprId);
              
              return (
                <motion.div
                  key={expr.id}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    usedMessage
                      ? usedMessage.isCorrect
                        ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:shadow-md'
                        : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-md'
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100 hover:shadow-md'
                  }`}
                  onClick={() => setMessage(expr.text)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        usedMessage
                          ? usedMessage.isCorrect
                            ? 'text-green-800 line-through opacity-75'
                            : 'text-yellow-800 line-through opacity-75'
                          : 'text-gray-800'
                      }`}>
                        "{expr.text}"
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {usedMessage ? '완료됨' : '클릭해서 사용하기'}
                      </p>
                    </div>
                    <span className="text-lg">
                      {usedMessage
                        ? usedMessage.isCorrect
                          ? '✅'
                          : '⚠️'
                        : '⭕'
                      }
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
