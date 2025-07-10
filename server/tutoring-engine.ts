import type { Expression } from "@shared/schema";

export interface SessionState {
  sessionId: number;
  expressions: Expression[];
  expressionStates: Map<number, ExpressionState>;
  isComplete: boolean;
  startTime: Date;
  endTime?: Date;
}

export interface ExpressionState {
  expressionId: number;
  text: string;
  isCompleted: boolean;
  attempts: number;
  correctUsage: boolean;
  usedAt?: Date;
}

export interface UpdateResult {
  isCorrect: boolean;
  detectedExpressionId?: number;
  detectedExpressionText?: string;
  feedback: string;
  sessionComplete: boolean;
}

export interface Summary {
  totalExpressions: number;
  completedExpressions: number;
  correctUsages: number;
  totalAttempts: number;
  sessionDuration: number; // in seconds
  expressionResults: Array<{
    text: string;
    isCompleted: boolean;
    correctUsage: boolean;
    attempts: number;
  }>;
}

export class TutoringEngine {
  private sessions: Map<number, SessionState> = new Map();

  /**
   * 1. 초기 상태 설정
   */
  initializeSession(sessionId: number, expressions: Expression[]): SessionState {
    const expressionStates = new Map<number, ExpressionState>();
    
    expressions.forEach(expr => {
      expressionStates.set(expr.id, {
        expressionId: expr.id,
        text: expr.text,
        isCompleted: false,
        attempts: 0,
        correctUsage: false,
      });
    });

    const sessionState: SessionState = {
      sessionId,
      expressions,
      expressionStates,
      isComplete: false,
      startTime: new Date(),
    };

    this.sessions.set(sessionId, sessionState);
    return sessionState;
  }

  /**
   * 2. 사용자 입력 처리
   */
  processUserAnswer(sessionId: number, answer: string): UpdateResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 표현 감지 및 유사도 계산
    let detectedExpression: Expression | null = null;
    let maxSimilarity = 0;
    
    for (const expr of session.expressions) {
      // 부분 일치 확인 (표현이 사용자 입력에 포함되어 있는지)
      const userInput = answer.toLowerCase().trim();
      const expression = expr.text.toLowerCase().trim();
      
      // 1. 정확한 부분 일치 확인
      if (userInput.includes(expression)) {
        detectedExpression = expr;
        maxSimilarity = 1.0;
        break;
      }
      
      // 2. 유사도 계산 (부분 문자열로)
      const similarity = this.calculateSimilarity(userInput, expression);
      if (similarity > maxSimilarity && similarity >= 0.8) {
        maxSimilarity = similarity;
        detectedExpression = expr;
      }
    }

    let isCorrect = false;
    let feedback = "";

    if (detectedExpression) {
      const state = session.expressionStates.get(detectedExpression.id);
      if (state) {
        state.attempts++;
        
        if (!state.isCompleted) {
          // 처음 성공한 경우
          state.isCompleted = true;
          state.correctUsage = true;
          state.usedAt = new Date();
          isCorrect = true;
          feedback = `✅ 완벽합니다! "${detectedExpression.text}" 표현을 정확하게 사용했습니다!`;
        } else {
          // 이미 완료된 표현을 다시 사용한 경우
          feedback = `✅ "${detectedExpression.text}" 표현을 또 사용하셨네요! 이미 완료된 표현입니다.`;
        }
      }
    } else {
      // 표현을 감지하지 못한 경우 - 완료되지 않은 표현들 중 하나를 오답 처리
      const incompleteExpressions = session.expressions.filter(expr => {
        const state = session.expressionStates.get(expr.id);
        return state && !state.isCompleted;
      });
      
      if (incompleteExpressions.length > 0) {
        // 첫 번째 완료되지 않은 표현을 오답 처리
        const targetExpression = incompleteExpressions[0];
        const state = session.expressionStates.get(targetExpression.id);
        if (state) {
          state.attempts++;
          state.isCompleted = true;
          state.correctUsage = false; // 오답으로 처리
          state.usedAt = new Date();
          feedback = `❌ "${targetExpression.text}" 표현을 사용하지 못했습니다.`;
        }
      } else {
        feedback = "좋은 답변입니다!";
      }
    }

    // 세션 완료 확인
    const sessionComplete = this.shouldEndSession(sessionId);
    if (sessionComplete) {
      session.isComplete = true;
      session.endTime = new Date();
    }

    return {
      isCorrect,
      detectedExpressionId: detectedExpression?.id,
      detectedExpressionText: detectedExpression?.text,
      feedback,
      sessionComplete,
    };
  }

  /**
   * 3. 다음 질문 생성
   */
  getNextPrompt(sessionId: number): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 완료되지 않은 표현 찾기
    const incompleteExpressions = session.expressions.filter(expr => {
      const state = session.expressionStates.get(expr.id);
      return state && !state.isCompleted;
    });

    if (incompleteExpressions.length === 0) {
      return "🎉 축하합니다! 모든 표현을 성공적으로 사용했습니다!";
    }

    // 랜덤으로 하나 선택
    const randomIndex = Math.floor(Math.random() * incompleteExpressions.length);
    const targetExpression = incompleteExpressions[randomIndex];

    return this.generateScenarioPrompt(targetExpression);
  }

  /**
   * 4. 세션 종료 조건 확인
   */
  shouldEndSession(sessionId: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
        return false;
    }

    // 모든 표현이 완료되었는지 확인
    for (const state of session.expressionStates.values()) {
      if (!state.isCompleted) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 5. 결과 요약
   */
  summarizeResults(sessionId: number): Summary {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const expressionResults = Array.from(session.expressionStates.values()).map(state => ({
      text: state.text,
      isCompleted: state.isCompleted,
      correctUsage: state.correctUsage,
      attempts: state.attempts,
    }));

    const completedExpressions = expressionResults.filter(r => r.isCompleted).length;
    const correctUsages = expressionResults.filter(r => r.correctUsage).length;
    const totalAttempts = expressionResults.reduce((sum, r) => sum + r.attempts, 0);

    const sessionDuration = session.endTime && session.startTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : 0;

    return {
      totalExpressions: session.expressions.length,
      completedExpressions,
      correctUsages,
      totalAttempts,
      sessionDuration,
      expressionResults,
    };
  }

  /**
   * 세션 상태 조회
   */
  getSessionState(sessionId: number): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 세션 삭제
   */
  deleteSession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }

  /**
   * 표현별 시나리오 프롬프트 생성
   */
  private generateScenarioPrompt(expression: Expression): string {
    const scenarios = {
      // 인사 표현들
      "Nice to meet you": [
        "🤝 *You're at a networking event and someone introduces themselves.* Hi, I'm Sarah from the marketing team. I've heard great things about your work.",
        "🎓 *It's your first day at a new job and you're meeting your colleagues.* Welcome to the team! I'm David from the IT department.",
        "☕ *You're at a coffee shop and bump into a friend's colleague.* Oh, you must be the designer Lisa mentioned. I'm her roommate, Alex.",
      ],
      "Have a wonderful day": [
        "🛍️ *You're finishing up at a store and the cashier hands you your receipt.* Here's your receipt. Thank you for shopping with us!",
        "🏥 *You're leaving a doctor's appointment and the receptionist smiles at you.* Your next appointment is scheduled for next month. Take care!",
        "🚗 *You're getting out of a taxi and the driver helps with your bags.* Here we are! That'll be $15.50.",
      ],
      // 더 많은 표현들에 대한 시나리오 추가 가능
    };

    const expressionScenarios = scenarios[expression.text as keyof typeof scenarios];
    if (expressionScenarios) {
      const randomScenario = expressionScenarios[Math.floor(Math.random() * expressionScenarios.length)];
      return randomScenario;
    }

    // 기본 시나리오
    return `💭 *상황: 다음 표현을 자연스럽게 사용해보세요.* "${expression.text}" 표현을 사용해서 대화해보세요.`;
  }

  /**
   * 문자열 유사도 계산
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 레벤슈타인 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// 싱글톤 인스턴스
export const tutoringEngine = new TutoringEngine();