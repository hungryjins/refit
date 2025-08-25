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
   * 1단계: 세션 초기화
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
   * 2단계: 사용자 응답 처리
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

    // 유사도 계산
    const similarity = this.calculateSimilarity(
      userMessage,
      currentExpression.text
    );
    const isCorrect = similarity >= 0.8;

    // 통계 업데이트
    const currentAttempts = session.attempts.get(currentExpression.id) || 0;
    session.attempts.set(currentExpression.id, currentAttempts + 1);

    if (isCorrect) {
      session.completedExpressions.add(currentExpression.id);
      const currentCorrect =
        session.correctUsages.get(currentExpression.id) || 0;
      session.correctUsages.set(currentExpression.id, currentCorrect + 1);
    }

    // 피드백 생성
    const feedback = this.generateFeedback(
      userMessage,
      currentExpression.text,
      isCorrect,
      similarity
    );

    // 세션 완료 여부 확인
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
   * 3단계: 다음 프롬프트 생성
   */
  getNextPrompt(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 다음 미완료 표현식 찾기
    let nextIndex = session.currentExpressionIndex;
    do {
      nextIndex = (nextIndex + 1) % session.expressions.length;
    } while (
      session.completedExpressions.has(session.expressions[nextIndex].id) &&
      nextIndex !== session.currentExpressionIndex
    );

    session.currentExpressionIndex = nextIndex;
    const nextExpression = session.expressions[nextIndex];

    return `다음 표현을 사용해보세요: "${nextExpression.text}"`;
  }

  /**
   * 4단계: 세션 종료 여부 확인
   */
  shouldEndSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    return session.completedExpressions.size === session.expressions.length;
  }

  /**
   * 5단계: 결과 요약
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
   * 세션 진행 상황 조회
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
   * 현재 표현식 조회
   */
  getCurrentExpression(sessionId: string): ExpressionWithNumberId | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return session.expressions[session.currentExpressionIndex] || null;
  }

  /**
   * 세션 정리
   */
  cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`Session ${sessionId} cleaned up`);
  }

  /**
   * 유사도 계산 (Levenshtein 거리 기반)
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

    // 정확한 구문 매치 확인
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 1.0;
    }

    // 단어 기반 유사도
    const words1 = clean1.split(/\s+/).filter((w) => w.length > 2);
    const words2 = clean2.split(/\s+/).filter((w) => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter((word) => words2.includes(word));
    const similarity =
      commonWords.length / Math.max(words1.length, words2.length);

    return similarity;
  }

  /**
   * 피드백 생성
   */
  private generateFeedback(
    userMessage: string,
    targetExpression: string,
    isCorrect: boolean,
    similarity: number
  ): string {
    if (isCorrect) {
      return `✅ 정확합니다! "${targetExpression}" 표현을 잘 사용하셨습니다.`;
    } else if (similarity >= 0.6) {
      return `⚠️ 거의 맞았습니다! "${targetExpression}" 표현을 다시 한번 확인해보세요.`;
    } else {
      return `❌ 다시 시도해보세요. 목표 표현: "${targetExpression}"`;
    }
  }
}

export const tutoringEngine = new TutoringEngine();
