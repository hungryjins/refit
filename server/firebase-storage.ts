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
  Timestamp
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
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
      category: expression.category || null,
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
      category: data?.category || null,
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
}