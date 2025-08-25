import { z } from "zod";

// Firestore용 스키마 정의
export const categorySchema = z.object({
  name: z.string(),
  icon: z.string().default("📝"),
  color: z.string().default("from-blue-500 to-purple-500"),
  createdAt: z.date().default(() => new Date()),
});

export const expressionSchema = z.object({
  text: z.string(),
  categoryId: z.string().optional(),
  correctCount: z.number().default(0),
  totalCount: z.number().default(0),
  lastUsed: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
});

export const chatSessionSchema = z.object({
  scenario: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});

export const chatMessageSchema = z.object({
  sessionId: z.string(),
  content: z.string(),
  isUser: z.boolean(),
  expressionUsed: z.string().optional(),
  isCorrect: z.boolean().optional(),
  createdAt: z.date().default(() => new Date()),
});

export const userStatsSchema = z.object({
  totalSessions: z.number().default(0),
  currentStreak: z.number().default(0),
  lastPracticeDate: z.date().optional(),
  overallAccuracy: z.number().default(0),
});

export const achievementSchema = z.object({
  type: z.enum(["streak", "perfect", "learner", "conversationalist"]),
  title: z.string(),
  description: z.string(),
  unlockedAt: z.date().default(() => new Date()),
});

// 타입 정의
export type Category = z.infer<typeof categorySchema>;
export type Expression = z.infer<typeof expressionSchema>;
export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type Achievement = z.infer<typeof achievementSchema>;

// Firestore 문서 타입
export interface FirestoreCategory extends Category {
  id: string;
}

export interface FirestoreExpression extends Expression {
  id: string;
}

// 숫자 ID를 사용하는 표현식 타입 (기존 시스템과 호환)
export interface ExpressionWithNumberId {
  id: number;
  text: string;
  categoryId?: string;
  correctCount: number;
  totalCount: number;
  lastUsed?: Date;
  createdAt: Date;
}

export interface FirestoreChatSession extends ChatSession {
  id: string;
}

export interface FirestoreChatMessage extends ChatMessage {
  id: string;
}

export interface FirestoreUserStats extends UserStats {
  id: string;
}

export interface FirestoreAchievement extends Achievement {
  id: string;
}
