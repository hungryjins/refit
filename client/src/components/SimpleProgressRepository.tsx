import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function SimpleProgressRepository() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>학습 진도</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {isAuthenticated 
              ? "학습 진행상황을 확인하세요." 
              : "로그인하면 진도를 추적할 수 있습니다."}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">연습 세션</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">학습한 표현</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-purple-600">0%</div>
              <div className="text-sm text-gray-600">평균 정확도</div>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-yellow-800">
              로그인하면 상세한 진도를 추적할 수 있습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}