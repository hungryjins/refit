import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Bot } from "lucide-react";

export type PracticeMode = 'ai-conversation' | 'friends-script' | 'original';

interface PracticeModeProps {
  onModeSelect: (mode: PracticeMode) => void;
  selectedMode: PracticeMode | null;
}

export default function PracticeModeSelector({ onModeSelect, selectedMode }: PracticeModeProps) {
  const modes = [
    {
      id: 'original' as const,
      title: 'Original Chat',
      description: '기존의 표현 연습 채팅',
      icon: MessageSquare,
      features: ['표현별 시나리오', '정확도 평가', '진행률 추적'],
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      id: 'ai-conversation' as const,
      title: 'AI Conversation',
      description: 'OpenAI 기반 자유 대화',
      icon: Bot,
      features: ['자연스러운 대화', '실시간 피드백', '표현 유도'],
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      id: 'friends-script' as const,
      title: 'Friends Script',
      description: 'RAG 기반 대화 스크립트',
      icon: Users,
      features: ['실제 대화 패턴', '유사 표현 매칭', '스크립트 기반'],
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold gradient-text">Choose Practice Mode</h2>
        <p className="text-gray-600">Select your preferred conversation practice style</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          
          return (
            <Card 
              key={mode.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                mode.color
              } ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
              onClick={() => onModeSelect(mode.id)}
            >
              <CardHeader className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className={`p-3 rounded-full bg-white shadow-sm ${mode.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg">{mode.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{mode.description}</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {mode.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModeSelect(mode.id);
                  }}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedMode && (
        <div className="text-center">
          <Badge variant="outline" className="px-4 py-2">
            Selected: {modes.find(m => m.id === selectedMode)?.title}
          </Badge>
        </div>
      )}
    </div>
  );
}