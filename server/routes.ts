import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertExpressionSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import { aiService } from "./ai-service";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const { message, sessionId } = req.body;
      
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

      // Prepare context for AI service
      const context = {
        userExpressions: expressions,
        conversationHistory,
        scenario: currentSession?.scenario || "General conversation",
        messageCount: messages.filter(m => m.isUser).length,
      };

      // Generate AI response
      const aiResponse = await aiService.generateResponseWithLLM(message, context);

      // Update expression stats if expression was detected
      if (aiResponse.detectedExpression) {
        await storage.updateExpressionStats(
          aiResponse.detectedExpression.id,
          aiResponse.detectedExpression.isCorrect
        );
      }
      
      res.json({ 
        response: aiResponse.response,
        suggestionPrompt: aiResponse.suggestionPrompt,
        usedExpression: aiResponse.detectedExpression?.id || null,
        isCorrect: aiResponse.detectedExpression?.isCorrect || false,
        contextualSuggestions: aiResponse.contextualSuggestions,
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
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
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
