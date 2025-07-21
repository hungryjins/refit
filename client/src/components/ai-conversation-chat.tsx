import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mic, Send, Bot } from "lucide-react";
import type { Expression } from "@shared/schema";

interface ChatMessage {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIConversationChatProps {
  selectedExpressions: Expression[];
  onBack: () => void;
}

export default function AIConversationChat({ selectedExpressions, onBack }: AIConversationChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 메시지
  useEffect(() => {
    const initialMessage: ChatMessage = {
      id: 1,
      content: `안녕하세요! 저는 AI 대화 파트너입니다. 다음 표현들을 연습해보겠습니다:\n\n${selectedExpressions.map(expr => `• ${expr.text}`).join('\n')}\n\n자유롭게 대화를 시작해보세요!`,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    setSessionId(Date.now()); // 간단한 세션 ID
  }, [selectedExpressions]);

  // AI 응답 생성
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      return apiRequest("/api/ai-conversation/respond", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          expressions: selectedExpressions
        }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data: { response: string; feedback?: string; usedExpression?: string }) => {
      const aiMessage: ChatMessage = {
        id: Date.now(),
        content: data.response,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

      if (data.usedExpression) {
        toast({
          title: "표현 사용 감지!",
          description: `"${data.usedExpression}" 표현을 사용하셨네요!`,
          variant: "default"
        });
      }
    },
    onError: () => {
      toast({
        title: "오류",
        description: "메시지를 전송할 수 없습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: Date.now(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // AI 응답 요청
    sendMessageMutation.mutate(inputMessage);
    setInputMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Badge variant="outline" className="px-3 py-1">
          <Bot className="h-4 w-4 mr-1" />
          AI Conversation
        </Badge>
      </div>

      {/* 선택된 표현들 표시 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">연습 표현들</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedExpressions.map(expr => (
              <Badge key={expr.id} variant="secondary" className="text-xs">
                {expr.text}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 채팅 메시지 영역 */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4">
          <div className="flex-1 space-y-4 overflow-y-auto max-h-96">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start space-x-3 ${
                    message.isUser ? "justify-end" : ""
                  }`}
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
                    <p className="whitespace-pre-line">{message.content}</p>
                  </div>

                  {message.isUser && (
                    <div className="w-8 h-8 gradient-success rounded-full flex items-center justify-center text-white text-sm">
                      👤
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {sendMessageMutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start space-x-3"
              >
                <div className="w-8 h-8 gradient-secondary rounded-full flex items-center justify-center text-white text-sm">
                  🤖
                </div>
                <div className="chat-bubble-bot rounded-2xl rounded-tl-sm p-4 shadow-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 메시지 입력 영역 */}
          <div className="flex gap-2 mt-4">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}