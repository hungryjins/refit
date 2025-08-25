import type { Expression } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";

export interface AIServiceConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  cohereApiKey?: string;
  pineconeApiKey?: string;
  customEndpoint?: string;
}

export interface ConversationContext {
  userExpressions: Expression[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  scenario: string;
  messageCount: number;
}

export interface AIResponse {
  response: string;
  suggestionPrompt: string;
  detectedExpression?: {
    id: number;
    confidence: number;
    isCorrect: boolean;
  };
  contextualSuggestions?: string[];
}

export class AIService {
  private config: AIServiceConfig;
  private geminiAI: GoogleGenAI;

  constructor(config: AIServiceConfig = {}) {
    this.config = config;
    this.geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async generateResponse(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // For now, use the existing logic while preparing for LLM integration
    const detectedExpression = this.detectExpressionUsage(userMessage, context.userExpressions);
    
    // Generate contextual response based on conversation flow
    const response = this.generateContextualResponse(context);
    const suggestionPrompt = this.generateSuggestion(context);
    
    return {
      response,
      suggestionPrompt,
      detectedExpression,
      contextualSuggestions: this.getContextualSuggestions(context),
    };
  }

  async generateResponseWithLLM(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // Use Gemini AI as primary LLM
    if (process.env.GEMINI_API_KEY) {
      return this.generateWithGemini(userMessage, context);
    } else if (this.config.openaiApiKey) {
      return this.generateWithOpenAI(userMessage, context);
    } else if (this.config.anthropicApiKey) {
      return this.generateWithAnthropic(userMessage, context);
    } else if (this.config.customEndpoint) {
      return this.generateWithCustomEndpoint(userMessage, context);
    }
    
    // Fallback to rule-based system
    return this.generateResponse(userMessage, context);
  }

  private async generateWithGemini(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      const prompt = this.buildGeminiPrompt(userMessage, context);
      
      const response = await this.geminiAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const aiResponse = response.text || "I didn't understand that. Could you try again?";
      
      // Detect expression usage in user message
      const detectedExpression = this.detectExpressionUsage(userMessage, context.userExpressions);
      
      // Generate suggestion based on context
      const suggestionPrompt = this.generateSuggestion(context);

      return {
        response: aiResponse,
        suggestionPrompt,
        detectedExpression,
        contextualSuggestions: this.getContextualSuggestions(context),
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to rule-based system
      return this.generateResponse(userMessage, context);
    }
  }

  private async generateWithOpenAI(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // OpenAI integration placeholder
    // You can implement this with your preferred OpenAI setup
    const prompt = this.buildLLMPrompt(userMessage, context);
    
    // TODO: Implement OpenAI API call
    // const response = await openai.chat.completions.create({...})
    
    return this.generateResponse(userMessage, context);
  }

  private async generateWithAnthropic(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // Anthropic integration placeholder
    return this.generateResponse(userMessage, context);
  }

  private async generateWithCustomEndpoint(
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // Custom endpoint integration for your own LLM/RAG system
    const prompt = this.buildLLMPrompt(userMessage, context);
    
    try {
      const response = await fetch(this.config.customEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userMessage,
          context,
          expressions: context.userExpressions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          response: data.response || "I understand. Let's continue our conversation.",
          suggestionPrompt: data.suggestion || this.generateSuggestion(context),
          detectedExpression: data.detectedExpression,
          contextualSuggestions: data.suggestions || this.getContextualSuggestions(context),
        };
      }
    } catch (error) {
      console.error('Custom endpoint error:', error);
    }
    
    // Fallback to rule-based system
    return this.generateResponse(userMessage, context);
  }

  private buildGeminiPrompt(userMessage: string, context: ConversationContext): string {
    const expressionsList = context.userExpressions
      .map(expr => `- "${expr.text}" (${expr.category || 'general'})`)
      .join('\n');

    const conversationHistory = context.conversationHistory
      .slice(-4) // Last 4 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `You are Refit, an encouraging English conversation practice assistant. Help users improve their speaking skills naturally.

User's expressions to practice:
${expressionsList}

Recent conversation:
${conversationHistory}

Scenario: ${context.scenario}
Message count: ${context.messageCount}

User said: "${userMessage}"

Response guidelines:
- Be encouraging and supportive
- Keep responses natural and conversational
- Gently encourage using their saved expressions when appropriate
- Provide helpful feedback on their English usage
- Keep responses to 1-2 sentences for natural flow
- Match their energy level and topic interest

Respond as Refit:`;
  }

  private buildLLMPrompt(userMessage: string, context: ConversationContext): string {
    const expressionsList = context.userExpressions
      .map(expr => `- "${expr.text}" (${expr.category || 'general'})`)
      .join('\n');

    const conversationHistory = context.conversationHistory
      .slice(-6) // Last 6 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `
You are an English conversation practice partner. Your goal is to help the user practice specific English expressions in natural conversation scenarios.

Current scenario: ${context.scenario}

User's expressions to practice:
${expressionsList}

Recent conversation:
${conversationHistory}

User's latest message: "${userMessage}"

Instructions:
1. Respond naturally to continue the conversation
2. Try to create opportunities for the user to practice their saved expressions
3. If the user used one of their expressions, acknowledge it positively
4. Suggest which expression they could try next
5. Keep responses conversational and encouraging
6. Gradually increase complexity as the conversation progresses

Respond with a JSON object containing:
- response: Your conversational response
- suggestion: Hint about which expression to try next
- detectedExpression: If user used an expression, include {id, confidence, isCorrect}
- suggestions: Array of contextual tips
    `;
  }

  private detectExpressionUsage(
    userMessage: string,
    expressions: Expression[]
  ): { id: number; confidence: number; isCorrect: boolean } | undefined {
    const messageText = userMessage.toLowerCase();
    
    for (const expr of expressions) {
      const exprText = expr.text.toLowerCase();
      const similarity = this.calculateSimilarity(messageText, exprText);
      
      if (messageText.includes(exprText) || similarity > 0.6) {
        return {
          id: expr.id,
          confidence: similarity,
          isCorrect: true, // Simple heuristic for now
        };
      }
    }
    
    return undefined;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private generateContextualResponse(context: ConversationContext): string {
    const responses = this.getResponsesByMessageCount(context.messageCount);
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateSuggestion(context: ConversationContext): string {
    const unusedExpressions = context.userExpressions.filter(expr => 
      !context.conversationHistory.some(msg => 
        msg.role === 'user' && msg.content.toLowerCase().includes(expr.text.toLowerCase())
      )
    );

    if (unusedExpressions.length > 0) {
      const randomExpr = unusedExpressions[Math.floor(Math.random() * unusedExpressions.length)];
      return `Try using: "${randomExpr.text}"`;
    }

    return "Great conversation! Keep practicing with your expressions.";
  }

  private getContextualSuggestions(context: ConversationContext): string[] {
    const suggestions = [
      "Use polite language to show respect",
      "Try asking follow-up questions",
      "Express your opinion clearly",
      "Use transition words to connect ideas",
    ];

    return suggestions.slice(0, 2);
  }

  private getResponsesByMessageCount(messageCount: number): string[] {
    if (messageCount < 3) {
      return [
        "That's a great start! Tell me more about what you're thinking.",
        "Perfect! I can see you're comfortable with conversation. What would you like to discuss next?",
        "Excellent! Now, let's continue this conversation. How would you respond in this situation?",
      ];
    } else if (messageCount < 6) {
      return [
        "Wonderful! You're really getting into the flow. What's your opinion on this topic?",
        "Great! Now let's try a different angle. How would you express agreement or disagreement?",
        "Nice work! Let's practice asking questions. What would you like to know more about?",
      ];
    } else {
      return [
        "Amazing progress! You're having a natural conversation. Let's wrap up - how would you say goodbye?",
        "Fantastic! You've used several expressions well. How would you summarize our conversation?",
        "Excellent practice session! What did you learn from our conversation today?",
      ];
    }
  }

  // Method to update configuration at runtime
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const aiService = new AIService();