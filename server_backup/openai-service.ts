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
            
            Evaluate with these SPECIFIC criteria:
            1. EXACT MATCH: Did they use the exact target expression? (Mark as "exact")
            2. SEMANTIC EQUIVALENT: Did they use a semantically equivalent phrase with same structure?
               - "Have a wonderful day" ≈ "Have a good/great/nice day" (CORRECT as "equivalent")
               - "Nice to meet you" ≈ "Good to meet you" / "Pleased to meet you" (CORRECT as "equivalent") 
               - "Could you please help me" ≈ "Can you please help me" (CORRECT as "equivalent")
            3. DIFFERENT STRUCTURE: Did they express same meaning but different grammar structure?
               - "Can I get something?" vs "I would like to get something" (INCORRECT - different structure)
               - "How are you?" vs "How do you do?" (INCORRECT - different structure)
            4. Focus on phrase structure similarity, not just meaning

            Response categories:
            - "exact": Used exact target expression
            - "equivalent": Used semantically equivalent phrase with same structure  
            - "incorrect": Wrong structure or didn't use target expression

            Respond with JSON:
            {
              "usedTargetExpression": boolean (true if exact or equivalent match),
              "isCorrect": boolean (true if exact or equivalent match),
              "matchType": "exact" | "equivalent" | "incorrect",
              "feedback": "Korean feedback message based on match type",
              "corrections": "corrections if needed",
              "sessionComplete": boolean (true if exact or equivalent match)
            }

            Important: For "equivalent" matches, set both usedTargetExpression=true AND isCorrect=true`
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

  /**
   * AI 대화 모드용 응답 생성
   */
  async generateConversationResponse(context: {
    userMessage: string;
    userExpressions: Expression[];
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    scenario: string;
  }): Promise<{
    response: string;
    usedExpression?: string;
    feedback?: string;
  }> {
    try {
      // 사용자가 표현을 사용했는지 확인
      let usedExpression: string | undefined;
      for (const expr of context.userExpressions) {
        if (context.userMessage.toLowerCase().includes(expr.text.toLowerCase())) {
          usedExpression = expr.text;
          break;
        }
      }

      let systemPrompt = `You are a friendly English conversation partner helping someone practice specific expressions.

The user is practicing these expressions: ${context.userExpressions.map(e => `"${e.text}"`).join(', ')}

Continue the conversation naturally. If the user used one of their target expressions, acknowledge it positively. If they haven't used any expressions yet, gently encourage them to try using one.

Respond in Korean to be supportive, but keep the conversation context in English.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...context.conversationHistory,
          {
            role: "user",
            content: context.userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      let responseText = response.choices[0].message.content || "계속해보세요!";

      // 표현 사용 시 피드백 추가
      let feedback: string | undefined;
      if (usedExpression) {
        feedback = `"${usedExpression}" 표현을 성공적으로 사용했습니다!`;
        responseText += `\n\n훌륭합니다! "${usedExpression}" 표현을 잘 사용하셨네요! 👏`;
      }

      return {
        response: responseText,
        usedExpression,
        feedback
      };

    } catch (error) {
      console.error('AI Conversation Generation Error:', error);
      return {
        response: "죄송합니다. 다시 시도해주세요.",
        feedback: "오류가 발생했습니다."
      };
    }
  }
}

export const openaiService = new OpenAIService();