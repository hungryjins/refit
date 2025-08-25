import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Send,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trophy,
  Star,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/language-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryClient } from "@/lib/api";
import type {
  Expression,
  Category,
  ChatMessage,
  ChatSession,
} from "@shared/schema";

interface ChatBubbleProps {
  message: ChatMessage;
  targetExpression?: Expression;
}

function ChatBubble({ message }: ChatBubbleProps) {
  const isBot = !message.isUser;

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[80%] p-4 rounded-lg ${
          isBot
            ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 border border-blue-200"
            : "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md"
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

interface ExpressionResultDisplayProps {
  result: {
    expression: string;
    isCorrect: boolean;
  };
}

function ExpressionResultDisplay({ result }: ExpressionResultDisplayProps) {
  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg mb-2">
      {result.isCorrect ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm">{result.expression}</span>
      <Badge variant={result.isCorrect ? "default" : "destructive"}>
        {result.isCorrect ? "Correct" : "Incorrect"}
      </Badge>
    </div>
  );
}

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalCorrect: number;
    totalAttempts: number;
    accuracy: number;
  };
}

function CompletionModal({ isOpen, onClose, stats }: CompletionModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            {t("session.complete")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">
              {t("session.congratulations")}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalCorrect}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalAttempts}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(stats.accuracy)}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}

export default function NewChatInterface() {
  // State variables
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<Expression[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Session state
  const [usedExpressions, setUsedExpressions] = useState<Set<string>>(new Set());
  const [expressionResults, setExpressionResults] = useState<{
    expression: string;
    isCorrect: boolean;
  }[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Data fetching
  const { data: expressionsResponse } = useQuery({
    queryKey: ["expressions"],
    queryFn: () => api.expressions.getAll(),
  });
  const expressions = (expressionsResponse as any)?.data || [];

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.expressions.getCategories(),
  });
  const categories = (categoriesResponse as any)?.data || [];

  // Mutations
  const startSessionMutation = useMutation({
    mutationFn: async (data: { selectedExpressions: string[] }) => {
      return api.chat.startSession({
        selectedExpressions: data.selectedExpressions,
      });
    },
    onSuccess: (response: any) => {
      const data = response?.data;
      if (data) {
        setCurrentSession({
          id: data.sessionId || "",
          userId: "current-user",
          scenario: data.scenario || "",
          isActive: true,
          mode: "expression_practice",
          difficulty: "beginner",
          createdAt: new Date(),
        });

        // Add initial message
        const initialMessage: ChatMessage = {
          id: data.messageId || Date.now().toString(),
          sessionId: data.sessionId || "",
          content: data.initialMessage || "Let's start practicing!",
          isUser: false,
          createdAt: new Date(),
        };

        setMessages([initialMessage]);
        setUsedExpressions(new Set());
        setExpressionResults([]);
        setSessionComplete(false);
        setShowCompletionModal(false);
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { 
      message: string; 
      sessionId: string;
    }) => {
      return api.chat.respond({
        message: data.message,
        sessionId: data.sessionId,
      });
    },
    onSuccess: (response: any) => {
      const data = response?.data;
      if (data) {
        // Add AI response message
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          sessionId: currentSession?.id || "",
          content: data.response,
          isUser: false,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Handle expression detection and feedback
        if (data.detectedExpression) {
          const newResult = {
            expression: data.detectedExpression,
            isCorrect: data.isCorrect || false,
          };
          setExpressionResults((prev) => [...prev, newResult]);
          setUsedExpressions((prev) => new Set([...Array.from(prev), data.detectedExpression]));
        }

        if (data.failedExpression) {
          const newResult = {
            expression: data.failedExpression,
            isCorrect: false,
          };
          setExpressionResults((prev) => [...prev, newResult]);
        }

        // Check if session is complete
        if (data.sessionComplete) {
          setSessionComplete(true);
          setShowCompletionModal(true);
        }
      }

      setIsLoading(false);
      setCurrentInput("");
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  // Event handlers
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const filteredExpressions = expressions.filter(
      (expr: Expression) => expr.categoryId === categoryId
    );
    setSelectedExpressions(filteredExpressions);
  };

  const handleStartSession = () => {
    if (selectedExpressions.length === 0) return;

    startSessionMutation.mutate({
      selectedExpressions: selectedExpressions.map((expr) => expr.id),
    });
  };

  const handleSendMessage = () => {
    if (!currentInput.trim() || !currentSession) return;

    sendMessageMutation.mutate({
      message: currentInput,
      sessionId: currentSession.id,
    });

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sessionId: currentSession.id,
      content: currentInput,
      isUser: true,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsLoading(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseModal = () => {
    setShowCompletionModal(false);
    // Reset session
    setCurrentSession(null);
    setMessages([]);
    setSessionComplete(false);
    setShowCompletionModal(false);
    setSelectedCategory(null);
    setSelectedExpressions([]);
    setUsedExpressions(new Set());
    setExpressionResults([]);
    setCurrentInput("");
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (!currentSession) return;

    const { data: sessionResponse } = useQuery({
      queryKey: ["session", currentSession.id],
      queryFn: () => api.chat.getSession(currentSession.id),
    });

    if (sessionResponse?.data?.data) {
      setCurrentSession(sessionResponse.data.data);
    }
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!currentSession) {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Start New Practice Session</h2>
          <p className="text-gray-600">Choose expressions to practice</p>
        </div>

        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category: Category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => handleCategorySelect(category.id)}
                  className="flex items-center space-x-2 h-auto p-4"
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expression Selection */}
        {selectedExpressions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Expressions ({selectedExpressions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedExpressions.map((expr) => (
                  <div
                    key={expr.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{expr.text}</span>
                    <Badge variant="outline">
                      {expr.correctCount}/{expr.totalCount}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleStartSession}
                className="w-full mt-4"
                disabled={selectedExpressions.length === 0 || startSessionMutation.isPending}
              >
                {startSessionMutation.isPending ? "Starting..." : "Start Practice Session"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const stats = {
    totalCorrect: expressionResults.filter(r => r.isCorrect).length,
    totalAttempts: expressionResults.length,
    accuracy: expressionResults.length > 0 
      ? (expressionResults.filter(r => r.isCorrect).length / expressionResults.length) * 100 
      : 0,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Practice Session</h2>
          <p className="text-sm text-gray-600">
            {selectedExpressions.length} expressions selected
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Clock className="h-4 w-4 mr-1" />
          Active
        </Badge>
      </div>

      {/* Progress */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span>
            Progress: {usedExpressions.size}/{selectedExpressions.length}
          </span>
          <span>
            Accuracy: {Math.round(stats.accuracy)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(usedExpressions.size / selectedExpressions.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Results Display */}
      {expressionResults.length > 0 && (
        <div className="p-4 border-b bg-white">
          <h3 className="text-sm font-medium mb-2">Recent Results</h3>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {expressionResults.slice(-3).map((result, index) => (
              <ExpressionResultDisplay key={index} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your response using the expressions..."
            disabled={isLoading || sessionComplete}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!currentInput.trim() || isLoading || sessionComplete}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsRecording(!isRecording)}
            size="icon"
            disabled={sessionComplete}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4 text-red-500" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={handleCloseModal}
        stats={stats}
      />
    </div>
  );
}