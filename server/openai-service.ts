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
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a conversation scenario generator. Create a realistic scenario where someone would naturally use the expression "${expression.text}". 
            
            Respond with JSON in this format:
            {
              "scenario": "Brief one-sentence description of the situation",
              "initialMessage": "What the other person (like staff, friend, etc.) would say to start the conversation"
            }
            
            Make it natural and conversational in English.`
          },
          {
            role: "user", 
            content: `Create a scenario for the expression: "${expression.text}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        scenario: result.scenario || `Situation where you might say "${expression.text}"`,
        initialMessage: result.initialMessage || "Hello, how can I help you?"
      };
    } catch (error) {
      console.error('OpenAI Scenario Generation Error:', error);
      return {
        scenario: `Practice using: "${expression.text}"`,
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
            content: `You are a very encouraging English conversation tutor who focuses on successful communication rather than perfect grammar. Be lenient with minor errors and emphasize positive achievements.

            Target expression: "${targetExpression.text}"
            Scenario: ${context.scenario}
            
            Evaluate with these VERY LENIENT criteria:
            1. Did they use the target expression or semantically equivalent phrases?
               - "Have a wonderful day" = "Have a good day" = "Have a great day" = "Have a nice day" (ALL CORRECT)
               - "Nice to meet you" = "Good to meet you" = "Pleased to meet you" (ALL CORRECT)
            2. Is the meaning and intent clear?
            3. Ignore minor grammar, spelling, capitalization differences
            4. Focus on successful communication, not perfect wording

            BE VERY LENIENT: If they expressed the same meaning/intent as the target expression, mark it as correct!

            Respond with JSON:
            {
              "usedTargetExpression": boolean,
              "isCorrect": boolean (true if expression used with clear meaning - ignore minor errors),
              "feedback": "Very encouraging Korean feedback message",
              "corrections": "Only major corrections if absolutely necessary (optional)",
              "sessionComplete": boolean (true if expression used correctly)
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
        feedback: result.feedback || "Keep practicing!",
        corrections: result.corrections,
        sessionComplete: result.sessionComplete || false
      };
    } catch (error) {
      console.error('OpenAI Evaluation Error:', error);
      return {
        usedTargetExpression: false,
        isCorrect: false,
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