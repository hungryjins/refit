import type { Expression } from "@shared/schema";

export class ConversationEngine {
  private scenarios = [
    {
      name: "Coffee Shop",
      prompts: [
        "You're at a coffee shop. How would you greet the barista?",
        "You want to order your favorite drink. What would you say?",
        "You need to ask about the price. How would you inquire politely?",
        "You want to compliment the coffee. What would you say?",
        "You're ready to pay. How would you ask for the bill?",
      ]
    },
    {
      name: "Restaurant",
      prompts: [
        "You've just arrived at a restaurant. How would you greet the host?",
        "You need a table for two. What would you say?",
        "You're ready to order. How would you get the waiter's attention?",
        "You want to ask about ingredients. How would you inquire?",
        "The food was excellent. How would you compliment the chef?",
      ]
    },
    {
      name: "Shopping",
      prompts: [
        "You're looking for a specific item in a store. How would you ask for help?",
        "You want to know the price of something. What would you say?",
        "You need a different size. How would you make this request?",
        "You want to return an item. How would you explain the situation?",
        "You're happy with your purchase. How would you express satisfaction?",
      ]
    },
    {
      name: "Travel",
      prompts: [
        "You're lost and need directions. How would you ask for help?",
        "You want to book a hotel room. What would you say?",
        "You need information about local attractions. How would you inquire?",
        "You want to thank someone for their help. What would you say?",
        "You're checking out of your hotel. How would you express gratitude?",
      ]
    },
  ];

  generatePrompt(userExpressions: Expression[], conversationContext: string[] = []): string {
    const scenario = this.scenarios[Math.floor(Math.random() * this.scenarios.length)];
    const prompt = scenario.prompts[Math.floor(Math.random() * scenario.prompts.length)];
    
    return prompt;
  }

  generateResponse(userMessage: string, userExpressions: Expression[]): string {
    const responses = [
      "That's perfect! Your pronunciation sounds great.",
      "Excellent! That's exactly how a native speaker would say it.",
      "Great job! Now let's try using another expression.",
      "Wonderful! I can see you're making real progress.",
      "Nice work! That expression fits perfectly in this context.",
      "Fantastic! You're really getting the hang of this.",
      "Perfect! That's a very natural way to express that.",
      "Well done! Your English is improving so much.",
    ];
    
    const encouragements = [
      "Keep up the great work!",
      "You're doing amazing!",
      "I'm impressed with your progress!",
      "Your confidence is really showing!",
      "You're a natural at this!",
    ];
    
    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    return `${baseResponse} ${encouragement}`;
  }

  detectExpressionUsage(userMessage: string, expressions: Expression[]): Expression | null {
    const message = userMessage.toLowerCase();
    
    for (const expression of expressions) {
      const expressionText = expression.text.toLowerCase();
      
      // Check for exact match or partial match (at least 70% similarity)
      if (message.includes(expressionText) || this.calculateSimilarity(message, expressionText) > 0.7) {
        return expression;
      }
    }
    
    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  isCorrectUsage(userMessage: string, expression: Expression): boolean {
    // Simple heuristic: if the expression is detected in the message, it's considered correct
    // In a real app, this could use more sophisticated NLP
    return this.detectExpressionUsage(userMessage, [expression]) !== null;
  }
}

export const conversationEngine = new ConversationEngine();
