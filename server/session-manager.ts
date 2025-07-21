import type { Expression } from "@shared/schema";
import { storage } from "./storage";
import { openaiService } from "./openai-service";

export interface SessionState {
  sessionId: number;
  expressions: Expression[];
  currentExpressionIndex: number;
  completedExpressions: Set<number>;
  expressionResults: Map<number, boolean>; // expressionId -> isCorrect
  isComplete: boolean;
}

class SessionManager {
  private sessions: Map<number, SessionState> = new Map();

  async createSession(expressionIds: number[]): Promise<SessionState> {
    const expressions = await storage.getExpressions();
    const selectedExpressions = expressions.filter(expr => expressionIds.includes(expr.id));
    
    if (selectedExpressions.length === 0) {
      throw new Error("No valid expressions found");
    }

    // 첫 번째 표현으로 세션 시작
    const firstExpression = selectedExpressions[0];
    const scenarioResponse = await openaiService.generateScenario(firstExpression);
    
    // 세션 생성
    const session = await storage.createChatSession({
      scenario: scenarioResponse.scenario,
      isActive: true
    });

    // 초기 메시지 생성
    await storage.createChatMessage({
      sessionId: session.id,
      content: scenarioResponse.initialMessage,
      isUser: false,
      expressionUsed: null,
      isCorrect: null,
    });

    // 세션 상태 저장
    const sessionState: SessionState = {
      sessionId: session.id,
      expressions: selectedExpressions,
      currentExpressionIndex: 0,
      completedExpressions: new Set(),
      expressionResults: new Map(),
      isComplete: false
    };

    this.sessions.set(session.id, sessionState);
    
    return sessionState;
  }

  // Original Chat에서 사용할 시나리오 생성 없는 세션 생성
  async createSessionWithoutScenario(sessionId: number, expressionIds: number[]): Promise<SessionState> {
    const expressions = await storage.getExpressions();
    const selectedExpressions = expressions.filter(expr => expressionIds.includes(expr.id));
    
    if (selectedExpressions.length === 0) {
      throw new Error("No valid expressions found");
    }

    // 세션 상태만 저장 (메시지 생성은 하지 않음)
    const sessionState: SessionState = {
      sessionId: sessionId,
      expressions: selectedExpressions,
      currentExpressionIndex: 0,
      completedExpressions: new Set(),
      expressionResults: new Map(),
      isComplete: false
    };

    this.sessions.set(sessionId, sessionState);
    
    return sessionState;
  }

  async completeExpression(sessionId: number, expressionId: number, isCorrect: boolean = true): Promise<{
    nextExpression?: Expression;
    nextScenario?: string;
    nextMessage?: string;
    isSessionComplete: boolean;
  }> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error("Session not found");
    }

    // 정답/오답 관계없이 완료된 표현으로 추가 (진행률 업데이트)
    sessionState.completedExpressions.add(expressionId);
    // 정답/오답 결과 저장
    sessionState.expressionResults.set(expressionId, isCorrect);
    sessionState.currentExpressionIndex++;

    // 모든 표현이 완료되었는지 확인
    if (sessionState.currentExpressionIndex >= sessionState.expressions.length) {
      sessionState.isComplete = true;
      await storage.endChatSession(sessionId);
      
      return {
        isSessionComplete: true
      };
    }

    // 다음 표현으로 진행
    const nextExpression = sessionState.expressions[sessionState.currentExpressionIndex];
    const scenarioResponse = await openaiService.generateScenario(nextExpression);

    // 다음 시나리오 메시지 저장
    await storage.createChatMessage({
      sessionId: sessionId,
      content: scenarioResponse.initialMessage,
      isUser: false,
      expressionUsed: null,
      isCorrect: null,
    });

    return {
      nextExpression: nextExpression,
      nextScenario: scenarioResponse.scenario,
      nextMessage: scenarioResponse.initialMessage,
      isSessionComplete: false
    };
  }

  getCurrentExpression(sessionId: number): Expression | null {
    const sessionState = this.sessions.get(sessionId);
    console.log(`SessionManager.getCurrentExpression for ${sessionId}:`, sessionState ? 'found' : 'not found');
    if (!sessionState || sessionState.isComplete) {
      console.log(`Session ${sessionId} not found or complete`);
      return null;
    }
    
    const currentExpression = sessionState.expressions[sessionState.currentExpressionIndex];
    console.log(`Current expression for session ${sessionId}:`, currentExpression?.text);
    return currentExpression;
  }

  getSessionProgress(sessionId: number): {
    completed: number;
    total: number;
    completedExpressions: number[];
    expressionResults: Array<{id: number, isCorrect: boolean}>;
  } | null {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      return null;
    }

    return {
      completed: sessionState.completedExpressions.size,
      total: sessionState.expressions.length,
      completedExpressions: Array.from(sessionState.completedExpressions),
      expressionResults: Array.from(sessionState.expressionResults.entries()).map(([id, isCorrect]) => ({id, isCorrect}))
    };
  }

  getFinalSessionResults(sessionId: number): {
    completed: number;
    total: number;
    completedExpressions: number[];
    expressionResults: Array<{id: number, isCorrect: boolean}>;
    correctCount: number;
    incorrectExpressions: Array<{id: number, text: string}>;
  } | null {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      return null;
    }

    const expressionResults = Array.from(sessionState.expressionResults.entries()).map(([id, isCorrect]) => ({id, isCorrect}));
    const correctCount = expressionResults.filter(result => result.isCorrect).length;
    const incorrectExpressions = expressionResults
      .filter(result => !result.isCorrect)
      .map(result => {
        const expr = sessionState.expressions.find(e => e.id === result.id);
        return { id: result.id, text: expr?.text || '' };
      });

    const finalResults = {
      completed: sessionState.completedExpressions.size,
      total: sessionState.expressions.length,
      completedExpressions: Array.from(sessionState.completedExpressions),
      expressionResults: expressionResults,
      correctCount: correctCount,
      incorrectExpressions: incorrectExpressions
    };

    // 세션 완료 후 삭제
    this.sessions.delete(sessionId);
    
    return finalResults;
  }

  deleteSession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }
}

export const sessionManager = new SessionManager();