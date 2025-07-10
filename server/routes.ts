import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertExpressionSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import { aiService } from "./ai-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData);
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Expression routes
  app.get("/api/expressions", async (req, res) => {
    try {
      const expressions = await storage.getExpressions();
      res.json(expressions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expressions" });
    }
  });

  app.post("/api/expressions", async (req, res) => {
    try {
      const validatedData = insertExpressionSchema.parse(req.body);
      const expression = await storage.createExpression(validatedData);
      res.json(expression);
    } catch (error) {
      res.status(400).json({ message: "Invalid expression data" });
    }
  });

  app.patch("/api/expressions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertExpressionSchema.partial().parse(req.body);
      const expression = await storage.updateExpression(id, validatedData);
      res.json(expression);
    } catch (error) {
      res.status(400).json({ message: "Failed to update expression" });
    }
  });

  app.delete("/api/expressions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExpression(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete expression" });
    }
  });

  app.patch("/api/expressions/:id/stats", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isCorrect } = req.body;
      const expression = await storage.updateExpressionStats(id, isCorrect);
      res.json(expression);
    } catch (error) {
      res.status(400).json({ message: "Failed to update expression stats" });
    }
  });

  // Chat session routes
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/chat/active", async (req, res) => {
    try {
      const session = await storage.getActiveChatSession();
      res.json(session || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.patch("/api/chat/sessions/:id/end", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.endChatSession(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to end session" });
    }
  });

  // Chat message routes
  app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(validatedData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.patch("/api/chat/messages/:id", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { expressionUsed, isCorrect } = req.body;
      
      const updatedMessage = await storage.updateChatMessage(messageId, {
        expressionUsed,
        isCorrect,
      });
      
      res.json(updatedMessage);
    } catch (error) {
      res.status(400).json({ message: "Failed to update message" });
    }
  });

  // User stats routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Achievement routes
  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Generate conversation response with AI service
  app.post("/api/chat/respond", async (req, res) => {
    try {
      const { message, sessionId, selectedExpressions } = req.body;
      
      // Get conversation context
      const expressions = await storage.getExpressions();
      const messages = await storage.getChatMessages(sessionId);
      const session = await storage.getChatSessions();
      const currentSession = session.find(s => s.id === sessionId);
      
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      // Use only selected expressions if provided
      const targetExpressions = selectedExpressions && selectedExpressions.length > 0
        ? expressions.filter(expr => selectedExpressions.includes(expr.id))
        : expressions;

      // Prepare context for AI service
      const context = {
        userExpressions: targetExpressions,
        conversationHistory,
        scenario: currentSession?.scenario || "General conversation",
        messageCount: messages.filter(m => m.isUser).length,
      };

      // Manual expression detection for selected expressions
      let detectedExpression = null;
      let isCorrect = false;
      
      if (selectedExpressions && selectedExpressions.length > 0) {
        // Check if user message contains any of the selected expressions
        for (const exprId of selectedExpressions) {
          const expr = targetExpressions.find(e => e.id === exprId);
          if (expr) {
            const similarity = calculateSimilarity(message.toLowerCase(), expr.text.toLowerCase());
            if (similarity > 0.6) {
              detectedExpression = expr;
              isCorrect = similarity > 0.8;
              
              // Update expression stats
              await storage.updateExpressionStats(expr.id, isCorrect);
              break;
            }
          }
        }
      }

      // Generate AI response using Gemini or fallback
      let aiResponse;
      try {
        aiResponse = await aiService.generateResponseWithLLM(message, context);
      } catch (error) {
        console.log("AI service failed, using fallback response");
        // Fallback response system
        const scenarioResponses = selectedExpressions && selectedExpressions.length > 0
          ? getScenarioResponsesForSelectedExpressions(targetExpressions, messages.filter(m => m.isUser).length)
          : getScenarioResponses(targetExpressions, messages.filter(m => m.isUser).length);
        
        aiResponse = {
          response: scenarioResponses[Math.floor(Math.random() * scenarioResponses.length)],
          suggestionPrompt: "",
          detectedExpression: detectedExpression ? {
            id: detectedExpression.id,
            confidence: 0.8,
            isCorrect
          } : undefined,
          contextualSuggestions: []
        };
      }

      // Update expression stats if expression was detected by AI service
      if (aiResponse.detectedExpression && !detectedExpression) {
        detectedExpression = targetExpressions.find(e => e.id === aiResponse.detectedExpression.id);
        isCorrect = aiResponse.detectedExpression.isCorrect;
        await storage.updateExpressionStats(
          aiResponse.detectedExpression.id,
          aiResponse.detectedExpression.isCorrect
        );
      }

      // Check session completion if using selected expressions
      let sessionComplete = false;
      if (selectedExpressions && selectedExpressions.length > 0) {
        const usedExpressions = messages
          .filter(m => m.isUser && m.expressionUsed)
          .map(m => m.expressionUsed);
        
        if (detectedExpression) {
          usedExpressions.push(detectedExpression.id);
        }
        
        const uniqueUsedExpressions = [...new Set(usedExpressions)];
        sessionComplete = uniqueUsedExpressions.length >= selectedExpressions.length;
      }

      // Save the AI response as a chat message
      await storage.createChatMessage({
        sessionId: sessionId,
        content: sessionComplete 
          ? `${aiResponse.response}\n\n🎉 축하합니다! 모든 표현을 성공적으로 사용했습니다. 연습 세션이 완료되었습니다!`
          : aiResponse.response,
        isUser: false,
        expressionUsed: null,
        isCorrect: null,
      });

      // End session if complete
      if (sessionComplete) {
        await storage.endChatSession(sessionId);
      }
      
      res.json({ 
        response: aiResponse.response,
        suggestionPrompt: aiResponse.suggestionPrompt || "",
        usedExpression: detectedExpression?.id || null,
        isCorrect: isCorrect,
        contextualSuggestions: aiResponse.contextualSuggestions || [],
        sessionComplete,
        detectedExpression: detectedExpression ? {
          id: detectedExpression.id,
          text: detectedExpression.text,
          isCorrect
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // New endpoint for configuring AI service
  app.post("/api/ai/config", async (req, res) => {
    try {
      const { openaiApiKey, anthropicApiKey, cohereApiKey, pineconeApiKey, customEndpoint } = req.body;
      
      aiService.updateConfig({
        openaiApiKey,
        anthropicApiKey,
        cohereApiKey,
        pineconeApiKey,
        customEndpoint,
      });
      
      res.json({ message: "AI configuration updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update AI configuration" });
    }
  });

  // Endpoint for testing custom LLM integration
  app.post("/api/ai/test", async (req, res) => {
    try {
      const { message, customEndpoint } = req.body;
      
      if (customEndpoint) {
        // Test the custom endpoint
        const testResponse = await fetch(customEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, message }),
        });
        
        if (testResponse.ok) {
          const data = await testResponse.json();
          res.json({ success: true, response: data });
        } else {
          res.status(400).json({ success: false, error: 'Endpoint not reachable' });
        }
      } else {
        res.status(400).json({ success: false, error: 'No endpoint provided' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to test endpoint' });
    }
  });

  function calculateSimilarity(str1: string, str2: string): number {
    // Remove punctuation and convert to lowercase
    const clean1 = str1.replace(/[^\w\s]/g, '').toLowerCase();
    const clean2 = str2.replace(/[^\w\s]/g, '').toLowerCase();
    
    // Check for exact match first
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 1.0;
    }
    
    // Word-based similarity
    const words1 = clean1.split(/\s+/).filter(w => w.length > 1);
    const words2 = clean2.split(/\s+/).filter(w => w.length > 1);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    // Lower threshold for shorter expressions
    return similarity;
  }

  function getScenarioResponsesForSelectedExpressions(expressions: any[], messageCount: number): string[] {
    const expressionTexts = expressions.map(e => `"${e.text}"`).slice(0, 3).join(", ");
    
    if (messageCount < 3) {
      return [
        `Great! Try using expressions like ${expressionTexts} in our conversation.`,
        `Perfect start! Can you incorporate ${expressionTexts} naturally into your responses?`,
        `Excellent! I'd love to hear you use expressions such as ${expressionTexts}.`,
      ];
    } else if (messageCount < 6) {
      return [
        `You're doing well! Remember to practice with ${expressionTexts} when appropriate.`,
        `Nice flow! Try to naturally include ${expressionTexts} in your next responses.`,
        `Great conversation! Can you work in expressions like ${expressionTexts}?`,
      ];
    } else {
      return [
        `Excellent practice! Keep using those expressions like ${expressionTexts}.`,
        `You're really improving! Continue incorporating ${expressionTexts} naturally.`,
        `Amazing job! These expressions ${expressionTexts} are becoming more natural for you.`,
      ];
    }
  }

  function getScenarioResponses(expressions: any[], messageCount: number): string[] {
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

  const httpServer = createServer(app);
  return httpServer;
}
