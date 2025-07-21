import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AISettings() {
  const [config, setConfig] = useState({
    openaiApiKey: "",
    anthropicApiKey: "",
    cohereApiKey: "",
    pineconeApiKey: "",
    customEndpoint: "",
  });
  const [testMessage, setTestMessage] = useState("Hello, can you help me practice English?");
  const { toast } = useToast();

  const updateConfigMutation = useMutation({
    mutationFn: async (configData: typeof config) => {
      return await apiRequest("POST", "/api/ai/config", configData);
    },
    onSuccess: () => {
      toast({
        title: "AI 설정 완료! 🤖",
        description: "AI 서비스 설정이 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "AI 설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const testEndpointMutation = useMutation({
    mutationFn: async (data: { message: string; customEndpoint: string }) => {
      return await apiRequest("POST", "/api/ai/test", data);
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "연결 성공! ✅" : "연결 실패 ❌",
        description: data.success 
          ? "커스텀 엔드포인트가 정상적으로 작동합니다." 
          : data.error || "엔드포인트 연결에 실패했습니다.",
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(config);
  };

  const handleTestEndpoint = () => {
    if (!config.customEndpoint) {
      toast({
        title: "오류",
        description: "커스텀 엔드포인트 URL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    testEndpointMutation.mutate({
      message: testMessage,
      customEndpoint: config.customEndpoint,
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary rounded-2xl shadow-lg p-6 text-white"
      >
        <h3 className="text-xl font-bold mb-2 flex items-center">
          🤖 AI 서비스 설정
        </h3>
        <p className="text-sm opacity-90">
          LLM, RAG, Vector DB 등 외부 AI 서비스를 연동하여 더 똑똑한 대화를 만들어보세요.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>AI 서비스 연동</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="openai" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
              <TabsTrigger value="cohere">Cohere</TabsTrigger>
              <TabsTrigger value="custom">커스텀</TabsTrigger>
            </TabsList>

            <TabsContent value="openai" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">OpenAI API Key</label>
                <Input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  OpenAI API 키를 입력하면 GPT 모델을 사용한 대화가 가능합니다.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="anthropic" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Anthropic API Key</label>
                <Input
                  type="password"
                  value={config.anthropicApiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
                  placeholder="sk-ant-..."
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Anthropic API 키를 입력하면 Claude 모델을 사용한 대화가 가능합니다.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="cohere" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Cohere API Key</label>
                <Input
                  type="password"
                  value={config.cohereApiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, cohereApiKey: e.target.value }))}
                  placeholder="..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Pinecone API Key (Vector DB)</label>
                <Input
                  type="password"
                  value={config.pineconeApiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, pineconeApiKey: e.target.value }))}
                  placeholder="..."
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Pinecone을 사용하여 표현 임베딩과 의미적 검색을 구현할 수 있습니다.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">커스텀 엔드포인트 URL</label>
                <Input
                  value={config.customEndpoint}
                  onChange={(e) => setConfig(prev => ({ ...prev, customEndpoint: e.target.value }))}
                  placeholder="https://your-api.com/chat"
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  자체 LLM/RAG 시스템의 API 엔드포인트를 입력하세요.
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold mb-2">API 요청 형식</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`POST /your-endpoint
{
  "prompt": "시스템 프롬프트...",
  "userMessage": "사용자 메시지",
  "context": {
    "userExpressions": [...],
    "conversationHistory": [...],
    "scenario": "대화 시나리오"
  }
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">테스트 메시지</label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="테스트할 메시지를 입력하세요"
                />
                <Button
                  onClick={handleTestEndpoint}
                  disabled={testEndpointMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {testEndpointMutation.isPending ? "테스트 중..." : "🔄 엔드포인트 테스트"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-6 border-t">
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
              className="w-full gradient-primary text-white"
            >
              {updateConfigMutation.isPending ? "저장 중..." : "💾 설정 저장"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>연동 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                🔧 LLM 연동
              </h4>
              <p className="text-sm text-gray-600">
                OpenAI, Anthropic 등의 API 키를 설정하면 더 자연스러운 대화가 가능합니다.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                📊 RAG 시스템
              </h4>
              <p className="text-sm text-gray-600">
                Vector DB와 연동하여 사용자의 표현을 기반으로 맞춤형 대화를 생성합니다.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                🎯 표현 분석
              </h4>
              <p className="text-sm text-gray-600">
                임베딩을 통해 사용자가 사용한 표현의 정확도와 문맥을 정밀하게 분석합니다.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                🔗 커스텀 연동
              </h4>
              <p className="text-sm text-gray-600">
                자체 구축한 LLM/RAG 시스템도 쉽게 연동할 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}