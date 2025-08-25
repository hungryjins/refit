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
  const [testMessage, setTestMessage] = useState(
    "Hello, can you help me practice English?"
  );
  const { toast } = useToast();

  const updateConfigMutation = useMutation({
    mutationFn: async (configData: typeof config) => {
      return await apiRequest("POST", "/api/ai/config", configData);
    },
    onSuccess: () => {
      toast({
        title: "AI Settings Complete! 🤖",
        description: "AI service settings have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save AI settings.",
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
        title: data.success
          ? "Connection Successful! ✅"
          : "Connection Failed ❌",
        description: data.success
          ? "Custom endpoint is working properly."
          : data.error || "Failed to connect to endpoint.",
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
        title: "Error",
        description: "Please enter a custom endpoint URL.",
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
          🤖 AI Service Settings
        </h3>
        <p className="text-sm opacity-90">
          Connect external AI services like LLM, RAG, Vector DB to create
          smarter conversations.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>AI Service Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="openai" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
              <TabsTrigger value="cohere">Cohere</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="openai" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  OpenAI API Key
                </label>
                <Input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      openaiApiKey: e.target.value,
                    }))
                  }
                  placeholder="sk-..."
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter your OpenAI API key to enable conversations using GPT
                  models.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="anthropic" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Anthropic API Key
                </label>
                <Input
                  type="password"
                  value={config.anthropicApiKey}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      anthropicApiKey: e.target.value,
                    }))
                  }
                  placeholder="sk-ant-..."
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter your Anthropic API key to enable conversations using
                  Claude models.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="cohere" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Cohere API Key
                </label>
                <Input
                  type="password"
                  value={config.cohereApiKey}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      cohereApiKey: e.target.value,
                    }))
                  }
                  placeholder="..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pinecone API Key (Vector DB)
                </label>
                <Input
                  type="password"
                  value={config.pineconeApiKey}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      pineconeApiKey: e.target.value,
                    }))
                  }
                  placeholder="..."
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Use Pinecone to implement expression embeddings and semantic
                  search.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Custom Endpoint URL
                </label>
                <Input
                  value={config.customEndpoint}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      customEndpoint: e.target.value,
                    }))
                  }
                  placeholder="https://your-api.com/chat"
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter the API endpoint of your own LLM/RAG system.
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold mb-2">API Request Format</h4>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                  {`POST /your-endpoint
{
  "prompt": "System prompt...",
  "userMessage": "User message",
  "context": {
    "userExpressions": [...],
    "conversationHistory": [...],
    "scenario": "Conversation scenario"
  }
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Test Message</label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a message to test"
                />
                <Button
                  onClick={handleTestEndpoint}
                  disabled={testEndpointMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {testEndpointMutation.isPending
                    ? "Testing..."
                    : "🔄 Test Endpoint"}
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
              {updateConfigMutation.isPending
                ? "Saving..."
                : "💾 Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                🔧 LLM Integration
              </h4>
              <p className="text-sm text-gray-600">
                Set up API keys for OpenAI, Anthropic, etc. to enable more
                natural conversations.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                📊 RAG System
              </h4>
              <p className="text-sm text-gray-600">
                Connect with Vector DB to generate customized conversations
                based on user expressions.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                🎯 Expression Analysis
              </h4>
              <p className="text-sm text-gray-600">
                Precisely analyze the accuracy and context of expressions used
                by users through embeddings.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                🔗 Custom Integration
              </h4>
              <p className="text-sm text-gray-600">
                Easily integrate your own LLM/RAG systems.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
