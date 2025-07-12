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

  async createSession(expressionIds: number[], userId?: string, sessionId?: string): Promise<SessionState> {
    console.log('Creating session with expression IDs:', expressionIds);
    const expressions = await storage.getExpressions(userId, sessionId);
    console.log('Available expressions:', expressions.map(e => ({ id: e.id, text: e.text })));
    const selectedExpressions = expressions.filter(expr => expressionIds.includes(expr.id));
    console.log('Selected expressions:', selectedExpressions.map(e => ({ id: e.id, text: e.text })));
    
    if (selectedExpressions.length === 0) {
      throw new Error(`No valid expressions found. Available IDs: ${expressions.map(e => e.id).join(', ')}, Requested IDs: ${expressionIds.join(', ')}`);
    }

    // 랜덤으로 표현 선택 (1단계: 랜덤 선택)
    const randomExpression = selectedExpressions[Math.floor(Math.random() * selectedExpressions.length)];
    console.log('Random expression selected:', randomExpression.text);
    const scenarioResponse = await openaiService.generateScenario(randomExpression);
    
    // 세션 생성
    const session = await storage.createChatSession({
      scenario: scenarioResponse.scenario,
      isActive: true
    }, userId, sessionId);

    // 초기 메시지 생성 (2단계: 상황 설명 + 3단계: 대화 시작)
    const fullInitialMessage = `📝 상황: ${scenarioResponse.scenario}\n\n${scenarioResponse.initialMessage}`;
    
    await storage.createChatMessage({
      sessionId: session.id,
      content: fullInitialMessage,
      isUser: false,
      expressionUsed: null,
      isCorrect: null,
    }, userId, sessionId);

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

  getCurrentSession(sessionId: number): SessionState | null {
    return this.sessions.get(sessionId) || null;
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