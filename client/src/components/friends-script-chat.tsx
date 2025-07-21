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
    if (preview && Array.isArray(preview)) {
      console.log('Preview data received:', preview);
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
      if (!practiceData || !currentExpression) return;
      
      // 결과 저장
      setPracticeResults(prev => [...prev, {
        expression: currentExpression.text,
        target: practiceData.targetSentence,
        isCorrect: data.isCorrect,
        userResponse: userResponse
      }]);

      // 피드백 표시
      toast({
        title: data.isCorrect ? "정답!" : "틀렸습니다",
        description: data.feedback,
        variant: data.isCorrect ? "default" : "destructive"
      });

      // 입력 필드 클리어
      setUserResponse("");

      // 다음 표현으로 이동 (즉시 새로고침 방지)
      const nextIndex = currentExpressionIndex + 1;
      if (nextIndex < selectedExpressions.length) {
        const nextExpression = selectedExpressions[nextIndex];
        console.log('Moving to next expression:', nextExpression.text);
        
        // 잠시 대기 후 다음 연습으로 이동
        setTimeout(() => {
          setCurrentExpressionIndex(nextIndex);
          setPracticeData(null);
          // 다음 연습 자동 시작 - 다음 표현으로
          setTimeout(() => {
            startPracticeMutation.mutate(nextExpression);
          }, 500);
        }, 2000); // 2초 대기
      } else {
        // 모든 연습 완료
        setTimeout(() => {
          setCurrentExpressionIndex(nextIndex);
          setPracticeData(null);
        }, 2000);
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
            {!preview ? (
              <div className="text-center py-8">
                <div className="animate-pulse">미리보기 데이터를 불러오는 중...</div>
              </div>
            ) : preview.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-red-500">미리보기 데이터가 없습니다.</div>
              </div>
            ) : (
              preview.map((item, index) => (
                <div key={index} className="space-y-3">
                  <div className="font-medium">📖 표현: "{item.expression.text}"</div>
                  <div className="text-sm text-gray-600">🔍 검색 쿼리: "{item.searchQuery}"</div>
                  
                  {/* 목표 답안 (탑1 결과) 강조 표시 */}
                  {item.topResults && item.topResults.length > 0 ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                        <div className="text-sm font-medium text-green-800 mb-1">🎯 목표 답안 (자동 설정):</div>
                        <div className="font-semibold text-green-700">"{item.topResults[0].text}"</div>
                        <div className="text-xs text-green-600 mt-1">
                          유사도: {(item.topResults[0].score * 100).toFixed(1)}% (최고 일치)
                        </div>
                      </div>
                      
                      {/* 참고용 다른 결과들 (접을 수 있음) */}
                      {item.topResults.length > 1 && (
                        <details className="text-sm">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                            다른 유사 표현 보기 (참고용)
                          </summary>
                          <div className="mt-2 space-y-1">
                            {item.topResults.slice(1).map((result, i) => (
                              <div key={i} className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                                #{i + 2}: "{result.text}" (유사도: {(result.score * 100).toFixed(1)}%)
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm pl-4 text-gray-500">검색 결과가 없습니다.</div>
                  )}
                  
                  {index < preview.length - 1 && <Separator className="my-4" />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 연습 방법 안내 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">🎯 연습 방법:</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>각 표현마다 가장 유사한 Friends 대사가 <strong>목표 답안</strong>으로 자동 설정됩니다</li>
                <li>대화 시나리오를 읽고 목표 답안을 정확히 말해보세요</li>
                <li>AI가 정답 여부를 한국어로 피드백해드립니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={handleStartPractice}
            disabled={!preview || preview.length === 0 || startPracticeMutation.isPending}
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

            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
              <div className="text-sm font-medium text-green-800 mb-1">🎯 목표 답안:</div>
              <div className="font-semibold text-green-700">"{practiceData.targetSentence}"</div>
              <div className="text-xs text-green-600 mt-1">
                이 문장을 정확히 말해보세요!
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
                {evaluateMutation.isPending ? "평가 중..." : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!practiceData && !startPracticeMutation.isPending && !evaluateMutation.isPending && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="space-y-3">
              <div className="text-lg font-semibold">
                표현 {currentExpressionIndex + 1} / {selectedExpressions.length}
              </div>
              <Button 
                onClick={() => startPracticeMutation.mutate(currentExpression)}
                size="lg"
              >
                연습 시작: "{currentExpression?.text}"
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(startPracticeMutation.isPending || evaluateMutation.isPending) && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-pulse">
              {startPracticeMutation.isPending ? "연습 준비 중..." : "응답 평가 중..."}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 결과 표시 */}
      {practiceResults.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">최근 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {practiceResults.slice(-3).map((result, index) => (
                <div key={index} className={`flex items-center justify-between p-2 rounded ${
                  result.isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex-1">
                    <div className="text-sm font-medium">"{result.expression}"</div>
                    <div className="text-xs text-gray-600">목표: {result.target}</div>
                    <div className="text-xs text-gray-500">답변: {result.userResponse}</div>
                  </div>
                  <div className={`text-lg ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isCorrect ? '✅' : '❌'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}