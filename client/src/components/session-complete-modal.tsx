import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Target, Award } from "lucide-react";
import type { Expression } from "@shared/schema";

interface SessionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedExpressions: Expression[];
  sessionStats: {
    totalExpressions: number;
    completedExpressions: number;
    correctUsages: number;
    totalAttempts: number;
    sessionDuration: number;
    expressionResults: Array<{
      text: string;
      isCompleted: boolean;
      correctUsage: boolean;
      attempts: number;
    }>;
  };
}

export default function SessionCompleteModal({
  isOpen,
  onClose,
  completedExpressions,
  sessionStats
}: SessionCompleteModalProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}분 ${remainingSeconds}초` : `${remainingSeconds}초`;
  };

  const accuracy = sessionStats.totalAttempts > 0 
    ? Math.round((sessionStats.correctUsages / sessionStats.totalAttempts) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
            <Award className="h-8 w-8" />
            연습 완료!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 축하 메시지 */}
          <div className="text-center bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              🎉 축하합니다!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              모든 표현을 성공적으로 연습했습니다!
            </p>
          </div>

          {/* 통계 카드들 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center border border-blue-200 dark:border-blue-800">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {sessionStats.completedExpressions}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">완료된 표현</div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center border border-purple-200 dark:border-purple-800">
              <Target className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {accuracy}%
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">정확도</div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center border border-orange-200 dark:border-orange-800">
              <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {formatDuration(sessionStats.sessionDuration)}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">소요 시간</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg text-center border border-gray-200 dark:border-gray-800">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {sessionStats.totalAttempts}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">총 시도</div>
            </div>
          </div>

          {/* 연습한 표현들 목록 */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              연습 완료된 표현들
            </h4>
            <div className="space-y-3">
              {sessionStats.expressionResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      "{result.text}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.correctUsage ? "default" : "secondary"}>
                      {result.attempts}회 시도
                    </Badge>
                    {result.correctUsage && (
                      <Badge variant="default" className="bg-green-600">
                        완료
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 성취 메시지 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🌟 훌륭한 성과입니다!
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {accuracy >= 90 
                ? "완벽한 정확도로 모든 표현을 마스터했습니다!"
                : accuracy >= 70
                ? "좋은 정확도로 표현들을 잘 연습했습니다!"
                : "모든 표현을 완료했습니다. 계속 연습하면 더 좋아질 거예요!"
              }
            </p>
          </div>

          {/* 닫기 버튼 */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onClose}
              className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              처음으로 돌아가기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}