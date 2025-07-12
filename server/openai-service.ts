import OpenAI from "openai";
import { Expression } from "../shared/schema.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface ConversationContext {
  targetExpression: Expression;
  scenario: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ScenarioResponse {
  scenario: string;
  initialMessage: string;
}

export interface EvaluationResult {
  usedTargetExpression: boolean;
  isCorrect: boolean;
  matchType?: "exact" | "equivalent" | "incorrect";
  feedback: string;
  corrections?: string;
  sessionComplete: boolean;
}

export class OpenAIService {
  
  /**
   * 1단계: 선택된 표현을 위한 시나리오와 초기 대화 생성
   */
  async generateScenario(expression: Expression): Promise<ScenarioResponse> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `영어 회화 연습을 위한 시나리오를 생성하세요. 타겟 표현 "${expression.text}"이 자연스럽게 사용될 수 있는 상황을 만드세요.
            
            JSON 형식으로 응답하세요:
            {
              "scenario": "상황을 한 문장으로 간단하게 설명 (한국어)",
              "initialMessage": "역할과 함께 상대방의 첫 번째 대화 (예: '카페 직원: Hello, what can I get for you?')"
            }
            
            자연스럽고 현실적으로 만드세요.`
          },
          {
            role: "user", 
            content: `타겟 표현: "${expression.text}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        scenario: result.scenario || `"${expression.text}" 표현을 연습하는 상황`,
        initialMessage: result.initialMessage || "Hello! How can I help you today?"
      };
    } catch (error) {
      console.error('OpenAI Scenario Generation Error:', error);
      return {
        scenario: `"${expression.text}" 표현을 연습하는 상황`,
        initialMessage: "Hello! How can I help you today?"
      };
    }
  }

  /**
   * 2단계: 사용자 응답 평가 (텍스트 또는 음성)
   */
  async evaluateResponse(
    userResponse: string, 
    targetExpression: Expression,
    context: ConversationContext
  ): Promise<EvaluationResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `당신은 영어 회화 평가 전문가입니다. 사용자가 타겟 표현을 사용했는지 평가하고, 문법이나 표현의 오류가 있으면 정정해주세요.

            타겟 표현: "${targetExpression.text}"
            상황: ${context.scenario}
            
            평가 기준:
            1. 타겟 표현 정확히 사용 → 정답
            2. 타겟 표현과 의미상 동등한 표현 사용 → 정답
            3. 타겟 표현을 사용하지 않음 → 오답
            4. 문법 오류나 어색한 표현이 있음 → 오답 + 정정

            JSON 형식으로 응답하세요:
            {
              "usedTargetExpression": boolean (타겟 표현 사용 여부),
              "isCorrect": boolean (정답 여부),
              "matchType": "exact" | "equivalent" | "incorrect",
              "feedback": "한국어로 피드백 메시지",
              "corrections": "오류가 있을 경우 정정된 표현",
              "sessionComplete": boolean (타겟 표현을 올바르게 사용했으면 true)
            }`
          },
          {
            role: "user",
            content: `User's response: "${userResponse}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        usedTargetExpression: result.usedTargetExpression || false,
        isCorrect: result.isCorrect || false,
        matchType: result.matchType || "incorrect",
        feedback: result.feedback || "Keep practicing!",
        corrections: result.corrections,
        sessionComplete: result.sessionComplete || false
      };
    } catch (error) {
      console.error('OpenAI Evaluation Error:', error);
      return {
        usedTargetExpression: false,
        isCorrect: false,
        matchType: "incorrect",
        feedback: "There was an error evaluating your response. Please try again.",
        sessionComplete: false
      };
    }
  }

  /**
   * 3단계: 음성을 텍스트로 변환 (Whisper API)
   */
  async transcribeAudio(audioFile: File): Promise<string> {
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en"
      });

      return transcription.text;
    } catch (error) {
      console.error('Whisper Transcription Error:', error);
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }

  /**
   * 4단계: 대화 계속하기 (표현을 아직 사용하지 않은 경우)
   */
  async continueConversation(
    userResponse: string,
    context: ConversationContext
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are playing a role in this scenario: ${context.scenario}
            
            The user needs to practice using this expression: "${context.targetExpression.text}"
            
            Continue the conversation naturally to encourage them to use the target expression.
            Keep responses short and conversational.`
          },
          ...context.conversationHistory,
          {
            role: "user",
            content: userResponse
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0].message.content || "Please continue...";
    } catch (error) {
      console.error('OpenAI Conversation Error:', error);
      return "Could you try that again?";
    }
  }
}

export const openaiService = new OpenAIService();