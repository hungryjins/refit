import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mic, Send, RefreshCw, Eye } from "lucide-react";
import type { Expression } from "@shared/schema";

interface PracticeRound {
  searchQuery: string;
  targetSentence: string;
  dialogueScript: string;
  isCorrect?: boolean;
  feedback?: string;
}

interface SearchResult {
  text: string;
  score: number;
}

interface FriendsScriptChatProps {
  selectedExpressions: Expression[];
  onBack: () => void;
}

export default function FriendsScriptChat({ selectedExpressions, onBack }: FriendsScriptChatProps) {
  const { toast } = useToast();
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);
  const [practiceData, setPracticeData] = useState<PracticeRound | null>(null);
  const [userResponse, setUserResponse] = useState("");
  const [practiceResults, setPracticeResults] = useState<Array<{
    expression: string;
    target: string;
    isCorrect: boolean;
    userResponse: string;
  }>>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [previewData, setPreviewData] = useState<Array<{
    expression: Expression;
    searchQuery: string;
    topResults: SearchResult[];
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentExpression = selectedExpressions[currentExpressionIndex];
  const isCompleted = currentExpressionIndex >= selectedExpressions.length;

  // 표현 미리보기 데이터 가져오기
  const { data: preview } = useQuery({
    queryKey: ["friends-preview", selectedExpressions.map(e => e.id)],
    queryFn: async () => {
      return apiRequest("/api/friends-script/preview", {
        method: "POST",
        body: JSON.stringify({ expressions: selectedExpressions }),
        headers: { "Content-Type": "application/json" }
      });
    },
    enabled: showPreview && selectedExpressions.length > 0
  });

  useEffect(() => {
    if (preview) {
      setPreviewData(preview);
    }
  }, [preview]);

  // 연습 라운드 시작
  const startPracticeMutation = useMutation({
    mutationFn: async (expression: Expression) => {
      return apiRequest("/api/friends-script/practice", {
        method: "POST",
        body: JSON.stringify({ 
          userInput: expression.text,
          expressions: selectedExpressions 
        }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data: PracticeRound) => {
      setPracticeData(data);
      setShowPreview(false);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "연습을 시작할 수 없습니다.",
        variant: "destructive"
      });
    }
  });

  // 응답 평가
  const evaluateMutation = useMutation({
    mutationFn: async (params: { userResponse: string; targetSentence: string }) => {
      return apiRequest("/api/friends-script/evaluate", {
        method: "POST",
        body: JSON.stringify(params),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data: { isCorrect: boolean; feedback: string }) => {
      // 결과 저장
      setPracticeResults(prev => [...prev, {
        expression: currentExpression.text,
        target: practiceData!.targetSentence,
        isCorrect: data.isCorrect,
        userResponse: userResponse
      }]);

      // 다음 표현으로 이동
      const nextIndex = currentExpressionIndex + 1;
      if (nextIndex < selectedExpressions.length) {
        setCurrentExpressionIndex(nextIndex);
        setPracticeData(null);
        setUserResponse("");
        // 다음 연습 자동 시작
        setTimeout(() => {
          startPracticeMutation.mutate(selectedExpressions[nextIndex]);
        }, 1000);
      } else {
        setCurrentExpressionIndex(nextIndex);
        setPracticeData(null);
      }
    },
    onError: () => {
      toast({
        title: "평가 오류",
        description: "응답을 평가할 수 없습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSubmitResponse = () => {
    if (!userResponse.trim() || !practiceData) return;
    
    evaluateMutation.mutate({
      userResponse: userResponse.trim(),
      targetSentence: practiceData.targetSentence
    });
  };

  const handleStartPractice = () => {
    if (selectedExpressions.length === 0) return;
    setShowPreview(false);
    startPracticeMutation.mutate(currentExpression);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [practiceData, practiceResults]);

  // 미리보기 화면
  if (showPreview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Badge variant="outline" className="px-3 py-1">
            Friends Script Mode
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              표현 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewData.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-pulse">미리보기 데이터를 불러오는 중...</div>
              </div>
            ) : (
              previewData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="font-medium">표현: "{item.expression.text}"</div>
                  <div className="text-sm text-gray-600">🧠 GPT 쿼리: {item.searchQuery}</div>
                  <div className="space-y-1">
                    {item.topResults.map((result, i) => (
                      <div key={i} className="text-sm pl-4">
                        🔹 Top {i + 1}: {result.text} (score: {result.score.toFixed(4)})
                      </div>
                    ))}
                  </div>
                  {index < previewData.length - 1 && <Separator />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={handleStartPractice}
            disabled={previewData.length === 0 || startPracticeMutation.isPending}
            size="lg"
          >
            {startPracticeMutation.isPending ? "시작 중..." : "연습 시작하기"}
          </Button>
        </div>
      </div>
    );
  }

  // 연습 완료 화면
  if (isCompleted) {
    const correctCount = practiceResults.filter(r => r.isCorrect).length;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Badge variant="outline">Friends Script Complete</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🎉 연습 완료!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-lg">
              ✅ {practiceResults.length}개 표현 중 {correctCount}개 정답
            </div>
            
            {practiceResults.filter(r => !r.isCorrect).length > 0 && (
              <div>
                <div className="font-medium mb-2">❗ 틀린 문제들의 정답:</div>
                {practiceResults.filter(r => !r.isCorrect).map((result, index) => (
                  <div key={index} className="text-sm bg-red-50 p-2 rounded">
                    - {result.target}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={onBack} className="w-full">
              다시 연습하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 연습 화면
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Badge variant="outline">
          {currentExpressionIndex + 1} / {selectedExpressions.length}
        </Badge>
      </div>

      {practiceData && (
        <Card>
          <CardHeader>
            <CardTitle>🗣️ 대화 연습</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="whitespace-pre-line text-sm">
                {practiceData.dialogueScript}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Your response..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitResponse();
                  }
                }}
                disabled={evaluateMutation.isPending}
              />
              <Button 
                onClick={handleSubmitResponse}
                disabled={!userResponse.trim() || evaluateMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!practiceData && !startPracticeMutation.isPending && (
        <Card>
          <CardContent className="text-center py-8">
            <Button 
              onClick={() => startPracticeMutation.mutate(currentExpression)}
              size="lg"
            >
              연습 시작: "{currentExpression?.text}"
            </Button>
          </CardContent>
        </Card>
      )}

      {startPracticeMutation.isPending && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-pulse">연습 준비 중...</div>
          </CardContent>
        </Card>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}