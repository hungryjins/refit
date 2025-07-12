import {
  Expression,
  UserStats,
  ChatSession,
  PerformanceAnalytics,
  AdaptiveChallenge,
  InsertPerformanceAnalytics,
  InsertAdaptiveChallenge
} from "@shared/schema";
import { IStorage } from "./storage";

export interface DifficultyAnalysis {
  currentLevel: number;
  suggestedLevel: number;
  confidence: number;
  reasoning: string;
  performanceTrend: 'improving' | 'stable' | 'declining';
}

export interface PersonalizedChallenge {
  id: string;
  type: 'speed' | 'accuracy' | 'complexity' | 'endurance';
  title: string;
  description: string;
  targetMetric: number;
  currentMetric: number;
  difficulty: number;
  reward: string;
  timeLimit?: number; // minutes
  expressions: Expression[];
}

export interface AdaptiveSessionConfig {
  targetDifficulty: number;
  focusAreas: string[];
  challengeTypes: string[];
  sessionLength: number; // minutes
  adaptiveEnabled: boolean;
}

export class AdaptiveDifficultyEngine {
  private storage: IStorage;
  private performanceWindow = 10; // Number of recent sessions to analyze
  private confidenceThreshold = 0.75; // Minimum confidence for difficulty adjustment

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Analyze user performance and determine optimal difficulty level
   */
  async analyzeUserPerformance(userId: string): Promise<DifficultyAnalysis> {
    const userStats = await this.storage.getUserStats(userId);
    const recentSessions = await this.getRecentSessionAnalytics(userId);
    
    if (recentSessions.length < 3) {
      return {
        currentLevel: userStats.currentDifficultyLevel,
        suggestedLevel: userStats.currentDifficultyLevel,
        confidence: 0.5,
        reasoning: "Insufficient data for analysis. Need more practice sessions.",
        performanceTrend: 'stable'
      };
    }

    const performanceMetrics = this.calculatePerformanceMetrics(recentSessions);
    const trend = this.analyzePerformanceTrend(recentSessions);
    
    let suggestedLevel = userStats.currentDifficultyLevel;
    let confidence = 0.7;
    let reasoning = "";

    // Difficulty adjustment logic
    if (performanceMetrics.averageAccuracy > 0.85 && performanceMetrics.averageResponseTime < 8.0) {
      if (trend === 'improving' && userStats.currentDifficultyLevel < 5) {
        suggestedLevel = Math.min(5, userStats.currentDifficultyLevel + 1);
        confidence = 0.9;
        reasoning = "Excellent performance with fast response times. Ready for increased challenge.";
      }
    } else if (performanceMetrics.averageAccuracy < 0.6 || performanceMetrics.averageResponseTime > 15.0) {
      if (trend === 'declining' && userStats.currentDifficultyLevel > 1) {
        suggestedLevel = Math.max(1, userStats.currentDifficultyLevel - 1);
        confidence = 0.85;
        reasoning = "Performance indicates current level is too challenging. Reducing difficulty.";
      }
    }

    // Adaptive score adjustment
    const newAdaptiveScore = this.calculateAdaptiveScore(userStats.adaptiveScore, performanceMetrics, trend);
    
    return {
      currentLevel: userStats.currentDifficultyLevel,
      suggestedLevel,
      confidence,
      reasoning,
      performanceTrend: trend
    };
  }

  /**
   * Generate personalized challenges based on user performance
   */
  async generatePersonalizedChallenges(userId: string): Promise<PersonalizedChallenge[]> {
    const userStats = await this.storage.getUserStats(userId);
    const weakAreas = await this.identifyWeakAreas(userId);
    const expressions = await this.storage.getExpressions(userId);
    
    const challenges: PersonalizedChallenge[] = [];

    // Speed Challenge
    if (userStats.currentDifficultyLevel >= 2) {
      const speedTargetExpressions = expressions
        .filter(expr => expr.masteryLevel < 0.7)
        .slice(0, 5);
        
      challenges.push({
        id: `speed_${Date.now()}`,
        type: 'speed',
        title: 'Lightning Round',
        description: 'Use 5 expressions correctly within 3 minutes',
        targetMetric: 180, // 3 minutes in seconds
        currentMetric: 0,
        difficulty: userStats.currentDifficultyLevel,
        reward: 'Unlock speed badge + 50 XP',
        timeLimit: 3,
        expressions: speedTargetExpressions
      });
    }

    // Accuracy Challenge
    if (userStats.overallAccuracy < 90) {
      const accuracyExpressions = expressions
        .filter(expr => expr.correctCount / Math.max(expr.totalCount, 1) < 0.8)
        .slice(0, 8);
        
      challenges.push({
        id: `accuracy_${Date.now()}`,
        type: 'accuracy',
        title: 'Perfect Practice',
        description: 'Achieve 95% accuracy in 8 expressions',
        targetMetric: 0.95,
        currentMetric: userStats.overallAccuracy / 100,
        difficulty: userStats.currentDifficultyLevel,
        reward: 'Unlock precision badge + conversation boost',
        expressions: accuracyExpressions
      });
    }

    // Complexity Challenge
    if (userStats.currentDifficultyLevel >= 3) {
      const complexExpressions = expressions
        .filter(expr => expr.difficultyLevel >= userStats.currentDifficultyLevel)
        .sort((a, b) => b.complexityScore - a.complexityScore)
        .slice(0, 6);
        
      challenges.push({
        id: `complexity_${Date.now()}`,
        type: 'complexity',
        title: 'Advanced Expressions',
        description: 'Master 6 complex expressions',
        targetMetric: 6,
        currentMetric: complexExpressions.filter(e => e.masteryLevel > 0.8).length,
        difficulty: userStats.currentDifficultyLevel + 1,
        reward: 'Unlock expert badge + difficulty level up',
        expressions: complexExpressions
      });
    }

    // Endurance Challenge
    if (userStats.currentStreak >= 3) {
      const enduranceExpressions = expressions.slice(0, 15);
      
      challenges.push({
        id: `endurance_${Date.now()}`,
        type: 'endurance',
        title: 'Marathon Session',
        description: 'Complete 15 expressions in one session',
        targetMetric: 15,
        currentMetric: 0,
        difficulty: userStats.currentDifficultyLevel,
        reward: 'Unlock endurance badge + streak multiplier',
        timeLimit: 30,
        expressions: enduranceExpressions
      });
    }

    return challenges.filter(challenge => challenge.expressions.length > 0);
  }

  /**
   * Select optimal expressions for current session based on adaptive algorithm
   */
  async selectAdaptiveExpressions(userId: string, sessionConfig: AdaptiveSessionConfig): Promise<Expression[]> {
    const expressions = await this.storage.getExpressions(userId);
    const userStats = await this.storage.getUserStats(userId);
    
    if (!sessionConfig.adaptiveEnabled) {
      return expressions.slice(0, 10); // Default selection
    }

    const scoredExpressions = expressions.map(expr => ({
      expression: expr,
      adaptiveScore: this.calculateExpressionAdaptiveScore(expr, userStats, sessionConfig)
    }));

    // Sort by adaptive score (higher is better for learning)
    scoredExpressions.sort((a, b) => b.adaptiveScore - a.adaptiveScore);

    // Select expressions based on session length and difficulty
    const maxExpressions = Math.min(
      Math.floor(sessionConfig.sessionLength / 2), // 2 minutes per expression average
      15 // Maximum expressions per session
    );

    return scoredExpressions
      .slice(0, maxExpressions)
      .map(item => item.expression);
  }

  /**
   * Record performance analytics for a user response
   */
  async recordPerformanceAnalytics(
    userId: string,
    sessionId: number,
    expressionId: number,
    responseTime: number,
    accuracy: number,
    difficultyLevel: number,
    aiResponse: string
  ): Promise<void> {
    const confidenceScore = this.extractConfidenceFromAI(aiResponse);
    const improvementSuggestion = this.generateImprovementSuggestion(accuracy, responseTime, difficultyLevel);

    const analytics: InsertPerformanceAnalytics = {
      userId,
      sessionId,
      expressionId,
      responseTime,
      accuracyScore: accuracy,
      difficultyAttempted: difficultyLevel,
      confidenceScore,
      improvementSuggestion
    };

    await this.storage.createPerformanceAnalytics(analytics);
    
    // Update expression mastery level
    await this.updateExpressionMastery(expressionId, accuracy, responseTime);
  }

  /**
   * Create and store adaptive challenges for user
   */
  async createAdaptiveChallenge(userId: string, challenge: PersonalizedChallenge): Promise<void> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 1 week expiration

    const adaptiveChallenge: InsertAdaptiveChallenge = {
      userId,
      challengeType: challenge.type,
      difficultyLevel: challenge.difficulty,
      targetMetric: challenge.targetMetric,
      reward: challenge.reward,
      expiresAt: expirationDate
    };

    await this.storage.createAdaptiveChallenge(adaptiveChallenge);
  }

  /**
   * Update user's adaptive difficulty level and score
   */
  async updateAdaptiveDifficulty(userId: string, analysis: DifficultyAnalysis): Promise<void> {
    if (analysis.confidence < this.confidenceThreshold) {
      return; // Don't adjust if confidence is too low
    }

    const userStats = await this.storage.getUserStats(userId);
    
    const updates = {
      currentDifficultyLevel: analysis.suggestedLevel,
      lastDifficultyAdjustment: new Date()
    };

    await this.storage.updateUserStats(updates, userId);
  }

  // Private helper methods
  private async getRecentSessionAnalytics(userId: string): Promise<PerformanceAnalytics[]> {
    // Implementation would fetch recent performance analytics
    // For now, return empty array as placeholder
    return [];
  }

  private calculatePerformanceMetrics(analytics: PerformanceAnalytics[]) {
    const totalAccuracy = analytics.reduce((sum, a) => sum + a.accuracyScore, 0);
    const totalResponseTime = analytics.reduce((sum, a) => sum + (a.responseTime || 0), 0);
    
    return {
      averageAccuracy: totalAccuracy / analytics.length,
      averageResponseTime: totalResponseTime / analytics.length,
      consistencyScore: this.calculateConsistency(analytics)
    };
  }

  private analyzePerformanceTrend(analytics: PerformanceAnalytics[]): 'improving' | 'stable' | 'declining' {
    if (analytics.length < 3) return 'stable';
    
    const recent = analytics.slice(-3);
    const older = analytics.slice(0, -3);
    
    const recentAvg = recent.reduce((sum, a) => sum + a.accuracyScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, a) => sum + a.accuracyScore, 0) / older.length;
    
    const improvement = recentAvg - olderAvg;
    
    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'declining';
    return 'stable';
  }

  private calculateAdaptiveScore(currentScore: number, metrics: any, trend: string): number {
    let adjustment = 0;
    
    if (trend === 'improving') adjustment += 10;
    if (trend === 'declining') adjustment -= 10;
    
    if (metrics.averageAccuracy > 0.8) adjustment += 5;
    if (metrics.averageAccuracy < 0.6) adjustment -= 5;
    
    return Math.max(0, Math.min(200, currentScore + adjustment));
  }

  private async identifyWeakAreas(userId: string): Promise<string[]> {
    const expressions = await this.storage.getExpressions(userId);
    const categories = await this.storage.getCategories();
    
    const categoryPerformance = new Map<number, number>();
    
    expressions.forEach(expr => {
      if (expr.categoryId) {
        const accuracy = expr.totalCount > 0 ? expr.correctCount / expr.totalCount : 0;
        categoryPerformance.set(expr.categoryId, 
          (categoryPerformance.get(expr.categoryId) || 0) + accuracy);
      }
    });
    
    const weakCategories = Array.from(categoryPerformance.entries())
      .filter(([_, performance]) => performance < 0.7)
      .map(([categoryId, _]) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.name || 'Unknown';
      });
    
    return weakCategories;
  }

  private calculateExpressionAdaptiveScore(
    expr: Expression, 
    userStats: UserStats, 
    config: AdaptiveSessionConfig
  ): number {
    let score = 0;
    
    // Difficulty matching
    const difficultyMatch = 1 - Math.abs(expr.difficultyLevel - config.targetDifficulty) / 5;
    score += difficultyMatch * 40;
    
    // Mastery level (prioritize expressions that need work)
    score += (1 - expr.masteryLevel) * 30;
    
    // Recency (prioritize less recently used)
    const daysSinceLastUsed = expr.lastUsed 
      ? (Date.now() - expr.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    score += Math.min(daysSinceLastUsed, 30) * 20;
    
    // Complexity matching
    const targetComplexity = config.targetDifficulty / 5 * 2; // Scale to 0-2
    const complexityMatch = 1 - Math.abs(expr.complexityScore - targetComplexity) / 2;
    score += complexityMatch * 10;
    
    return score;
  }

  private calculateConsistency(analytics: PerformanceAnalytics[]): number {
    if (analytics.length < 2) return 1;
    
    const accuracies = analytics.map(a => a.accuracyScore);
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
    
    return Math.max(0, 1 - variance); // Lower variance = higher consistency
  }

  private extractConfidenceFromAI(aiResponse: string): number {
    // Simple heuristic - in real implementation, would parse AI response
    if (aiResponse.includes('excellent') || aiResponse.includes('perfect')) return 0.9;
    if (aiResponse.includes('good') || aiResponse.includes('correct')) return 0.7;
    if (aiResponse.includes('close') || aiResponse.includes('almost')) return 0.5;
    return 0.3;
  }

  private generateImprovementSuggestion(accuracy: number, responseTime: number, difficulty: number): string {
    if (accuracy < 0.5) {
      return "Focus on understanding the expression meaning and context before responding.";
    }
    if (responseTime > 15) {
      return "Practice using expressions more quickly. Try to respond within 10 seconds.";
    }
    if (accuracy > 0.8 && responseTime < 8) {
      return "Excellent! Try more challenging expressions to continue improving.";
    }
    return "Good progress! Keep practicing to build confidence.";
  }

  private async updateExpressionMastery(expressionId: number, accuracy: number, responseTime: number): Promise<void> {
    const expression = await this.storage.getExpressionById(expressionId);
    if (!expression) return;
    
    // Calculate new mastery level based on performance
    const timeBonus = Math.max(0, 1 - (responseTime - 5) / 15); // Bonus for quick responses
    const performanceScore = accuracy * 0.7 + timeBonus * 0.3;
    
    // Update mastery level with exponential moving average
    const alpha = 0.2; // Learning rate
    const newMasteryLevel = alpha * performanceScore + (1 - alpha) * expression.masteryLevel;
    
    await this.storage.updateExpression(expressionId, { 
      masteryLevel: Math.min(1, newMasteryLevel) 
    });
  }
}

// Export class for dependency injection - will be initialized in routes
export function createAdaptiveDifficultyEngine(storage: IStorage) {
  return new AdaptiveDifficultyEngine(storage);
}