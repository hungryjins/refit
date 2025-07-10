import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Target, Award, X } from "lucide-react";
import type { Expression } from "@shared/schema";
import { useLanguage } from "@/contexts/language-context";

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
  const { t } = useLanguage();

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}${t('time.minutes')} ${remainingSeconds}${t('time.seconds')}` : `${remainingSeconds}${t('time.seconds')}`;
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
            {t('session.complete')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 축하 메시지 */}
          <div className={`text-center p-4 rounded-lg border ${
            accuracy === 100 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : accuracy >= 70
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
          }`}>
            <h3 className={`text-lg font-semibold mb-2 ${
              accuracy === 100 
                ? "text-green-800 dark:text-green-200"
                : accuracy >= 70
                ? "text-blue-800 dark:text-blue-200"
                : "text-orange-800 dark:text-orange-200"
            }`}>
              {accuracy === 100 
                ? t('session.congratulations')
                : accuracy >= 70
                ? t('session.practice.complete')
                : t('session.practice.done')
              }
            </h3>
            <p className={
              accuracy === 100 
                ? "text-green-700 dark:text-green-300"
                : accuracy >= 70
                ? "text-blue-700 dark:text-blue-300"
                : "text-orange-700 dark:text-orange-300"
            }>
              {accuracy === 100 
                ? t('session.all.expressions.success')
                : t('session.all.expressions.done')
              }
            </p>
          </div>

          {/* 통계 카드들 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center border border-blue-200 dark:border-blue-800">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {sessionStats.completedExpressions}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">{t('session.completed.expressions')}</div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center border border-purple-200 dark:border-purple-800">
              <Target className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {accuracy}%
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">{t('session.accuracy')}</div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center border border-orange-200 dark:border-orange-800">
              <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {formatDuration(sessionStats.sessionDuration)}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">{t('session.duration')}</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg text-center border border-gray-200 dark:border-gray-800">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {sessionStats.totalAttempts}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('session.total.attempts')}</div>
            </div>
          </div>

          {/* 연습한 표현들 목록 */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t('session.practiced.expressions')}
            </h4>
            <div className="space-y-3">
              {sessionStats.expressionResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {result.correctUsage ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      "{result.text}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.correctUsage ? "default" : "secondary"}>
                      {result.attempts} {t('session.attempts.suffix')}
                    </Badge>
                    <Badge 
                      variant={result.correctUsage ? "default" : "destructive"} 
                      className={result.correctUsage ? "bg-green-600" : "bg-red-600"}
                    >
                      {result.correctUsage ? t('session.success') : t('session.failed')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 성취 메시지 */}
          <div className={`p-4 rounded-lg border ${
            accuracy === 100 
              ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800"
              : accuracy >= 70
              ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
              : "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800"
          }`}>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {accuracy === 100 
                ? t('session.achievement.excellent')
                : accuracy >= 70
                ? t('session.achievement.good')
                : t('session.achievement.helpful')
              }
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {accuracy === 100 
                ? t('session.achievement.perfect')
                : accuracy >= 70
                ? t('session.achievement.good.accuracy')
                : t('session.achievement.keep.practicing')
              }
            </p>
          </div>

          {/* 닫기 버튼 */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onClose}
              className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {t('session.back.home')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}