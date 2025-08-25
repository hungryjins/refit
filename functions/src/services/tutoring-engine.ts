import { ExpressionWithNumberId } from "../types";

export interface SessionState {
  sessionId: string;
  expressions: ExpressionWithNumberId[];
  completedExpressions: Set<number>;
  currentExpressionIndex: number;
  startTime: number;
  attempts: Map<number, number>;
  correctUsages: Map<number, number>;
}

export interface ProcessResult {
  detectedExpressionId?: number;
  isCorrect: boolean;
  feedback: string;
  sessionComplete: boolean;
}

export interface SessionProgress {
  completed: number;
  total: number;
  expressions: ExpressionWithNumberId[];
  currentExpression?: ExpressionWithNumberId;
}

export interface SessionSummary {
  completedExpressions: number;
  totalExpressions: number;
  sessionDuration: number;
  correctUsages: number;
  totalAttempts: number;
  accuracy: number;
}

export class TutoringEngine {
  private sessions: Map<string, SessionState> = new Map();

  /**
   * Step 1: Session initialization
   */
  initializeSession(
    sessionId: string,
    expressions: ExpressionWithNumberId[]
  ): void {
    const sessionState: SessionState = {
      sessionId,
      expressions,
      completedExpressions: new Set(),
      currentExpressionIndex: 0,
      startTime: Date.now(),
      attempts: new Map(),
      correctUsages: new Map(),
    };

    this.sessions.set(sessionId, sessionState);
    console.log(
      `Session ${sessionId} initialized with ${expressions.length} expressions`
    );
  }

  /**
   * Step 2: Process user response
   */
  processUserAnswer(sessionId: string, userMessage: string): ProcessResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const currentExpression =
      session.expressions[session.currentExpressionIndex];
    if (!currentExpression) {
      throw new Error("No current expression found");
    }

    // Calculate similarity
    const similarity = this.calculateSimilarity(
      userMessage,
      currentExpression.text
    );
    const isCorrect = similarity >= 0.8;

    // Update statistics
    const currentAttempts = session.attempts.get(currentExpression.id) || 0;
    session.attempts.set(currentExpression.id, currentAttempts + 1);

    if (isCorrect) {
      session.completedExpressions.add(currentExpression.id);
      const currentCorrect =
        session.correctUsages.get(currentExpression.id) || 0;
      session.correctUsages.set(currentExpression.id, currentCorrect + 1);
    }

    // Generate feedback
    const feedback = this.generateFeedback(
      userMessage,
      currentExpression.text,
      isCorrect,
      similarity
    );

    // Check if session is complete
    const sessionComplete =
      session.completedExpressions.size === session.expressions.length;

    return {
      detectedExpressionId: currentExpression.id,
      isCorrect,
      feedback,
      sessionComplete,
    };
  }

  /**
   * Step 3: Generate next prompt
   */
  getNextPrompt(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Find next incomplete expression
    let nextIndex = session.currentExpressionIndex;
    do {
      nextIndex = (nextIndex + 1) % session.expressions.length;
    } while (
      session.completedExpressions.has(session.expressions[nextIndex].id) &&
      nextIndex !== session.currentExpressionIndex
    );

    session.currentExpressionIndex = nextIndex;
    const nextExpression = session.expressions[nextIndex];

    return `Try using this expression: "${nextExpression.text}"`;
  }

  /**
   * Step 4: Check session completion
   */
  shouldEndSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    return session.completedExpressions.size === session.expressions.length;
  }

  /**
   * Step 5: Summarize results
   */
  summarizeResults(sessionId: string): SessionSummary {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const sessionDuration = Math.round((Date.now() - session.startTime) / 1000);
    const totalAttempts = Array.from(session.attempts.values()).reduce(
      (sum, attempts) => sum + attempts,
      0
    );
    const correctUsages = Array.from(session.correctUsages.values()).reduce(
      (sum, correct) => sum + correct,
      0
    );

    return {
      completedExpressions: session.completedExpressions.size,
      totalExpressions: session.expressions.length,
      sessionDuration,
      correctUsages,
      totalAttempts,
      accuracy: totalAttempts > 0 ? (correctUsages / totalAttempts) * 100 : 0,
    };
  }

  /**
   * Get session progress
   */
  getSessionProgress(sessionId: string): SessionProgress {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      completed: session.completedExpressions.size,
      total: session.expressions.length,
      expressions: session.expressions,
      currentExpression: session.expressions[session.currentExpressionIndex],
    };
  }

  /**
   * Get current expression
   */
  getCurrentExpression(sessionId: string): ExpressionWithNumberId | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return session.expressions[session.currentExpressionIndex] || null;
  }

  /**
   * Clean up session
   */
  cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`Session ${sessionId} cleaned up`);
  }

  /**
   * Calculate similarity (Levenshtein distance based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const clean1 = str1
      .replace(/[^\w\s]/g, "")
      .toLowerCase()
      .trim();
    const clean2 = str2
      .replace(/[^\w\s]/g, "")
      .toLowerCase()
      .trim();

    // Check exact phrase match
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 1.0;
    }

    // Word-based similarity
    const words1 = clean1.split(/\s+/).filter((w) => w.length > 2);
    const words2 = clean2.split(/\s+/).filter((w) => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter((word) => words2.includes(word));
    const similarity =
      commonWords.length / Math.max(words1.length, words2.length);

    return similarity;
  }

  /**
   * Generate feedback
   */
  private generateFeedback(
    userMessage: string,
    targetExpression: string,
    isCorrect: boolean,
    similarity: number
  ): string {
    if (isCorrect) {
      return `✅ Correct! You used the expression "${targetExpression}" well.`;
    } else if (similarity >= 0.6) {
      return `⚠️ Almost correct! Please check the expression "${targetExpression}" again.`;
    } else {
      return `❌ Please try again. Target expression: "${targetExpression}"`;
    }
  }
}

export const tutoringEngine = new TutoringEngine();
