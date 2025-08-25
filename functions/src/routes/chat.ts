import express from "express";
import { firestore } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { OpenAIService } from "../services/openai";
import { FriendsScriptService } from "../services/friends-script";
import { tutoringEngine } from "../services/tutoring-engine";
import { authenticateUser, requireUser } from "../middleware/auth";

const router = express.Router();
const db = getFirestore();
const openaiService = new OpenAIService();
const friendsScriptService = new FriendsScriptService();

// ===== Original Chat Mode =====

// Start Original Chat session
router.post("/start-session", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const { selectedExpressions } = req.body;

    if (!selectedExpressions || selectedExpressions.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one expression must be selected" });
    }

    // Get expressions
    const expressionsRef = db
      .collection("users")
      .doc(userId)
      .collection("expressions");
    const snapshot = await expressionsRef.get();
    const allExpressions = snapshot.docs.map((doc) => ({
      id: parseInt(doc.id),
      text: doc.data().text,
      categoryId: doc.data().categoryId,
      correctCount: doc.data().correctCount || 0,
      totalCount: doc.data().totalCount || 0,
      lastUsed: doc.data().lastUsed,
      createdAt: doc.data().createdAt || new Date(),
    }));

    const expressions = allExpressions.filter((expr) =>
      selectedExpressions.includes(expr.id)
    );

    if (expressions.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid expression IDs provided" });
    }

    // Create session
    const sessionData = {
      mode: "original",
      scenario: "Conversation practice with selected expressions",
      isActive: true,
      expressions: expressions.map((e) => e.id),
      createdAt: new Date(),
    };

    const sessionRef = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .add(sessionData);

    // Initialize tutoring engine
    tutoringEngine.initializeSession(sessionRef.id, expressions);

    // Generate scenario with first expression
    const firstExpression = expressions[0];
    const scenario = await openaiService.generateScenario([
      firstExpression.text,
    ]);

    // Generate initial AI message
    const initialMessageData = {
      sessionId: sessionRef.id,
      content: scenario,
      isUser: false,
      expressionUsed: null,
      isCorrect: null,
      createdAt: new Date(),
    };

    const messageRef = await sessionRef
      .collection("messages")
      .add(initialMessageData);

    return res.json({
      sessionId: sessionRef.id,
      scenario: scenario,
      initialMessage: scenario,
      messageId: messageRef.id,
      progress: {
        completed: 0,
        total: expressions.length,
        expressions: expressions,
      },
    });
  } catch (error) {
    console.error("Start session error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Process Original Chat response
router.post("/respond", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res
        .status(400)
        .json({ message: "Message and sessionId are required" });
    }

    // Check current target expression
    let currentTargetExpression =
      tutoringEngine.getCurrentExpression(sessionId);

    if (!currentTargetExpression) {
      return res.status(400).json({
        message:
          "Please select expressions to practice before starting the session.",
        needExpressionSelection: true,
      });
    }

    // Verify session
    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Save user message
    const userMessageData = {
      sessionId: sessionId,
      content: message,
      isUser: true,
      expressionUsed: null,
      isCorrect: null,
      createdAt: new Date(),
    };

    await sessionRef.collection("messages").add(userMessageData);

    // Process response with tutoring engine
    const result = tutoringEngine.processUserAnswer(sessionId, message);

    // Generate AI response
    const aiResponse = await openaiService.processUserMessage(message, [
      currentTargetExpression.text,
    ]);

    // Save AI message
    const aiMessageData = {
      sessionId: sessionId,
      content: aiResponse.response,
      isUser: false,
      expressionUsed: result.detectedExpressionId,
      isCorrect: result.isCorrect,
      createdAt: new Date(),
    };

    const aiMessageRef = await sessionRef
      .collection("messages")
      .add(aiMessageData);

    // Update expression statistics
    if (result.detectedExpressionId) {
      const expressionRef = db
        .collection("users")
        .doc(userId)
        .collection("expressions")
        .doc(result.detectedExpressionId.toString());
      await expressionRef.update({
        totalCount: firestore.FieldValue.increment(1),
        correctCount: firestore.FieldValue.increment(result.isCorrect ? 1 : 0),
        lastUsed: new Date(),
      });
    }

    // Check next expression
    let nextExpression = null;
    let sessionComplete = result.sessionComplete;

    if (!sessionComplete) {
      const progress = tutoringEngine.getSessionProgress(sessionId);
      nextExpression = progress.currentExpression;
    }

    const progressData = sessionComplete
      ? tutoringEngine.summarizeResults(sessionId)
      : tutoringEngine.getSessionProgress(sessionId);

    return res.json({
      response: aiResponse.response,
      messageId: aiMessageRef.id,
      evaluation: {
        usedTargetExpression: result.detectedExpressionId ? true : false,
        isCorrect: result.isCorrect,
        feedback: result.feedback,
      },
      sessionComplete: sessionComplete,
      usedExpression: result.detectedExpressionId,
      isCorrect: result.isCorrect,
      nextExpression: nextExpression,
      progress: progressData,
    });
  } catch (error) {
    console.error("Chat respond error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ===== AI Conversation Mode =====

// AI Conversation response
router.post("/ai-conversation/respond", authenticateUser, async (req, res) => {
  try {
    const { message, sessionId, expressions } = req.body;

    if (!message || !sessionId || !expressions) {
      return res
        .status(400)
        .json({ message: "message, sessionId, and expressions are required" });
    }

    console.log("AI conversation request:", {
      message,
      sessionId,
      expressionCount: expressions.length,
    });

    // Generate AI response
    const aiResponse = await openaiService.generateAIResponse(message);

    console.log("AI conversation response:", aiResponse);

    return res.json({
      response: aiResponse.response,
      feedback: null,
      usedExpression: null,
    });
  } catch (error) {
    console.error("AI conversation error:", error);
    return res.status(500).json({
      message: "Failed to generate AI response",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ===== Friends Script Mode =====

// Friends Script preview
router.post("/friends-script/preview", authenticateUser, async (req, res) => {
  try {
    const { expressions } = req.body;

    if (!expressions || !Array.isArray(expressions)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const previews = await friendsScriptService.findSimilarScript(
      expressions.join(" ")
    );
    return res.json(previews);
  } catch (error) {
    console.error("Friends script preview error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Friends Script practice
router.post("/friends-script/practice", authenticateUser, async (req, res) => {
  try {
    const { userInput, expressions } = req.body;

    if (!userInput || !expressions) {
      return res
        .status(400)
        .json({ message: "userInput and expressions are required" });
    }

    console.log("Starting practice for expression:", userInput);
    const scriptResult = await friendsScriptService.findSimilarScript(
      userInput
    );
    console.log("Generated script result:", scriptResult);

    return res.json({
      searchQuery: userInput,
      targetSentence: scriptResult.script,
      dialogueScript: scriptResult.script,
      isCorrect: null,
      feedback: null,
    });
  } catch (error) {
    console.error("Friends script practice error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Friends Script evaluation
router.post("/friends-script/evaluate", authenticateUser, async (req, res) => {
  try {
    const { userResponse, targetSentence } = req.body;

    if (!userResponse || !targetSentence) {
      return res
        .status(400)
        .json({ message: "userResponse and targetSentence are required" });
    }

    // Calculate similarity
    const similarity = calculateSimilarity(userResponse, targetSentence);
    const isCorrect = similarity >= 0.8;

    const feedback = isCorrect
      ? "✅ Correct! Very similar to the expression used in Friends."
      : "⚠️ Please try again. Refer to the Friends expression.";

    return res.json({
      isCorrect,
      feedback,
      similarity,
      targetSentence,
    });
  } catch (error) {
    console.error("Friends script evaluation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ===== Common Functions =====

// Get chat session list
router.get("/sessions", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const sessionsRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions");
    const snapshot = await sessionsRef
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get chat session
router.get("/sessions/:id", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const sessionId = req.params.id;

    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    const session = {
      id: sessionDoc.id,
      ...sessionDoc.data(),
    };

    // Also get messages
    const messagesRef = sessionRef.collection("messages");
    const messagesSnapshot = await messagesRef
      .orderBy("createdAt", "asc")
      .get();

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      session,
      messages,
    });
  } catch (error) {
    console.error("Error fetching chat session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// End session
router.put("/sessions/:id/end", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const sessionId = req.params.id;

    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);
    const doc = await sessionRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    await sessionRef.update({
      isActive: false,
      endedAt: new Date(),
    });

    // Clean up session in tutoring engine
    tutoringEngine.cleanupSession(sessionId);

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error ending session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Similarity calculation function
function calculateSimilarity(str1: string, str2: string): number {
  const clean1 = str1
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .trim();
  const clean2 = str2
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .trim();

  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return 1.0;
  }

  const words1 = clean1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = clean2.split(/\s+/).filter((w) => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter((word) => words2.includes(word));
  const similarity =
    commonWords.length / Math.max(words1.length, words2.length);

  return similarity;
}

export { router as chatRouter };
