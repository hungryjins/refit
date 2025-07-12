import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertExpressionSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import { openaiService } from "./openai-service";
import { sessionManager } from "./session-manager";
import { tutoringEngine } from "./tutoring-engine";

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

  app.patch("/api/stats", async (req, res) => {
    try {
      const updates = req.body;
      const stats = await storage.updateUserStats(updates);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user stats" });
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

  // New session-based conversation system  
  app.post("/api/chat/start-session", async (req, res) => {
    try {
      const { selectedExpressions } = req.body;
      
      if (!selectedExpressions || selectedExpressions.length === 0) {
        return res.status(400).json({ message: "No expressions selected" });
      }
      
      // SessionManager로 세션 생성
      const sessionState = await sessionManager.createSession(selectedExpressions);
      const currentExpression = sessionState.expressions[0];
      
      // 초기 메시지 가져오기
      const messages = await storage.getChatMessages(sessionState.sessionId);
      const initialMessage = messages[messages.length - 1];
      
      res.json({
        sessionId: sessionState.sessionId,
        targetExpression: currentExpression,
        scenario: initialMessage.content,
        initialMessage: initialMessage.content,
        messageId: initialMessage.id,
        progress: {
          completed: 0,
          total: sessionState.expressions.length,
          expressions: sessionState.expressions
        }
      });
      
    } catch (error) {
      console.error("Start session error:", error);
      res.status(500).json({ message: "Failed to start conversation session" });
    }
  });

  // Handle user responses and evaluation
  app.post("/api/chat/respond", async (req, res) => {
    try {
      const { message, sessionId, targetExpressionId } = req.body;
      
      if (!message || !sessionId || !targetExpressionId) {
        return res.status(400).json({ 
          message: "Message, sessionId, and targetExpressionId are required"
        });
      }
      
      // Get target expression
      const targetExpression = await storage.getExpressionById(targetExpressionId);
      if (!targetExpression) {
        return res.status(404).json({ message: "Target expression not found" });
      }
      
      // Get session and conversation history
      const session = await storage.getChatSessions();
      const activeSession = session.find(s => s.id === sessionId && s.isActive);
      if (!activeSession) {
        return res.status(404).json({ message: "Active session not found" });
      }
      
      const conversationHistory = await storage.getChatMessages(sessionId);
      
      // Create conversation context
      const context = {
        targetExpression,
        scenario: activeSession.scenario || "Conversation practice",
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.isUser ? 'user' as const : 'assistant' as const,
          content: msg.content
        }))
      };
      
      // Save user message first
      const userMessage = await storage.createChatMessage({
        sessionId: sessionId,
        content: message,
        isUser: true,
        expressionUsed: null,
        isCorrect: null,
      });
      
      // 현재 타겟 표현 가져오기
      const currentTargetExpression = sessionManager.getCurrentExpression(sessionId);
      if (!currentTargetExpression) {
        return res.status(400).json({ message: "No active expression for this session" });
      }
      
      // 평가 수행
      const evaluation = await openaiService.evaluateResponse(message, currentTargetExpression, context);
      
      // 사용자 메시지 업데이트
      await storage.updateChatMessage(userMessage.id, {
        expressionUsed: evaluation.usedTargetExpression ? currentTargetExpression.id : null,
        isCorrect: evaluation.isCorrect
      });
      
      // 표현 통계 업데이트 (모든 시도에 대해 기록)
      if (evaluation.isCorrect && (evaluation.matchType === "exact" || evaluation.matchType === "equivalent")) {
        await storage.updateExpressionStats(currentTargetExpression.id, true);
      } else {
        // 오답인 경우에도 통계 업데이트 (시도했으나 실패)
        await storage.updateExpressionStats(currentTargetExpression.id, false);
      }
      
      let botResponse = "";
      let sessionComplete = false;
      let nextExpression = null;
      
      if (evaluation.isCorrect && (evaluation.matchType === "exact" || evaluation.matchType === "equivalent")) {
        // 정답! (정확한 표현 또는 의미상 유사한 표현) - 다음 표현으로 진행 또는 세션 완료
        const result = await sessionManager.completeExpression(sessionId, currentTargetExpression.id);
        
        if (result.isSessionComplete) {
          botResponse = `🎉 축하합니다! 모든 표현을 완벽하게 완료했습니다!`;
          sessionComplete = true;
        } else {
          // 정확도에 따른 피드백 분기
          let successMessage = "";
          if (evaluation.matchType === "exact") {
            successMessage = `✨ 완벽합니다! "${currentTargetExpression.text}" 표현을 정확히 사용하셨어요!`;
          } else if (evaluation.matchType === "equivalent") {
            successMessage = `👍 적절한 표현을 사용했어요! 저장하신 표현은 "${currentTargetExpression.text}"입니다.`;
          }
          
          botResponse = `${successMessage}\n\n${result.nextMessage}`;
          nextExpression = result.nextExpression;
        }
      } else {
        // 오답 또는 미사용 - 오답으로 처리하고 다음 표현으로 진행
        const result = await sessionManager.completeExpression(sessionId, currentTargetExpression.id, false); // false = 오답 처리
        
        if (result.isSessionComplete) {
          botResponse = `🎉 모든 표현 연습이 완료되었습니다!`;
          sessionComplete = true;
        } else {
          let wrongMessage = "";
          if (evaluation.usedTargetExpression && !evaluation.isCorrect) {
            wrongMessage = `❌ 아쉬워요! 문맥상 같은 의미지만 저장된 표현을 쓰지 않았어요. 정답은 "${currentTargetExpression.text}"였습니다.`;
          } else {
            wrongMessage = `❌ ${evaluation.feedback || "다시 시도해보세요!"} 정답은 "${currentTargetExpression.text}"였습니다.`;
          }
          
          botResponse = `${wrongMessage}\n\n🎯 새로운 표현 연습!\n\n${result.nextMessage}`;
          nextExpression = result.nextExpression;
        }
      }
      
      // Create bot response message
      const botMessage = await storage.createChatMessage({
        sessionId: sessionId,
        content: botResponse,
        isUser: false,
        expressionUsed: null,
        isCorrect: null,
      });
      
      const progressData = sessionManager.getSessionProgress(sessionId);
      console.log('Sending progress data:', progressData);
      
      res.json({
        response: botResponse,
        messageId: botMessage.id,
        evaluation: evaluation,
        sessionComplete: sessionComplete,
        usedExpression: evaluation.usedTargetExpression ? currentTargetExpression.id : null,
        isCorrect: evaluation.isCorrect,
        nextExpression: nextExpression,
        progress: progressData
      });
      
    } catch (error) {
      console.error("Chat respond error:", error);
      res.status(500).json({ message: "Failed to process response" });
    }
  });

  // Audio transcription endpoint
  app.post("/api/chat/transcribe", async (req, res) => {
    try {
      if (!req.body.audio) {
        return res.status(400).json({ message: "Audio file is required" });
      }
      
      // Note: In a real implementation, you'd handle file upload properly
      // For now, we'll assume the audio is sent as a File object
      const transcription = await openaiService.transcribeAudio(req.body.audio);
      
      res.json({ transcription });
      
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Legacy endpoint compatibility - redirect to new system
  app.post("/api/chat/respond-old", async (req, res) => {
    try {
      const { message, sessionId, selectedExpressions } = req.body;
      
      if (!message || !sessionId) {
        return res.status(400).json({ message: "Message and sessionId are required" });
      }
      
      // Initialize session if not exists
      const expressions = await storage.getExpressions();
      const targetExpressions = selectedExpressions && selectedExpressions.length > 0
        ? expressions.filter(expr => selectedExpressions.includes(expr.id))
        : expressions;
        
      tutoringEngine.initializeSession(sessionId, targetExpressions);

      // 2. processUserAnswer
      const updateResult = tutoringEngine.processUserAnswer(sessionId, message);
      
      // Save user message with expression info
      const userMessage = await storage.createChatMessage({
        sessionId: sessionId,
        content: message,
        isUser: true,
        expressionUsed: updateResult.detectedExpressionId || null,
        isCorrect: updateResult.isCorrect,
      });
      
      console.log("Stored user message:", {
        content: message,
        expressionUsed: updateResult.detectedExpressionId,
        isCorrect: updateResult.isCorrect,
      });

      // Update expression stats if detected
      if (updateResult.detectedExpressionId) {
        await storage.updateExpressionStats(updateResult.detectedExpressionId, updateResult.isCorrect);
      }

      let finalResponse = updateResult.feedback;
      let summary = null;
      
      // If session is not complete, get next prompt
      if (!updateResult.sessionComplete) {
        // 3. getNextPrompt
        const nextPrompt = tutoringEngine.getNextPrompt(sessionId);
        finalResponse = `${updateResult.feedback}\n\n${nextPrompt}`;
      } else {
        // 4. shouldEndSession + 5. summarizeResults - get summary before cleanup
        summary = tutoringEngine.summarizeResults(sessionId);
        const summaryText = `🎉 축하합니다! 모든 표현을 성공적으로 사용했습니다!\n\n` +
          `📊 결과: ${summary.completedExpressions}/${summary.totalExpressions} 표현 완료\n` +
          `⏱️ 소요 시간: ${summary.sessionDuration}초\n` +
          `🎯 정확도: ${summary.correctUsages}/${summary.totalAttempts} 시도`;
        
        finalResponse = `${updateResult.feedback}\n\n${summaryText}`;
        
        // End session in storage
        await storage.endChatSession(sessionId);
        
        // Clean up tutoring engine session
        tutoringEngine.deleteSession(sessionId);
      }
      
      // Save AI response message to storage
      await storage.createChatMessage({
        sessionId: sessionId,
        content: finalResponse,
        isUser: false,
        expressionUsed: null,
        isCorrect: null,
      });


      
      res.json({ 
        response: finalResponse,
        suggestionPrompt: "",
        usedExpression: updateResult.detectedExpressionId || null,
        isCorrect: updateResult.isCorrect,
        contextualSuggestions: [],
        sessionComplete: updateResult.sessionComplete,
        sessionStats: updateResult.sessionComplete ? summary : null,
        detectedExpression: updateResult.detectedExpressionId ? {
          id: updateResult.detectedExpressionId,
          text: updateResult.detectedExpressionText,
          isCorrect: updateResult.isCorrect
        } : null,
        failedExpression: updateResult.failedExpressionId ? {
          id: updateResult.failedExpressionId,
          text: updateResult.failedExpressionText,
          isCorrect: false
        } : null
      });
    } catch (error) {
      console.error("Error in /api/chat/respond:", error);
      res.status(500).json({ 
        message: "Failed to generate response",
        error: error instanceof Error ? error.message : String(error)
      });
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
    const clean1 = str1.replace(/[^\w\s]/g, '').toLowerCase().trim();
    const clean2 = str2.replace(/[^\w\s]/g, '').toLowerCase().trim();
    
    // Check for exact phrase match first (target expression must be contained in user message)
    if (clean1.includes(clean2)) {
      return 1.0;
    }
    
    // Word-based similarity - requires stricter matching
    const words1 = clean1.split(/\s+/).filter(w => w.length > 2); // Filter out very short words
    const words2 = clean2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Count exact word matches
    const exactMatches = words2.filter(word => words1.includes(word));
    const similarity = words2.length > 0 ? exactMatches.length / words2.length : 0;
    
    // Return similarity only if at least 80% of important words match
    return similarity >= 0.8 ? similarity : 0;
  }

  function getScenarioResponsesForSelectedExpressions(expressions: any[], messageCount: number): string[] {
    const remainingExpressions = expressions.filter(expr => {
      // This would need to check against used expressions in a real implementation
      return true; // For now, assume all are remaining
    });
    
    if (messageCount === 0) {
      // Initial scenario setup based on selected expressions
      const firstExpression = expressions[0];
      
      if (expressions.some(e => e.text.toLowerCase().includes("coffee") || e.text.toLowerCase().includes("order"))) {
        return [
          `☕ *You walk into a busy coffee shop. The barista looks up with a friendly smile as you approach the counter.* Good morning! *I wipe my hands on my apron and give you my full attention.* Welcome to Daily Brew! You've got perfect timing - we just finished brewing a fresh batch of our signature roast. *I gesture to the menu board above.* First time here? Our regulars love the caramel macchiato, but honestly, everything's pretty amazing. *I wait expectantly with a pen ready.*`,
          `☕ *The coffee shop is bustling with the morning rush. You're next in line and I greet you with enthusiasm.* Morning! *I smile warmly.* You look like you could use some serious caffeine today! *I chuckle.* Lucky for you, we've got exactly what you need. Our espresso is pulling perfectly this morning. *I lean forward slightly.* So, what's going to make your day better?`,
          `☕ *You enter the cozy neighborhood coffee shop. I'm behind the counter organizing cups when I notice you studying the menu.* Hey there! *I approach with a welcoming smile.* Take your time with the menu - I know it can be overwhelming with all the options. *I pause.* But between you and me, if you're looking for something really special, our house blend with a splash of vanilla is incredible. *I wait for your response.*`
        ];
      } else if (expressions.some(e => e.text.toLowerCase().includes("nice to meet") || e.text.toLowerCase().includes("hello") || e.text.toLowerCase().includes("good"))) {
        // Start with greetings/introductions
        const greetingExpressions = expressions.filter(e => 
          e.text.toLowerCase().includes("nice to meet") || 
          e.text.toLowerCase().includes("hello") || 
          e.text.toLowerCase().includes("good")
        );
        
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
    const prompts = {
      "Nice to meet you": [
        "👋 *A new colleague approaches you in the office break room.* Hi there! I'm Sarah from the marketing team. I just started last week.",
        "🤝 *You're at a company networking event and someone introduces themselves.* Hello! I'm David from the IT department. I've heard great things about your work.",
        "☕ *You bump into someone at a coffee shop and they seem friendly.* Hi! I'm Maria. I think we work in the same building - I've seen you around."
      ],
      "Have a wonderful day": [
        "🚪 *You've just finished a great conversation with a store clerk who helped you find everything you needed. You're about to leave.*",
        "🏃‍♀️ *You've been chatting with a neighbor about weekend plans and the conversation is naturally winding down.*",
        "✋ *You're finishing up a pleasant phone call with a customer service representative who was very helpful.*"
      ],
      "Excuse me, where is the nearest subway station?": [
        "🗺️ *You're standing on a busy street corner looking confused with your phone in hand, and a friendly local notices you seem lost.*",
        "🚇 *You just got off a bus in an unfamiliar neighborhood and need to get to the subway. You see someone who looks like they live in the area.*",
        "📍 *You're running late for a meeting and need directions. You spot someone walking confidently down the street.*"
      ]
    };
    
    const expressionPrompts = prompts[expression.text as keyof typeof prompts];
    if (expressionPrompts) {
      return expressionPrompts[Math.floor(Math.random() * expressionPrompts.length)];
    }
    
    // Generic fallback
    return `🎯 *Here's a situation where you might use: "${expression.text}"*`;
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
