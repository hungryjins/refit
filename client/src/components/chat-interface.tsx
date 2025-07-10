import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useChatSession } from "@/hooks/use-chat";
import { useExpressions } from "@/hooks/use-expressions";
import type { ChatMessage, Expression } from "@shared/schema";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { activeSession, createSession } = useChatSession();
  const { expressions } = useExpressions();

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
        await apiRequest("POST", "/api/chat/messages", {
          sessionId,
          content,
          isUser: true,
          expressionUsed: null,
          isCorrect: null,
        });
        
        return sessionId;
      } else {
        await apiRequest("POST", "/api/chat/messages", {
          sessionId: activeSession.id,
          content,
          isUser: true,
          expressionUsed: null,
          isCorrect: null,
        });
        
        return activeSession.id;
      }
    },
    onSuccess: async (sessionId) => {
      setIsTyping(true);
      
      // Generate bot response
      try {
        const response = await apiRequest("POST", "/api/chat/respond", {
          message,
          sessionId,
        });
        const responseData = await response.json();
        
        // AI response is already saved by the backend, so refresh immediately
        queryClient.invalidateQueries({ queryKey: [`/api/chat/sessions/${sessionId}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/expressions"] });
        
        // Add a small delay before stopping typing indicator for better UX
        setTimeout(() => {
          setIsTyping(false);
        }, 800);
      } catch (error) {
        setIsTyping(false);
        toast({
          title: "Error",
          description: "Failed to get bot response",
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

  const expressionsUsed = messages.filter(m => m.expressionUsed).length;
  const totalExpressions = expressions.length;

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
                  <span>Online • Ready to practice</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90">Session Progress</p>
              <p className="font-bold">{expressionsUsed}/{totalExpressions} expressions used</p>
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
                placeholder="Type your response here..."
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

      {/* Quick Suggestions */}
      {expressions.length > 0 && (
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
            💡 Suggested Expressions to Practice
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expressions.slice(0, 4).map((expr, index) => (
              <motion.div
                key={expr.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => setMessage(expr.text)}
              >
                <p className="text-sm font-medium text-gray-800">"{expr.text}"</p>
                <p className="text-xs text-gray-600 mt-1">{expr.category || "General"}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
