import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export interface ProcessResult {
  response: string;
  expressionUsed?: string;
  isCorrect?: boolean;
}

export class OpenAIService {
  /**
   * 시나리오 생성
   */
  async generateScenario(expressions: string[]): Promise<string> {
    try {
      const expressionsText =
        expressions.length > 0
          ? expressions.map((expr) => `"${expr}"`).join(", ")
          : "general conversation";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a conversation scenario generator. Create a realistic scenario for English conversation practice.
            
            If expressions are provided, create a scenario where someone would naturally use them.
            If no expressions are provided, create a general conversation scenario.
            
            Respond with a brief, engaging scenario description in one sentence.`,
          },
          {
            role: "user",
            content: `Create a scenario for: ${expressionsText}`,
          },
        ],
        temperature: 0.7,
      });

      return (
        response.choices[0].message.content ||
        "Practice English conversation in a natural setting."
      );
    } catch (error) {
      console.error("OpenAI Scenario Generation Error:", error);
      return "Practice English conversation in a natural setting.";
    }
  }

  /**
   * 사용자 메시지 처리 (Original Chat 모드)
   */
  async processUserMessage(
    userMessage: string,
    targetExpressions: string[]
  ): Promise<ProcessResult> {
    try {
      if (targetExpressions.length === 0) {
        // 일반 대화 모드
        return await this.generateAIResponse(userMessage);
      }

      // 표현식 연습 모드
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful conversation partner for English practice. The user is practicing these expressions: ${targetExpressions.join(
              ", "
            )}.
            
            Your role:
            1. Respond naturally to the user's message
            2. Keep the conversation flowing
            3. Be encouraging and supportive
            4. Respond in English only
            
            Keep your responses conversational and not too long.`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
      });

      const aiResponse =
        response.choices[0].message.content || "I understand. Please continue.";

      // 표현식 사용 여부 확인
      const evaluation = await this.evaluateExpressionUsage(
        userMessage,
        targetExpressions
      );

      return {
        response: aiResponse,
        expressionUsed: evaluation.expressionUsed,
        isCorrect: evaluation.isCorrect,
      };
    } catch (error) {
      console.error("OpenAI Message Processing Error:", error);
      return {
        response: "I understand. Please continue with the conversation.",
      };
    }
  }

  /**
   * AI 응답 생성 (AI Conversation 모드)
   */
  async generateAIResponse(userMessage: string): Promise<ProcessResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful conversation partner for English practice. Respond naturally to the user's message in English.
            
            Guidelines:
            - Keep responses conversational and engaging
            - Ask follow-up questions to keep the conversation going
            - Be encouraging and supportive
            - Respond in English only
            - Keep responses not too long`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
      });

      return {
        response:
          response.choices[0].message.content ||
          "I understand. Please continue.",
      };
    } catch (error) {
      console.error("OpenAI Response Generation Error:", error);
      return {
        response: "I understand. Please continue with the conversation.",
      };
    }
  }

  /**
   * 표현식 사용 평가
   */
  private async evaluateExpressionUsage(
    userMessage: string,
    targetExpressions: string[]
  ): Promise<{
    expressionUsed?: string;
    isCorrect?: boolean;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an English expression evaluator. Check if the user's message contains any of the target expressions.
            
            Target expressions: ${targetExpressions.join(", ")}
            
            Respond with JSON in this format:
            {
              "expressionUsed": "the expression that was used, or null if none",
              "isCorrect": true/false based on whether the expression was used correctly
            }
            
            Be lenient with minor variations and focus on whether the meaning was conveyed correctly.`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        expressionUsed: result.expressionUsed || undefined,
        isCorrect: result.isCorrect || false,
      };
    } catch (error) {
      console.error("Expression Evaluation Error:", error);
      return {};
    }
  }
}
