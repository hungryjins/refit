import { 
  categories,
  expressions, 
  chatSessions, 
  chatMessages, 
  userStats, 
  achievements,
  type Category,
  type InsertCategory,
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
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  
  // Expressions
  getExpressions(): Promise<Expression[]>;
  getExpressionById(id: number): Promise<Expression | undefined>;
  createExpression(expression: InsertExpression): Promise<Expression>;
  updateExpression(id: number, expression: Partial<InsertExpression>): Promise<Expression>;
  deleteExpression(id: number): Promise<void>;
  updateExpressionStats(id: number, isCorrect: boolean): Promise<Expression>;
  
  // Chat Sessions
  getChatSessions(): Promise<ChatSession[]>;
  getActiveChatSession(): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  endChatSession(id: number): Promise<void>;
  
  // Chat Messages
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage>;
  
  // User Stats
  getUserStats(): Promise<UserStats>;
  updateUserStats(stats: Partial<InsertUserStats>): Promise<UserStats>;
  
  // Achievements
  getAchievements(): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, Category>;
  private expressions: Map<number, Expression>;
  private chatSessions: Map<number, ChatSession>;
  private chatMessages: Map<number, ChatMessage>;
  private userStats: UserStats;
  private achievements: Map<number, Achievement>;
  private currentId: number;

  constructor() {
    this.categories = new Map();
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

    // Add default categories and sample expressions
    this.addDefaultCategories();
    this.addSampleExpressions();
  }

  private addDefaultCategories() {
    const defaultCategories = [
      { name: "Greetings & Introductions", icon: "👋", color: "from-blue-500 to-purple-500" },
      { name: "Restaurant & Food", icon: "🍽️", color: "from-green-500 to-teal-500" },
      { name: "Questions & Requests", icon: "❓", color: "from-purple-500 to-pink-500" },
      { name: "Compliments & Praise", icon: "🌟", color: "from-yellow-500 to-orange-500" },
      { name: "Business & Work", icon: "💼", color: "from-gray-500 to-slate-500" },
      { name: "Travel & Directions", icon: "🗺️", color: "from-indigo-500 to-blue-500" },
    ];

    defaultCategories.forEach(cat => {
      const id = this.currentId++;
      const category: Category = {
        id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        createdAt: new Date(),
      };
      this.categories.set(id, category);
    });
  }

  private addSampleExpressions() {
    const categoryMap = Array.from(this.categories.values());
    const sampleExpressions = [
      { text: "Could you please help me with this?", categoryName: "Questions & Requests" },
      { text: "Thank you so much for your assistance", categoryName: "Compliments & Praise" },
      { text: "I'd like to order a coffee, please", categoryName: "Restaurant & Food" },
      { text: "Excuse me, where is the nearest station?", categoryName: "Travel & Directions" },
      { text: "Nice to meet you", categoryName: "Greetings & Introductions" },
      { text: "Have a wonderful day", categoryName: "Greetings & Introductions" },
    ];

    sampleExpressions.forEach(expr => {
      const category = categoryMap.find(cat => cat.name === expr.categoryName);
      const id = this.currentId++;
      const expression: Expression = {
        id,
        text: expr.text,
        categoryId: category?.id || null,
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

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentId++;
    const category: Category = {
      id,
      name: insertCategory.name,
      icon: insertCategory.icon || "📝",
      color: insertCategory.color || "from-blue-500 to-purple-500",
      createdAt: new Date(),
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: number, updateData: Partial<InsertCategory>): Promise<Category> {
    const category = this.categories.get(id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }

    const updated: Category = {
      ...category,
      ...updateData,
    };
    
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    // Update expressions to remove category reference
    Array.from(this.expressions.values()).forEach(expr => {
      if (expr.categoryId === id) {
        expr.categoryId = null;
      }
    });
    
    this.categories.delete(id);
  }

  async createExpression(insertExpression: InsertExpression): Promise<Expression> {
    const id = this.currentId++;
    const expression: Expression = {
      id,
      text: insertExpression.text,
      categoryId: insertExpression.categoryId || null,
      correctCount: 0,
      totalCount: 0,
      lastUsed: null,
      createdAt: new Date(),
    };
    this.expressions.set(id, expression);
    return expression;
  }

  async updateExpression(id: number, updateData: Partial<InsertExpression>): Promise<Expression> {
    const expression = this.expressions.get(id);
    if (!expression) {
      throw new Error(`Expression with id ${id} not found`);
    }

    const updated: Expression = {
      ...expression,
      ...updateData,
    };
    
    this.expressions.set(id, updated);
    return updated;
  }

  async deleteExpression(id: number): Promise<void> {
    this.expressions.delete(id);
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

  async updateChatMessage(id: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage> {
    const existingMessage = this.chatMessages.get(id);
    if (!existingMessage) {
      throw new Error("Message not found");
    }

    const updated: ChatMessage = {
      ...existingMessage,
      ...updates,
    };
    this.chatMessages.set(id, updated);
    return updated;
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

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(desc(categories.createdAt));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(id: number, updateData: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Expressions
  async getExpressions(): Promise<Expression[]> {
    return await db.select().from(expressions).orderBy(desc(expressions.createdAt));
  }

  async getExpressionById(id: number): Promise<Expression | undefined> {
    const [expression] = await db.select().from(expressions).where(eq(expressions.id, id));
    return expression || undefined;
  }

  async createExpression(insertExpression: InsertExpression): Promise<Expression> {
    const [expression] = await db
      .insert(expressions)
      .values(insertExpression)
      .returning();
    return expression;
  }

  async updateExpression(id: number, updateData: Partial<InsertExpression>): Promise<Expression> {
    const [expression] = await db
      .update(expressions)
      .set(updateData)
      .where(eq(expressions.id, id))
      .returning();
    return expression;
  }

  async deleteExpression(id: number): Promise<void> {
    await db.delete(expressions).where(eq(expressions.id, id));
  }

  async updateExpressionStats(id: number, isCorrect: boolean): Promise<Expression> {
    const expression = await this.getExpressionById(id);
    if (!expression) {
      throw new Error(`Expression with id ${id} not found`);
    }

    const newCorrectCount = isCorrect ? expression.correctCount + 1 : expression.correctCount;
    const newTotalCount = expression.totalCount + 1;

    const [updated] = await db
      .update(expressions)
      .set({
        correctCount: newCorrectCount,
        totalCount: newTotalCount,
        lastUsed: new Date(),
      })
      .where(eq(expressions.id, id))
      .returning();

    return updated;
  }

  // Chat Sessions
  async getChatSessions(): Promise<ChatSession[]> {
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
  }

  async getActiveChatSession(): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.isActive, true));
    return session || undefined;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async endChatSession(id: number): Promise<void> {
    await db
      .update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.id, id));
  }

  // Chat Messages
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async updateChatMessage(id: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage> {
    const [message] = await db
      .update(chatMessages)
      .set(updates)
      .where(eq(chatMessages.id, id))
      .returning();
    return message;
  }

  // User Stats
  async getUserStats(): Promise<UserStats> {
    const [stats] = await db.select().from(userStats);
    if (!stats) {
      // Create default user stats if none exist
      const defaultStats = {
        totalSessions: 0,
        currentStreak: 0,
        lastPracticeDate: null,
        overallAccuracy: 0,
      };
      const [newStats] = await db.insert(userStats).values(defaultStats).returning();
      return newStats;
    }
    return stats;
  }

  async updateUserStats(stats: Partial<InsertUserStats>): Promise<UserStats> {
    const currentStats = await this.getUserStats();
    const [updated] = await db
      .update(userStats)
      .set(stats)
      .where(eq(userStats.id, currentStats.id))
      .returning();
    return updated;
  }

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements).orderBy(desc(achievements.unlockedAt));
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values(insertAchievement)
      .returning();
    return achievement;
  }

  async initializeDefaultData(): Promise<void> {
    // Check if default data already exists
    const existingCategories = await this.getCategories();
    if (existingCategories.length > 0) {
      return; // Default data already exists
    }

    // Add default categories
    const defaultCategories = [
      { name: "Greetings & Introductions", icon: "👋", color: "from-blue-500 to-purple-500" },
      { name: "Restaurant & Food", icon: "🍽️", color: "from-green-500 to-teal-500" },
      { name: "Questions & Requests", icon: "❓", color: "from-purple-500 to-pink-500" },
      { name: "Compliments & Praise", icon: "🌟", color: "from-yellow-500 to-orange-500" },
      { name: "Business & Work", icon: "💼", color: "from-gray-500 to-slate-500" },
      { name: "Travel & Directions", icon: "🗺️", color: "from-indigo-500 to-blue-500" },
    ];

    const createdCategories = [];
    for (const cat of defaultCategories) {
      const category = await this.createCategory(cat);
      createdCategories.push(category);
    }

    // Add sample expressions
    const sampleExpressions = [
      { text: "Could you please help me with this?", categoryName: "Questions & Requests" },
      { text: "Thank you so much for your assistance", categoryName: "Compliments & Praise" },
      { text: "I'd like to order a coffee, please", categoryName: "Restaurant & Food" },
      { text: "Excuse me, where is the nearest station?", categoryName: "Travel & Directions" },
      { text: "Nice to meet you", categoryName: "Greetings & Introductions" },
      { text: "Have a wonderful day", categoryName: "Greetings & Introductions" },
    ];

    for (const expr of sampleExpressions) {
      const category = createdCategories.find(cat => cat.name === expr.categoryName);
      await this.createExpression({
        text: expr.text,
        categoryId: category?.id || null,
      });
    }
  }
}

// Database storage with PostgreSQL
export const storage = new DatabaseStorage();
