import { 
  expressions, 
  chatSessions, 
  chatMessages, 
  userStats, 
  achievements,
  type Expression, 
  type InsertExpression,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type UserStats,
  type InsertUserStats,
  type Achievement,
  type InsertAchievement
} from "@shared/schema";

export interface IStorage {
  // Expressions
  getExpressions(): Promise<Expression[]>;
  getExpressionById(id: number): Promise<Expression | undefined>;
  createExpression(expression: InsertExpression): Promise<Expression>;
  updateExpressionStats(id: number, isCorrect: boolean): Promise<Expression>;
  
  // Chat Sessions
  getChatSessions(): Promise<ChatSession[]>;
  getActiveChatSession(): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  endChatSession(id: number): Promise<void>;
  
  // Chat Messages
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // User Stats
  getUserStats(): Promise<UserStats>;
  updateUserStats(stats: Partial<InsertUserStats>): Promise<UserStats>;
  
  // Achievements
  getAchievements(): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
}

export class MemStorage implements IStorage {
  private expressions: Map<number, Expression>;
  private chatSessions: Map<number, ChatSession>;
  private chatMessages: Map<number, ChatMessage>;
  private userStats: UserStats;
  private achievements: Map<number, Achievement>;
  private currentId: number;

  constructor() {
    this.expressions = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.achievements = new Map();
    this.currentId = 1;
    
    this.userStats = {
      id: 1,
      totalSessions: 0,
      currentStreak: 7,
      lastPracticeDate: new Date(),
      overallAccuracy: 84,
    };

    // Add some sample expressions for demonstration
    this.addSampleExpressions();
  }

  private addSampleExpressions() {
    const sampleExpressions = [
      { text: "Could you please help me with this?", category: "asking" },
      { text: "Thank you so much for your assistance", category: "compliment" },
      { text: "I'd like to order a coffee, please", category: "ordering" },
      { text: "Excuse me, where is the nearest station?", category: "asking" },
      { text: "Nice to meet you", category: "greeting" },
      { text: "Have a wonderful day", category: "greeting" },
    ];

    sampleExpressions.forEach(expr => {
      const id = this.currentId++;
      const expression: Expression = {
        id,
        text: expr.text,
        category: expr.category,
        correctCount: Math.floor(Math.random() * 5),
        totalCount: Math.floor(Math.random() * 8) + 2,
        lastUsed: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      };
      this.expressions.set(id, expression);
    });
  }

  async getExpressions(): Promise<Expression[]> {
    return Array.from(this.expressions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getExpressionById(id: number): Promise<Expression | undefined> {
    return this.expressions.get(id);
  }

  async createExpression(insertExpression: InsertExpression): Promise<Expression> {
    const id = this.currentId++;
    const expression: Expression = {
      id,
      text: insertExpression.text,
      category: insertExpression.category || null,
      correctCount: 0,
      totalCount: 0,
      lastUsed: null,
      createdAt: new Date(),
    };
    this.expressions.set(id, expression);
    return expression;
  }

  async updateExpressionStats(id: number, isCorrect: boolean): Promise<Expression> {
    const expression = this.expressions.get(id);
    if (!expression) {
      throw new Error(`Expression with id ${id} not found`);
    }

    const updated: Expression = {
      ...expression,
      totalCount: expression.totalCount + 1,
      correctCount: expression.correctCount + (isCorrect ? 1 : 0),
      lastUsed: new Date(),
    };
    
    this.expressions.set(id, updated);
    return updated;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getActiveChatSession(): Promise<ChatSession | undefined> {
    return Array.from(this.chatSessions.values()).find(session => session.isActive);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    // End any existing active sessions
    Array.from(this.chatSessions.values()).forEach(session => {
      if (session.isActive) {
        session.isActive = false;
      }
    });

    const id = this.currentId++;
    const session: ChatSession = {
      ...insertSession,
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.chatSessions.set(id, session);
    
    // Update user stats
    this.userStats.totalSessions++;
    
    return session;
  }

  async endChatSession(id: number): Promise<void> {
    const session = this.chatSessions.get(id);
    if (session) {
      session.isActive = false;
    }
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentId++;
    const message: ChatMessage = {
      id,
      sessionId: insertMessage.sessionId,
      content: insertMessage.content,
      isUser: insertMessage.isUser,
      expressionUsed: insertMessage.expressionUsed || null,
      isCorrect: insertMessage.isCorrect || null,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getUserStats(): Promise<UserStats> {
    return this.userStats;
  }

  async updateUserStats(stats: Partial<InsertUserStats>): Promise<UserStats> {
    this.userStats = { ...this.userStats, ...stats };
    return this.userStats;
  }

  async getAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).sort((a, b) => 
      new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    );
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const id = this.currentId++;
    const achievement: Achievement = {
      ...insertAchievement,
      id,
      unlockedAt: new Date(),
    };
    this.achievements.set(id, achievement);
    return achievement;
  }
}

// Keep using MemStorage for now due to Firebase setup complexity
// Will switch to Firebase once properly configured
export const storage = new MemStorage();
