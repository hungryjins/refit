import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function SimpleExpressionsManager() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>나의 표현</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {isAuthenticated 
              ? "저장된 영어 표현들을 관리하세요." 
              : "로그인하면 표현을 데이터베이스에 저장할 수 있습니다."}
          </p>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="새 영어 표현을 입력하세요..."
                className="flex-1 px-3 py-2 border rounded"
              />
              <Button>추가</Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-medium">저장된 표현들</h3>
            <div className="text-sm text-gray-500">
              {isAuthenticated ? "표현들이 여기에 표시됩니다." : "로그인하면 표현을 확인할 수 있습니다."}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}