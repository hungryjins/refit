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
      let feedbackMessage = "";
      
      // Handle START_SESSION - generate initial scenario message
      if (message === "START_SESSION") {
        const selectedExprs = targetExpressions;
        const responses = getScenarioResponsesForSelectedExpressions(selectedExprs, 0);
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const newMessage = await storage.createChatMessage({
          sessionId: sessionId,
          content: randomResponse,
          isUser: false,
          expressionUsed: null,
          isCorrect: null,
        });
        
        return res.json({ 
          response: randomResponse, 
          messageId: newMessage.id,
          detectedExpression: null
        });
      }

      if (selectedExpressions && selectedExpressions.length > 0) {
        // Check if user message contains any of the selected expressions
        for (const exprId of selectedExpressions) {
          const expr = targetExpressions.find(e => e.id === exprId);
          if (expr) {
            const similarity = calculateSimilarity(message.toLowerCase(), expr.text.toLowerCase());
            if (similarity > 0.6) {
              detectedExpression = expr;
              isCorrect = similarity > 0.8;
              
              if (isCorrect) {
                feedbackMessage = `✅ 훌륭합니다! "${expr.text}" 표현을 정확하게 사용했습니다!`;
              } else {
                feedbackMessage = `⚠️ 좋은 시도입니다! "${expr.text}" 표현과 비슷하지만 조금 더 정확하게 사용해보세요.`;
              }
              
              // Update expression stats
              await storage.updateExpressionStats(expr.id, isCorrect);
              break;
            }
          }
        }
        
        // If no expression was detected, don't give explicit feedback - let the conversation flow naturally
        if (!detectedExpression) {
          feedbackMessage = ""; // Remove explicit prompting
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

      // Combine AI response with feedback
      let finalResponse = aiResponse.response;
      if (feedbackMessage) {
        finalResponse = `${feedbackMessage}\n\n${aiResponse.response}`;
      }
      
      if (sessionComplete) {
        finalResponse += `\n\n🎉 축하합니다! 모든 표현을 성공적으로 사용했습니다. 연습 세션이 완료되었습니다!`;
      }

      // Save the AI response as a chat message
      await storage.createChatMessage({
        sessionId: sessionId,
        content: finalResponse,
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
    const remainingExpressions = expressions.filter(expr => {
      // This would need to check against used expressions in a real implementation
      return true; // For now, assume all are remaining
    });
    
    if (messageCount === 0 || message === "START_SESSION") {
      // Initial scenario setup based on selected expressions
      const firstExpression = expressions[0];
      
      if (expressions.some(e => e.text.toLowerCase().includes("coffee") || e.text.toLowerCase().includes("order"))) {
        return [
          `☕ *You walk into a busy coffee shop. The barista looks up with a friendly smile as you approach the counter.* Good morning! *I wipe my hands on my apron and give you my full attention.* Welcome to Daily Brew! You've got perfect timing - we just finished brewing a fresh batch of our signature roast. *I gesture to the menu board above.* First time here? Our regulars love the caramel macchiato, but honestly, everything's pretty amazing. *I wait expectantly with a pen ready.*`,
          `☕ *The coffee shop is bustling with the morning rush. You're next in line and I greet you with enthusiasm.* Morning! *I smile warmly.* You look like you could use some serious caffeine today! *I chuckle.* Lucky for you, we've got exactly what you need. Our espresso is pulling perfectly this morning. *I lean forward slightly.* So, what's going to make your day better?`,
          `☕ *You enter the cozy neighborhood coffee shop. I'm behind the counter organizing cups when I notice you studying the menu.* Hey there! *I approach with a welcoming smile.* Take your time with the menu - I know it can be overwhelming with all the options. *I pause.* But between you and me, if you're looking for something really special, our house blend with a splash of vanilla is incredible. *I wait for your response.*`
        ];
      } else if (expressions.some(e => e.text.toLowerCase().includes("nice to meet") || e.text.toLowerCase().includes("hello") || e.text.toLowerCase().includes("good"))) {
        return [
          `👋 *I'm sitting alone at a cafe reading when you walk in. I look up with a friendly smile and wave.* Oh, hello there! *I close my book and gesture to the empty chair across from me.* You look familiar - I think we might have seen each other around the neighborhood before, but we've never actually been introduced. *I extend my hand with a warm smile.* I'm Sarah, by the way.`,
          `👋 *It's your first day at a new job. I'm in the break room making coffee when you walk in looking a bit nervous.* Hey! *I turn around with a welcoming smile.* You must be the new person everyone's been talking about! *I walk over and extend my hand.* I'm Mike from the marketing department. I've been working here for about three years now.`,
          `👋 *We're both at a local community event. I've been wanting to introduce myself all evening and finally approach you.* Excuse me, hi! *I say with a genuine smile.* I've been admiring your confidence all evening - you seem to know everyone here! *I extend my hand.* I'm Jessica, and I just moved to this neighborhood last month.`
        ];
      } else if (expressions.some(e => e.text.toLowerCase().includes("thank") || e.text.toLowerCase().includes("help"))) {
        return [
          `🤝 *You're standing in a busy shopping mall looking confused at the directory map. I'm walking by and notice you seem lost.* Oh, you look like you might need some directions! *I approach with a helpful smile.* I work here and know this place like the back of my hand. *I point to the map.* Are you trying to find a specific store? I'd be happy to point you in the right direction - this mall can be pretty confusing, especially if it's your first time here.`,
          `🤝 *You're in the library looking frustrated while searching through the shelves. I'm the librarian and I walk over.* I couldn't help but notice you've been searching for a while. *I say gently.* Our system can be a bit tricky sometimes. *I gesture toward the computer terminal.* I just helped someone find exactly what they were looking for - let me see if I can do the same for you. What book are you trying to track down?`,
          `🤝 *You're at the train station with luggage, checking your phone and looking at the signs repeatedly. I'm a local who notices your confusion.* Hey there! *I approach with a friendly smile.* You look like you might be trying to figure out the train system. *I chuckle.* It took me months to understand it when I first moved here. *I point to your luggage.* Are you heading somewhere specific? I take this route every day for work - I'd be glad to help you figure out which platform you need.`
        ];
      } else {
        // Generic scenario that can work with any expression
        const targetExpression = firstExpression?.text || "a friendly greeting";
        return [
          `🌟 Let's practice! Imagine we're meeting at a friendly neighborhood cafe. I'm sitting at a nearby table and we make eye contact. This is the perfect moment to use "${targetExpression}" naturally in our conversation. How would you start?`,
          `🌟 Picture this: We're both waiting at a bus stop on a pleasant morning. I'm reading a book but look up when you arrive. This is a great opportunity to practice "${targetExpression}" in a natural way. What would you say?`,
          `🌟 Scenario: We're at a local community event where people are mingling and getting to know each other. I'm standing near the refreshment table when I see you. This is the perfect setting to use "${targetExpression}" naturally. How do you begin?`
        ];
      }
    } else {
      // Continue natural conversation based on context
      if (expressions.some(e => e.text.toLowerCase().includes("coffee") || e.text.toLowerCase().includes("order"))) {
        return [
          `*I nod and smile while writing on my notepad.* Perfect choice! And would you like that hot or iced today? *I look up from my notes.* Also, we have some amazing pastries that pair really well with that drink if you're interested.`,
          `*I start preparing your order.* Great selection! You know, you picked one of my personal favorites. *I work efficiently while talking.* Have you tried our loyalty program? You get every tenth drink free.`,
          `*I punch your order into the register.* Excellent! That'll be ready in just a few minutes. *I smile.* Oh, and just so you know, we're featuring a new seasonal flavor this week if you want to try something different next time.`
        ];
      } else if (expressions.some(e => e.text.toLowerCase().includes("nice to meet") || e.text.toLowerCase().includes("hello") || e.text.toLowerCase().includes("good"))) {
        return [
          `*I smile warmly and settle into my chair.* That's wonderful! I love meeting new people from the neighborhood. *I lean forward with interest.* What brought you to this area? Work, family, or just looking for a change of scenery?`,
          `*I grin and relax visibly.* Fantastic! It's always exciting to meet someone new. *I gesture around.* Have you had a chance to explore much of the neighborhood yet? There are some hidden gems around here that most people don't know about.`,
          `*My face lights up.* How wonderful! I've been hoping to meet more people in the area. *I sit back comfortably.* So tell me, what's your story? Are you originally from around here, or did you move from somewhere else?`
        ];
      } else {
        return [
          `*I listen intently and nod.* That sounds really interesting! Tell me more about that - I'd love to hear the details.`,
          `*I smile encouragingly.* Oh, that's fascinating! You seem to have a lot of experience with that. What's been the most rewarding part?`,
          `*I lean in with genuine curiosity.* That's really cool! I've always been curious about that kind of thing. How did you get started with it?`
        ];
      }
    }
    
    return [
      "That's wonderful! Keep practicing - you're doing great!",
      "Excellent! Your English is really improving.",
      "Perfect! You're using natural expressions well."
    ];
  }

  function getPromptForExpression(expression: any): string {
    const text = expression.text.toLowerCase();
    
    if (text.includes("coffee") || text.includes("order") || text.includes("like")) {
      return `Perfect! Our barista special today is an iced caramel latte. The menu has so many options - what catches your eye?`;
    } else if (text.includes("nice to meet") || text.includes("good") || text.includes("hello")) {
      return `That's wonderful! I'm really glad we had the chance to meet. What brings you to this area today?`;
    } else if (text.includes("excuse me") || text.includes("sorry")) {
      return `No problem at all! I was actually hoping someone would ask. I love helping people around here. What do you need to know?`;
    } else if (text.includes("help") || text.includes("could") || text.includes("would")) {
      return `Of course! I'd be happy to help you with that. I know this area really well and can give you great directions.`;
    } else if (text.includes("thank") || text.includes("appreciate")) {
      return `You're so welcome! It was my pleasure to help. I hope you have a wonderful rest of your day!`;
    } else {
      return `That's interesting! Tell me more about that. I'm curious to hear your thoughts on this.`;
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
