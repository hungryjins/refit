import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import type { 
  Expression, 
  InsertExpression,
  ChatSession,
  InsertChatSession,
  ChatMessage,
  InsertChatMessage,
  UserStats,
  InsertUserStats,
  Achievement,
  InsertAchievement
} from "@shared/schema";
import type { IStorage } from "./storage";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export class FirebaseStorage implements IStorage {
  // Expressions
  async getExpressions(): Promise<Expression[]> {
    const q = query(collection(db, "expressions"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      id: index + 1, // Use sequential ID for compatibility
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      lastUsed: doc.data().lastUsed?.toDate() || null,
    })) as Expression[];
  }

  async getExpressionById(id: number): Promise<Expression | undefined> {
    const docRef = doc(db, "expressions", id.toString());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: parseInt(docSnap.id),
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        lastUsed: docSnap.data().lastUsed?.toDate() || null,
      } as Expression;
    }
    
    return undefined;
  }

  async createExpression(expression: InsertExpression): Promise<Expression> {
    const docRef = await addDoc(collection(db, "expressions"), {
      text: expression.text,
      categoryId: expression.categoryId,
      correctCount: 0,
      totalCount: 0,
      lastUsed: null,
      createdAt: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    return {
      id: Math.floor(Math.random() * 1000000), // Generate random ID for compatibility
      text: data?.text || expression.text,
      categoryId: data?.categoryId || expression.categoryId,
      correctCount: 0,
      totalCount: 0,
      lastUsed: null,
      createdAt: data?.createdAt?.toDate() || new Date(),
    } as Expression;
  }

  async updateExpressionStats(id: number, isCorrect: boolean): Promise<Expression> {
    const docRef = doc(db, "expressions", id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Expression with id ${id} not found`);
    }
    
    const currentData = docSnap.data();
    await updateDoc(docRef, {
      totalCount: (currentData.totalCount || 0) + 1,
      correctCount: (currentData.correctCount || 0) + (isCorrect ? 1 : 0),
      lastUsed: serverTimestamp(),
    });
    
    const updatedSnap = await getDoc(docRef);
    return {
      id: parseInt(updatedSnap.id),
      ...updatedSnap.data(),
      createdAt: updatedSnap.data()?.createdAt?.toDate() || new Date(),
      lastUsed: updatedSnap.data()?.lastUsed?.toDate() || new Date(),
    } as Expression;
  }

  // Chat Sessions
  async getChatSessions(): Promise<ChatSession[]> {
    const q = query(collection(db, "chatSessions"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: parseInt(doc.id),
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as ChatSession[];
  }

  async getActiveChatSession(): Promise<ChatSession | undefined> {
    const q = query(collection(db, "chatSessions"), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return undefined;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: parseInt(doc.id),
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as ChatSession;
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    // End any existing active sessions
    const activeQuery = query(collection(db, "chatSessions"), where("isActive", "==", true));
    const activeSnapshot = await getDocs(activeQuery);
    
    for (const activeDoc of activeSnapshot.docs) {
      await updateDoc(doc(db, "chatSessions", activeDoc.id), {
        isActive: false,
      });
    }

    const docRef = await addDoc(collection(db, "chatSessions"), {
      ...session,
      isActive: true,
      createdAt: serverTimestamp(),
    });
    
    // Update user stats
    await this.incrementUserSessions();
    
    const docSnap = await getDoc(docRef);
    return {
      id: parseInt(docRef.id),
      ...docSnap.data(),
      createdAt: docSnap.data()?.createdAt?.toDate() || new Date(),
    } as ChatSession;
  }

  async endChatSession(id: number): Promise<void> {
    const docRef = doc(db, "chatSessions", id.toString());
    await updateDoc(docRef, {
      isActive: false,
    });
  }

  // Chat Messages
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    const q = query(
      collection(db, "chatMessages"), 
      where("sessionId", "==", sessionId),
      orderBy("createdAt", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: parseInt(doc.id),
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as ChatMessage[];
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const docRef = await addDoc(collection(db, "chatMessages"), {
      ...message,
      createdAt: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    return {
      id: parseInt(docRef.id),
      ...docSnap.data(),
      createdAt: docSnap.data()?.createdAt?.toDate() || new Date(),
    } as ChatMessage;
  }

  // User Stats
  async getUserStats(): Promise<UserStats> {
    const docRef = doc(db, "userStats", "main");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: 1,
        ...docSnap.data(),
        lastPracticeDate: docSnap.data().lastPracticeDate?.toDate() || null,
      } as UserStats;
    } else {
      // Create default stats
      const defaultStats = {
        totalSessions: 0,
        currentStreak: 0,
        lastPracticeDate: null,
        overallAccuracy: 0,
      };
      
      await updateDoc(docRef, defaultStats);
      return {
        id: 1,
        ...defaultStats,
      } as UserStats;
    }
  }

  async updateUserStats(stats: Partial<InsertUserStats>): Promise<UserStats> {
    const docRef = doc(db, "userStats", "main");
    const updateData = {
      ...stats,
      lastPracticeDate: stats.lastPracticeDate ? Timestamp.fromDate(stats.lastPracticeDate) : null,
    };
    
    await updateDoc(docRef, updateData);
    return this.getUserStats();
  }

  private async incrementUserSessions(): Promise<void> {
    const docRef = doc(db, "userStats", "main");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const currentSessions = docSnap.data().totalSessions || 0;
      await updateDoc(docRef, {
        totalSessions: currentSessions + 1,
      });
    } else {
      await updateDoc(docRef, {
        totalSessions: 1,
        currentStreak: 0,
        lastPracticeDate: null,
        overallAccuracy: 0,
      });
    }
  }

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    const q = query(collection(db, "achievements"), orderBy("unlockedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: parseInt(doc.id),
      ...doc.data(),
      unlockedAt: doc.data().unlockedAt?.toDate() || new Date(),
    })) as Achievement[];
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const docRef = await addDoc(collection(db, "achievements"), {
      ...achievement,
      unlockedAt: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    return {
      id: parseInt(docRef.id),
      ...docSnap.data(),
      unlockedAt: docSnap.data()?.unlockedAt?.toDate() || new Date(),
    } as Achievement;
  }

  async updateChatMessage(id: number, updates: Partial<InsertChatMessage>): Promise<ChatMessage> {
    const docRef = doc(db, "chatMessages", id.toString());
    await updateDoc(docRef, updates);
    
    const updatedSnap = await getDoc(docRef);
    return {
      id: parseInt(updatedSnap.id),
      ...updatedSnap.data(),
      createdAt: updatedSnap.data()?.createdAt?.toDate() || new Date(),
    } as ChatMessage;
  }

  // Categories
  async getCategories(): Promise<any[]> {
    const q = query(collection(db, "categories"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      id: index + 1,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
  }

  async getCategoryById(id: number): Promise<any | undefined> {
    const docRef = doc(db, "categories", id.toString());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: parseInt(docSnap.id),
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      };
    }
    
    return undefined;
  }

  async createCategory(category: any): Promise<any> {
    const docRef = await addDoc(collection(db, "categories"), {
      name: category.name,
      description: category.description || "",
      createdAt: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    return {
      id: Math.floor(Math.random() * 1000000),
      name: data?.name || category.name,
      description: data?.description || "",
      createdAt: data?.createdAt?.toDate() || new Date(),
    };
  }

  async updateCategory(id: number, category: any): Promise<any> {
    const docRef = doc(db, "categories", id.toString());
    await updateDoc(docRef, category);
    
    const updatedSnap = await getDoc(docRef);
    return {
      id: parseInt(updatedSnap.id),
      ...updatedSnap.data(),
      createdAt: updatedSnap.data()?.createdAt?.toDate() || new Date(),
    };
  }

  async deleteCategory(id: number): Promise<void> {
    const docRef = doc(db, "categories", id.toString());
    await updateDoc(docRef, { deleted: true });
  }

  async updateExpression(id: number, expression: Partial<InsertExpression>): Promise<Expression> {
    const docRef = doc(db, "expressions", id.toString());
    await updateDoc(docRef, expression);
    
    const updatedSnap = await getDoc(docRef);
    return {
      id: parseInt(updatedSnap.id),
      ...updatedSnap.data(),
      createdAt: updatedSnap.data()?.createdAt?.toDate() || new Date(),
      lastUsed: updatedSnap.data()?.lastUsed?.toDate() || null,
    } as Expression;
  }

  async deleteExpression(id: number): Promise<void> {
    const docRef = doc(db, "expressions", id.toString());
    await updateDoc(docRef, { deleted: true });
  }

  // Initialize with default data
  async initializeDefaultData(): Promise<void> {
    const categoriesSnapshot = await getDocs(collection(db, "categories"));
    if (categoriesSnapshot.empty) {
      const defaultCategories = [
        { name: "Greetings & Introductions", description: "Basic greeting expressions" },
        { name: "Daily Conversations", description: "Common daily conversation phrases" },
        { name: "Business English", description: "Professional communication expressions" },
        { name: "Social Interactions", description: "Social situation phrases" }
      ];

      for (const category of defaultCategories) {
        await addDoc(collection(db, "categories"), {
          ...category,
          createdAt: serverTimestamp(),
        });
      }
    }

    const expressionsSnapshot = await getDocs(collection(db, "expressions"));
    if (expressionsSnapshot.empty) {
      const defaultExpressions = [
        { text: "Nice to meet you", categoryId: 1 },
        { text: "Have a wonderful day", categoryId: 1 },
        { text: "How are you doing?", categoryId: 1 },
        { text: "Thank you so much for your help", categoryId: 2 },
        { text: "I appreciate your time", categoryId: 2 },
        { text: "Could you please help me with this?", categoryId: 3 },
        { text: "I'd like to schedule a meeting", categoryId: 3 },
        { text: "Looking forward to hearing from you", categoryId: 3 }
      ];

      for (const expression of defaultExpressions) {
        await addDoc(collection(db, "expressions"), {
          ...expression,
          correctCount: 0,
          totalCount: 0,
          lastUsed: null,
          createdAt: serverTimestamp(),
        });
      }
    }

    const userStatsRef = doc(db, "userStats", "main");
    const userStatsSnap = await getDoc(userStatsRef);
    if (!userStatsSnap.exists()) {
      await setDoc(userStatsRef, {
        totalSessions: 0,
        currentStreak: 0,
        lastPracticeDate: null,
        overallAccuracy: 0,
      });
    }
  }
}