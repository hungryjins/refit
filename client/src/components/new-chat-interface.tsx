import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Send, Play, AlertCircle } from "lucide-react";
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
      <div className={`max-w-[80%] p-3 rounded-lg ${
        isBot 
          ? 'bg-gray-100 text-gray-800' 
          : 'bg-blue-500 text-white'
      }`}>
        <p className="text-sm">{message.content}</p>
        {message.isUser && message.expressionUsed !== null && (
          <div className="mt-2 text-xs opacity-75">
            {message.expressionUsed ? (
              <span className={message.isCorrect ? 'text-green-200' : 'text-red-200'}>
                {message.isCorrect ? '✓ Correct usage!' : '✗ Incorrect usage'}
              </span>
            ) : (
              <span className="text-yellow-200">Target expression not used</span>
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
      <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
  const [targetExpression, setTargetExpression] = useState<Expression | null>(null);
  const [scenario, setScenario] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
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

  // Start new conversation session
  const startSessionMutation = useMutation({
    mutationFn: async (selectedExpressions: number[]) => {
      const response = await fetch('/api/chat/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedExpressions })
      });
      if (!response.ok) throw new Error('Failed to start session');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession({ id: data.sessionId, scenario: data.scenario, isActive: true });
      setTargetExpression(data.targetExpression);
      setScenario(data.scenario);
      setMessages([{
        id: data.messageId,
        sessionId: data.sessionId,
        content: data.initialMessage,
        isUser: false,
        createdAt: new Date(),
        expressionUsed: null,
        isCorrect: null
      }]);
      setSessionComplete(false);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sessionId, targetExpressionId }: {
      message: string;
      sessionId: number;
      targetExpressionId: number;
    }) => {
      const response = await fetch('/api/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, targetExpressionId })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now(),
        sessionId: variables.sessionId,
        content: variables.message,
        isUser: true,
        createdAt: new Date(),
        expressionUsed: data.evaluation.usedTargetExpression,
        isCorrect: data.evaluation.isCorrect
      };

      // Add bot response
      const botMessage: ChatMessage = {
        id: data.messageId,
        sessionId: variables.sessionId,
        content: data.response,
        isUser: false,
        createdAt: new Date(),
        expressionUsed: null,
        isCorrect: null
      };

      setMessages(prev => [...prev, userMessage, botMessage]);
      setSessionComplete(data.sessionComplete);
      
      if (data.sessionComplete) {
        queryClient.invalidateQueries({ queryKey: ['/api/expressions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      }
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    const categoryExpressions = expressions.filter(expr => expr.categoryId === category.id);
    setSelectedExpressions(categoryExpressions);
  };

  const handleStartSession = () => {
    const expressionIds = selectedExpressions.map(expr => expr.id);
    startSessionMutation.mutate(expressionIds);
  };

  const handleSendMessage = () => {
    if (!currentInput.trim() || !currentSession || !targetExpression) return;
    
    sendMessageMutation.mutate({
      message: currentInput.trim(),
      sessionId: currentSession.id,
      targetExpressionId: targetExpression.id
    });
    
    setCurrentInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    // TODO: Implement voice recording and transcription
    setIsRecording(!isRecording);
  };

  const handleNewSession = () => {
    setCurrentSession(null);
    setTargetExpression(null);
    setScenario("");
    setMessages([]);
    setSessionComplete(false);
    setSelectedCategory(null);
    setSelectedExpressions([]);
  };

  // Show category selection if no session active
  if (!currentSession) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-blue-500 text-xl">💬</span>
              {t('chat.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('chat.select.category')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory?.id === category.id ? "default" : "outline"}
                    onClick={() => handleCategorySelect(category)}
                    className="p-4 h-auto text-left"
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{category.icon}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {expressions.filter(expr => expr.categoryId === category.id).length} {t('expressions.count')}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {selectedExpressions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {t('chat.selected.expressions')} ({selectedExpressions.length})
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedExpressions.map((expr) => (
                    <Badge key={expr.id} variant="secondary">
                      {expr.text}
                    </Badge>
                  ))}
                </div>
                <Button 
                  onClick={handleStartSession}
                  disabled={startSessionMutation.isPending}
                  className="w-full"
                >
                  {startSessionMutation.isPending ? t('chat.starting') : t('chat.start.session')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show chat interface
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span className="text-blue-500 text-xl">💬</span>
                {t('chat.conversation')}
              </CardTitle>
              <div className="mt-2">
                <p className="text-sm text-gray-600">{scenario}</p>
                {targetExpression && (
                  <Badge className="mt-2">
                    {t('chat.target')}: {targetExpression.text}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={handleNewSession}>
              {t('chat.new.session')}
            </Button>
          </div>
          {sessionComplete && (
            <div className="mt-3 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">{t('chat.session.complete')}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={message} 
                targetExpression={targetExpression || undefined}
              />
            ))}
            {(sendMessageMutation.isPending || isLoading) && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {!sessionComplete && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chat.type.message')}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceInput}
                  disabled={sendMessageMutation.isPending}
                  className={isRecording ? "bg-red-500 text-white" : ""}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || sendMessageMutation.isPending}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}