import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
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

export default function FriendsScriptChat({
  selectedExpressions,
  onBack,
}: FriendsScriptChatProps) {
  const { toast } = useToast();
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);
  const [practiceData, setPracticeData] = useState<PracticeRound | null>(null);
  const [userResponse, setUserResponse] = useState("");
  const [practiceResults, setPracticeResults] = useState<
    Array<{
      expression: string;
      target: string;
      isCorrect: boolean;
      userResponse: string;
    }>
  >([]);
  const [showPreview, setShowPreview] = useState(true);
  const [previewData, setPreviewData] = useState<
    Array<{
      expression: Expression;
      searchQuery: string;
      topResults: SearchResult[];
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentExpression = selectedExpressions[currentExpressionIndex];
  const isCompleted = currentExpressionIndex >= selectedExpressions.length;

  // Get expression preview data
  const { data: preview } = useQuery({
    queryKey: ["friends-preview", selectedExpressions.map((e) => e.id)],
    queryFn: async () => {
      const response = await api.chat.friendsScriptPreview({ expressions: selectedExpressions });
      return response.data;
    },
    enabled: showPreview && selectedExpressions.length > 0,
  });

  useEffect(() => {
    if (preview && Array.isArray(preview)) {
      console.log("Preview data received:", preview);
      setPreviewData(preview);
    }
  }, [preview]);

  // Start practice round
  const startPracticeMutation = useMutation({
    mutationFn: async (expression: Expression) => {
      const response = await api.chat.friendsScriptPractice({
        userInput: expression.text,
        expressions: selectedExpressions,
      });
      return response.data;
    },
    onSuccess: (data: PracticeRound) => {
      setPracticeData(data);
      setShowPreview(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Unable to start practice.",
        variant: "destructive",
      });
    },
  });

  // Evaluate response
  const evaluateMutation = useMutation({
    mutationFn: async (params: {
      userResponse: string;
      targetSentence: string;
    }) => {
      const response = await api.chat.friendsScriptEvaluate({
        userResponse: params.userResponse,
        correctAnswer: params.targetSentence,
      });
      
      // Extract and validate the required fields from response
      const data = response.data;
      return {
        isCorrect: data?.isCorrect ?? false,
        feedback: data?.feedback ?? "No feedback available"
      };
    },
    onSuccess: (data: { isCorrect: boolean; feedback: string }) => {
      if (!practiceData || !currentExpression) return;

      // Save results
      setPracticeResults((prev) => [
        ...prev,
        {
          expression: currentExpression.text,
          target: practiceData.targetSentence,
          isCorrect: data.isCorrect,
          userResponse: userResponse,
        },
      ]);

      // Show feedback
      toast({
        title: data.isCorrect ? "Correct!" : "Incorrect",
        description: data.feedback,
        variant: data.isCorrect ? "default" : "destructive",
      });

      // Clear input field
      setUserResponse("");

      // Move to next expression (prevent immediate refresh)
      const nextIndex = currentExpressionIndex + 1;
      if (nextIndex < selectedExpressions.length) {
        const nextExpression = selectedExpressions[nextIndex];
        console.log("Moving to next expression:", nextExpression.text);

        // Wait briefly then move to next practice
        setTimeout(() => {
          setCurrentExpressionIndex(nextIndex);
          setPracticeData(null);
          // Auto-start next practice - move to next expression
          setTimeout(() => {
            startPracticeMutation.mutate(nextExpression);
          }, 500);
        }, 2000); // 2 second wait
      } else {
        // All practice completed
        setTimeout(() => {
          setCurrentExpressionIndex(nextIndex);
          setPracticeData(null);
        }, 2000);
      }
    },
    onError: () => {
      toast({
        title: "Evaluation Error",
        description: "Unable to evaluate response.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitResponse = () => {
    if (!userResponse.trim() || !practiceData) return;

    evaluateMutation.mutate({
      userResponse: userResponse.trim(),
      targetSentence: practiceData.targetSentence,
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

  // Preview screen
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
              Expression Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!preview ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Loading preview data...</div>
              </div>
            ) : preview.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-red-500">No preview data available.</div>
              </div>
            ) : (
              preview.map((item: any, index: number) => (
                <div key={index} className="space-y-3">
                  <div className="font-medium">
                    📖 Expression: "{item.expression.text}"
                  </div>
                  <div className="text-sm text-gray-600">
                    🔍 Search Query: "{item.searchQuery}"
                  </div>

                  {/* Target answer (top result) highlight */}
                  {item.topResults && item.topResults.length > 0 ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                        <div className="text-sm font-medium text-green-800 mb-1">
                          🎯 Target Answer (Auto-set):
                        </div>
                        <div className="font-semibold text-green-700">
                          "{item.topResults[0].text}"
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Similarity:{" "}
                          {(item.topResults[0].score * 100).toFixed(1)}% (Best
                          match)
                        </div>
                      </div>

                      {/* Other results for reference (collapsible) */}
                      {item.topResults.length > 1 && (
                        <details className="text-sm">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                            View other similar expressions (for reference)
                          </summary>
                          <div className="mt-2 space-y-1">
                            {item.topResults.slice(1).map((result: SearchResult, i: number) => (
                              <div
                                key={i}
                                className="bg-gray-50 p-2 rounded text-xs text-gray-600"
                              >
                                #{i + 2}: "{result.text}" (Similarity:{" "}
                                {(result.score * 100).toFixed(1)}%)
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm pl-4 text-gray-500">
                      No search results found.
                    </div>
                  )}

                  {index < preview.length - 1 && <Separator className="my-4" />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Practice method guide */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">🎯 Practice Method:</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  For each expression, the most similar Friends dialogue is{" "}
                  <strong>automatically set</strong> as the target answer
                </li>
                <li>
                  Read the conversation scenario and try to say the target
                  answer accurately
                </li>
                <li>
                  AI provides feedback in Korean on whether the answer is
                  correct
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={handleStartPractice}
            disabled={
              !preview ||
              preview.length === 0 ||
              startPracticeMutation.isPending
            }
            size="lg"
          >
            {startPracticeMutation.isPending ? "Starting..." : "Start Practice"}
          </Button>
        </div>
      </div>
    );
  }

  // Practice completion screen
  if (isCompleted) {
    const correctCount = practiceResults.filter((r) => r.isCorrect).length;

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
            <CardTitle>🎉 Practice Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-lg">
              ✅ {correctCount} correct out of {practiceResults.length}{" "}
              expressions
            </div>

            {practiceResults.filter((r) => !r.isCorrect).length > 0 && (
              <div>
                <div className="font-medium mb-2">
                  ❗ Correct answers for wrong problems:
                </div>
                {practiceResults
                  .filter((r) => !r.isCorrect)
                  .map((result, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded">
                      - {result.target}
                    </div>
                  ))}
              </div>
            )}

            <Button onClick={onBack} className="w-full">
              Practice Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Practice screen
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
            <CardTitle>🗣️ Conversation Practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="whitespace-pre-line text-sm">
                {practiceData.dialogueScript}
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
              <div className="text-sm font-medium text-green-800 mb-1">
                🎯 Target Answer:
              </div>
              <div className="font-semibold text-green-700">
                "{practiceData.targetSentence}"
              </div>
              <div className="text-xs text-green-600 mt-1">
                Try to say this sentence accurately!
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
                {evaluateMutation.isPending ? (
                  "Evaluating..."
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!practiceData &&
        !startPracticeMutation.isPending &&
        !evaluateMutation.isPending && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="space-y-3">
                <div className="text-lg font-semibold">
                  Expression {currentExpressionIndex + 1} /{" "}
                  {selectedExpressions.length}
                </div>
                <Button
                  onClick={() =>
                    startPracticeMutation.mutate(currentExpression)
                  }
                  size="lg"
                >
                  Start Practice: "{currentExpression?.text}"
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {(startPracticeMutation.isPending || evaluateMutation.isPending) && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="animate-pulse">
              {startPracticeMutation.isPending
                ? "Preparing practice..."
                : "Evaluating response..."}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent results display */}
      {practiceResults.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {practiceResults.slice(-3).map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    result.isCorrect ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      "{result.expression}"
                    </div>
                    <div className="text-xs text-gray-600">
                      Target: {result.target}
                    </div>
                    <div className="text-xs text-gray-500">
                      Response: {result.userResponse}
                    </div>
                  </div>
                  <div
                    className={`text-lg ${
                      result.isCorrect ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {result.isCorrect ? "✅" : "❌"}
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
