import type { Expression } from "@shared/schema";
import { storage } from "./storage";
import { openaiService } from "./openai-service";

export interface SessionState {
  sessionId: number;
  expressions: Expression[];
  currentExpressionIndex: number;
  completedExpressions: Set<number>;
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
      isComplete: false
    };

    this.sessions.set(session.id, sessionState);
    
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

    // 완료된 표현 추가
    sessionState.completedExpressions.add(expressionId);
    sessionState.currentExpressionIndex++;

    // 모든 표현이 완료되었는지 확인
    if (sessionState.currentExpressionIndex >= sessionState.expressions.length) {
      sessionState.isComplete = true;
      await storage.endChatSession(sessionId);
      this.sessions.delete(sessionId);
      
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
      content: `\n🎯 새로운 표현 연습!\n\n${scenarioResponse.initialMessage}`,
      isUser: false,
      expressionUsed: null,
      isCorrect: null,
    });

    return {
      nextExpression: nextExpression,
      nextScenario: scenarioResponse.scenario,
      nextMessage: `\n🎯 새로운 표현 연습!\n\n${scenarioResponse.initialMessage}`,
      isSessionComplete: false
    };
  }

  getCurrentExpression(sessionId: number): Expression | null {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState || sessionState.isComplete) {
      return null;
    }
    
    return sessionState.expressions[sessionState.currentExpressionIndex];
  }

  getSessionProgress(sessionId: number): {
    completed: number;
    total: number;
    completedExpressions: number[];
  } | null {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      return null;
    }

    return {
      completed: sessionState.completedExpressions.size,
      total: sessionState.expressions.length,
      completedExpressions: Array.from(sessionState.completedExpressions)
    };
  }

  deleteSession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }
}

export const sessionManager = new SessionManager();