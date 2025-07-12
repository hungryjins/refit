import { pgTable, text, serial, integer, boolean, timestamp, real, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").default("📝").notNull(),
  color: text("color").default("from-blue-500 to-purple-500").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expressions = pgTable("expressions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  userId: varchar("user_id").references(() => users.id), // null for guest users
  correctCount: integer("correct_count").default(0).notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Adaptive difficulty metadata
  difficultyLevel: integer("difficulty_level").default(1).notNull(), // 1-5 scale
  complexityScore: real("complexity_score").default(1.0).notNull(), // calculated complexity
  masteryLevel: real("mastery_level").default(0).notNull(), // 0-1 user mastery
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  scenario: text("scenario").notNull(),
  userId: varchar("user_id").references(() => users.id), // null for guest users
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Adaptive difficulty session data
  targetDifficultyLevel: integer("target_difficulty_level").default(1).notNull(),
  actualDifficultyScore: real("actual_difficulty_score"), // calculated post-session
  performanceScore: real("performance_score"), // user performance in this session
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  expressionUsed: integer("expression_used").references(() => expressions.id),
  isCorrect: boolean("is_correct"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).unique(), // null for guest users
  totalSessions: integer("total_sessions").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  lastPracticeDate: timestamp("last_practice_date"),
  overallAccuracy: real("overall_accuracy").default(0).notNull(),
  // Adaptive difficulty tracking
  currentDifficultyLevel: integer("current_difficulty_level").default(1).notNull(),
  adaptiveScore: real("adaptive_score").default(100).notNull(), // 0-200 scale
  lastDifficultyAdjustment: timestamp("last_difficulty_adjustment").defaultNow(),
});

// New table for adaptive challenges
export const adaptiveChallenges = pgTable("adaptive_challenges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  challengeType: text("challenge_type").notNull(), // "speed", "accuracy", "complexity", "endurance"
  difficultyLevel: integer("difficulty_level").notNull(),
  targetMetric: real("target_metric").notNull(), // target score/time/accuracy
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  reward: text("reward"), // description of reward/achievement
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Performance analytics table
export const performanceAnalytics = pgTable("performance_analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: integer("session_id").references(() => chatSessions.id),
  expressionId: integer("expression_id").references(() => expressions.id),
  responseTime: real("response_time"), // seconds to respond
  accuracyScore: real("accuracy_score"), // 0-1 accuracy
  difficultyAttempted: integer("difficulty_attempted").notNull(),
  confidenceScore: real("confidence_score"), // AI-assessed confidence
  improvementSuggestion: text("improvement_suggestion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'streak', 'perfect', 'learner', 'conversationalist'
  title: text("title").notNull(),
  description: text("description").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  expressions: many(expressions),
}));

export const usersRelations = relations(users, ({ many }) => ({
  expressions: many(expressions),
  chatSessions: many(chatSessions),
  userStats: many(userStats),
}));

export const expressionsRelations = relations(expressions, ({ one, many }) => ({
  category: one(categories, {
    fields: [expressions.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [expressions.userId],
    references: [users.id],
  }),
  chatMessages: many(chatMessages),
}));

export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  expression: one(expressions, {
    fields: [chatMessages.expressionUsed],
    references: [expressions.id],
  }),
}));

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertExpressionSchema = createInsertSchema(expressions).omit({
  id: true,
  correctCount: true,
  totalCount: true,
  lastUsed: true,
  createdAt: true,
  masteryLevel: true, // calculated field
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  isActive: true,
  createdAt: true,
  actualDifficultyScore: true, // calculated post-session
  performanceScore: true, // calculated post-session
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertAdaptiveChallengeSchema = createInsertSchema(adaptiveChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceAnalyticsSchema = createInsertSchema(performanceAnalytics).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Expression = typeof expressions.$inferSelect;
export type InsertExpression = z.infer<typeof insertExpressionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type AdaptiveChallenge = typeof adaptiveChallenges.$inferSelect;
export type InsertAdaptiveChallenge = z.infer<typeof insertAdaptiveChallengeSchema>;
export type PerformanceAnalytics = typeof performanceAnalytics.$inferSelect;
export type InsertPerformanceAnalytics = z.infer<typeof insertPerformanceAnalyticsSchema>;
