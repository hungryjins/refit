import { z } from "zod";

// Base Firestore document interface
export interface FirestoreDoc {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Category schema for Firestore
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().default("📝"),
  color: z.string().default("from-blue-500 to-purple-500"),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const InsertCategorySchema = CategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Expression schema for Firestore
export const ExpressionSchema = z.object({
  id: z.string(),
  text: z.string(),
  categoryId: z.string().optional(),
  correctCount: z.number().default(0),
  totalCount: z.number().default(0),
  lastUsed: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const InsertExpressionSchema = ExpressionSchema.omit({
  id: true,
  correctCount: true,
  totalCount: true,
  lastUsed: true,
  createdAt: true,
  updatedAt: true,
});

// Chat session schema for Firestore
export const ChatSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  scenario: z.string(),
  isActive: z.boolean().default(true),
  mode: z.enum(['conversation', 'friends_script', 'expression_practice']).default('conversation'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  endedAt: z.date().optional(),
});

export const InsertChatSessionSchema = ChatSessionSchema.omit({
  id: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  endedAt: true,
});

// Chat message schema for Firestore
export const ChatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  content: z.string(),
  isUser: z.boolean(),
  expressionUsed: z.string().optional(),
  isCorrect: z.boolean().optional(),
  feedback: z.string().optional(),
  createdAt: z.date(),
});

export const InsertChatMessageSchema = ChatMessageSchema.omit({
  id: true,
  createdAt: true,
});

// User stats schema for Firestore
export const UserStatsSchema = z.object({
  id: z.string(), // userId
  totalSessions: z.number().default(0),
  currentStreak: z.number().default(0),
  longestStreak: z.number().default(0),
  lastPracticeDate: z.date().optional(),
  overallAccuracy: z.number().default(0),
  totalCorrectResponses: z.number().default(0),
  totalResponses: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export const InsertUserStatsSchema = UserStatsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Achievement schema for Firestore
export const AchievementSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['streak', 'perfect', 'learner', 'conversationalist', 'explorer']),
  title: z.string(),
  description: z.string(),
  unlockedAt: z.date(),
});

export const InsertAchievementSchema = AchievementSchema.omit({
  id: true,
  unlockedAt: true,
});

// User profile schema for Firestore (Firebase Auth integration)
export const UserProfileSchema = z.object({
  id: z.string(), // Firebase Auth UID
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  targetLanguage: z.string().default('en'),
  nativeLanguage: z.string().default('ko'),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  lastLoginAt: z.date().optional(),
});

export const InsertUserProfileSchema = UserProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
});

export const ChatResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    response: z.string(),
    feedback: z.string().optional(),
    isCorrect: z.boolean().optional(),
    sessionId: z.string().optional(),
    sessionComplete: z.boolean().optional(),
    sessionStats: z.object({
      totalCorrect: z.number(),
      totalAttempts: z.number(),
      accuracy: z.number(),
    }).optional(),
    detectedExpression: z.string().optional(),
    failedExpression: z.string().optional(),
    usedExpression: z.string().optional(),
  }).optional(),
});

export const ExpressionsResponseSchema = ApiResponseSchema.extend({
  data: z.array(ExpressionSchema).optional(),
});

export const CategoriesResponseSchema = ApiResponseSchema.extend({
  data: z.array(CategorySchema).optional(),
});

export const StatsResponseSchema = ApiResponseSchema.extend({
  data: UserStatsSchema.optional(),
});

// Session start response
export const SessionStartResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    sessionId: z.string(),
    scenario: z.string(),
    initialMessage: z.string(),
    messageId: z.string(),
  }).optional(),
});

// Type exports
export type Category = z.infer<typeof CategorySchema>;
export type InsertCategory = z.infer<typeof InsertCategorySchema>;
export type Expression = z.infer<typeof ExpressionSchema>;
export type InsertExpression = z.infer<typeof InsertExpressionSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type InsertChatSession = z.infer<typeof InsertChatSessionSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type InsertChatMessage = z.infer<typeof InsertChatMessageSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type InsertUserStats = z.infer<typeof InsertUserStatsSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type InsertAchievement = z.infer<typeof InsertAchievementSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type InsertUserProfile = z.infer<typeof InsertUserProfileSchema>;

// API Response types
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ExpressionsResponse = z.infer<typeof ExpressionsResponseSchema>;
export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type SessionStartResponse = z.infer<typeof SessionStartResponseSchema>;

// Utility types
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

// Helper function to convert Firestore timestamp to Date
export const convertFirestoreTimestamp = (timestamp: FirestoreTimestamp | Date): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
};

// Collection names constants
export const COLLECTIONS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  EXPRESSIONS: 'expressions',
  CHAT_SESSIONS: 'chat_sessions',
  CHAT_MESSAGES: 'chat_messages',
  USER_STATS: 'user_stats',
  ACHIEVEMENTS: 'achievements',
} as const;