import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SimpleChatInterface() {
  const [activeMode, setActiveMode] = useState<"setup" | "chat">("setup");

  if (activeMode === "setup") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>영어 회화 연습</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              AI와 함께 영어 표현을 연습하세요!
            </p>
            <Button onClick={() => setActiveMode("chat")}>
              연습 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>AI 채팅</span>
            <Button variant="outline" size="sm" onClick={() => setActiveMode("setup")}>
              새 연습
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded p-4 mb-4">
            <p className="text-center text-gray-500">채팅 영역</p>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <Button>전송</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}