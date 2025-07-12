import { 
  categories,
  expressions, 
  chatSessions, 
  chatMessages, 
  userStats, 
  achievements,
  users,
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
  type InsertAchievement,
  type User,
  type UpsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { IStorage } from "./storage";

// Guest data stored in memory (disappears when user leaves)
export class GuestMemoryStorage {
  private expressions: Map<number, Expression> = new Map();
  private chatSessions: Map<number, ChatSession> = new Map();
  private chatMessages: Map<number, ChatMessage> = new Map();
  private userStats: UserStats;
  private currentId: number = 1000; // Start guest IDs from 1000 to avoid conflicts

  constructor() {
    this.userStats = {
      id: this.currentId++,
      userId: null,
      totalSessions: 0,
      currentStreak: 0,
      lastPracticeDate: null,
      overallAccuracy: 0,
    };
  }

  async getExpressions(): Promise<Expression[]> {
    return Array.from(this.expressions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createExpression(insertExpression: InsertExpression): Promise<Expression> {
    const id = this.currentId++;
    const expression: Expression = {
      ...insertExpression,
      id,
      userId: null,
      correctCount: 0,
      totalCount: 0,
      lastUsed: null,
      createdAt: new Date(),
    };
    this.expressions.set(id, expression);
    return expression;
  }

  async updateExpression(id: number, updateData: Partial<InsertExpression>): Promise<Expression> {
    const existing = this.expressions.get(id);
    if (!existing) {
      throw new Error(`Expression with id ${id} not found`);
    }
    const updated: Expression = { ...existing, ...updateData };
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
      correctCount: isCorrect ? expression.correctCount + 1 : expression.correctCount,
      totalCount: expression.totalCount + 1,
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
    const id = this.currentId++;
    const session: ChatSession = {
      ...insertSession,
      id,
      userId: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async endChatSession(id: number): Promise<void> {
    const session = this.chatSessions.get(id);
    if (session) {
      this.chatSessions.set(id, { ...session, isActive: false });
    }
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentId++;
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async updateChatMessage(id: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage> {
    const existing = this.chatMessages.get(id);
    if (!existing) {
      throw new Error(`Chat message with id ${id} not found`);
    }
    const updated: ChatMessage = { ...existing, ...updates };
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
}

// Hybrid storage that delegates to either database (for authenticated users) or memory (for guests)
export class HybridStorage implements IStorage {
  private guestStorageMap: Map<string, GuestMemoryStorage> = new Map();

  private getGuestStorage(sessionId: string): GuestMemoryStorage {
    if (!this.guestStorageMap.has(sessionId)) {
      this.guestStorageMap.set(sessionId, new GuestMemoryStorage());
    }
    return this.guestStorageMap.get(sessionId)!;
  }

  // Helper to determine if user is authenticated
  private isAuthenticated(userId?: string): boolean {
    return !!userId;
  }

  // User operations (required for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Categories (always from database)
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

  // Expressions (hybrid)
  async getExpressions(userId?: string, sessionId?: string): Promise<Expression[]> {
    if (this.isAuthenticated(userId)) {
      // Return user's expressions from database
      return await db.select().from(expressions)
        .where(eq(expressions.userId, userId!))
        .orderBy(desc(expressions.createdAt));
    } else if (sessionId) {
      // Return guest expressions from memory
      return await this.getGuestStorage(sessionId).getExpressions();
    } else {
      // Return default expressions for non-authenticated users
      return await db.select().from(expressions)
        .where(isNull(expressions.userId))
        .orderBy(desc(expressions.createdAt));
    }
  }

  async getExpressionById(id: number): Promise<Expression | undefined> {
    const [expression] = await db.select().from(expressions).where(eq(expressions.id, id));
    return expression || undefined;
  }

  async createExpression(insertExpression: InsertExpression, userId?: string, sessionId?: string): Promise<Expression> {
    if (this.isAuthenticated(userId)) {
      // Save to database for authenticated users
      const [expression] = await db
        .insert(expressions)
        .values({ ...insertExpression, userId })
        .returning();
      return expression;
    } else if (sessionId) {
      // Save to memory for guest users
      return await this.getGuestStorage(sessionId).createExpression(insertExpression);
    } else {
      throw new Error("Either userId or sessionId must be provided");
    }
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

  // Chat Sessions (hybrid)
  async getChatSessions(userId?: string, sessionId?: string): Promise<ChatSession[]> {
    if (this.isAuthenticated(userId)) {
      return await db.select().from(chatSessions)
        .where(eq(chatSessions.userId, userId!))
        .orderBy(desc(chatSessions.createdAt));
    } else if (sessionId) {
      return await this.getGuestStorage(sessionId).getChatSessions();
    } else {
      return [];
    }
  }

  async getActiveChatSession(userId?: string, sessionId?: string): Promise<ChatSession | undefined> {
    if (this.isAuthenticated(userId)) {
      const [session] = await db.select().from(chatSessions)
        .where(and(eq(chatSessions.userId, userId!), eq(chatSessions.isActive, true)));
      return session || undefined;
    } else if (sessionId) {
      return await this.getGuestStorage(sessionId).getActiveChatSession();
    } else {
      return undefined;
    }
  }

  async createChatSession(insertSession: InsertChatSession, userId?: string, sessionId?: string): Promise<ChatSession> {
    if (this.isAuthenticated(userId)) {
      const [session] = await db
        .insert(chatSessions)
        .values({ ...insertSession, userId })
        .returning();
      return session;
    } else if (sessionId) {
      return await this.getGuestStorage(sessionId).createChatSession(insertSession);
    } else {
      throw new Error("Either userId or sessionId must be provided");
    }
  }

  async endChatSession(id: number): Promise<void> {
    await db
      .update(chatSessions)
      .set({ isActive: false })
      .where(eq(chatSessions.id, id));
  }

  // Chat Messages (hybrid based on session type)
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    // Try to find which storage this session belongs to
    // First check if it's a guest session
    for (const [guestSessionId, guestStorage] of this.guestStorageMap) {
      const guestSessions = await guestStorage.getChatSessions();
      if (guestSessions.some(s => s.id === sessionId)) {
        return await guestStorage.getChatMessages(sessionId);
      }
    }
    
    // If not found in guest storage, try database
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(insertMessage: InsertChatMessage, userId?: string, sessionId?: string): Promise<ChatMessage> {
    // Check if this is for a guest session
    if (!this.isAuthenticated(userId) && sessionId) {
      // Check if the session exists in guest storage
      for (const [guestSessionId, guestStorage] of this.guestStorageMap) {
        if (guestSessionId === sessionId) {
          const guestSessions = await guestStorage.getChatSessions();
          if (guestSessions.some(s => s.id === insertMessage.sessionId)) {
            return await guestStorage.createChatMessage(insertMessage);
          }
        }
      }
    }
    
    // Default to database for authenticated users
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

  // User Stats (hybrid)
  async getUserStats(userId?: string, sessionId?: string): Promise<UserStats> {
    if (this.isAuthenticated(userId)) {
      const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId!));
      if (!stats) {
        // Create default user stats if none exist
        const defaultStats = {
          userId,
          totalSessions: 0,
          currentStreak: 0,
          lastPracticeDate: null,
          overallAccuracy: 0,
        };
        const [newStats] = await db.insert(userStats).values(defaultStats).returning();
        return newStats;
      }
      return stats;
    } else if (sessionId) {
      return await this.getGuestStorage(sessionId).getUserStats();
    } else {
      // Return default stats for non-authenticated users
      return {
        id: 0,
        userId: null,
        totalSessions: 0,
        currentStreak: 0,
        lastPracticeDate: null,
        overallAccuracy: 0,
      };
    }
  }

  async updateUserStats(stats: Partial<InsertUserStats>, userId?: string, sessionId?: string): Promise<UserStats> {
    if (this.isAuthenticated(userId)) {
      const currentStats = await this.getUserStats(userId);
      const [updated] = await db
        .update(userStats)
        .set(stats)
        .where(eq(userStats.id, currentStats.id))
        .returning();
      return updated;
    } else if (sessionId) {
      return await this.getGuestStorage(sessionId).updateUserStats(stats);
    } else {
      throw new Error("Either userId or sessionId must be provided");
    }
  }

  // Achievements (always from database)
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

    // Add sample expressions (no user ID so they become default expressions)
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
      await db.insert(expressions).values({
        text: expr.text,
        categoryId: category?.id || null,
        userId: null, // Default expressions have no user
      });
    }
  }

  // Clean up guest storage for memory management
  cleanupGuestStorage(sessionId: string): void {
    this.guestStorageMap.delete(sessionId);
  }
}