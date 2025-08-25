import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import { authenticateUser, requireUser } from "../middleware/auth";

const router = express.Router();

// Get user statistics
router.get("/", authenticateUser, async (req, res) => {
  try {
    const db = getFirestore();
    const user = requireUser(req);
    const userId = user.uid;
    const statsRef = db
      .collection("users")
      .doc(userId)
      .collection("stats")
      .doc("main");
    const statsDoc = await statsRef.get();

    if (!statsDoc.exists) {
      // Create default statistics
      const defaultStats = {
        totalSessions: 0,
        currentStreak: 0,
        lastPracticeDate: null,
        overallAccuracy: 0,
        totalExpressions: 0,
        totalPracticeTime: 0,
        createdAt: new Date(),
      };

      await statsRef.set(defaultStats);
      return res.json(defaultStats);
    }

    return res.json(statsDoc.data());
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update statistics
router.put("/", authenticateUser, async (req, res) => {
  try {
    const db = getFirestore();
    const user = requireUser(req);
    const userId = user.uid;
    const {
      totalSessions,
      currentStreak,
      lastPracticeDate,
      overallAccuracy,
      totalExpressions,
      totalPracticeTime,
    } = req.body;

    const statsRef = db
      .collection("users")
      .doc(userId)
      .collection("stats")
      .doc("main");

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (totalSessions !== undefined) updateData.totalSessions = totalSessions;
    if (currentStreak !== undefined) updateData.currentStreak = currentStreak;
    if (lastPracticeDate !== undefined)
      updateData.lastPracticeDate = lastPracticeDate;
    if (overallAccuracy !== undefined)
      updateData.overallAccuracy = overallAccuracy;
    if (totalExpressions !== undefined)
      updateData.totalExpressions = totalExpressions;
    if (totalPracticeTime !== undefined)
      updateData.totalPracticeTime = totalPracticeTime;

    await statsRef.update(updateData);

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error updating user stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get achievements list
router.get("/achievements", authenticateUser, async (req, res) => {
  try {
    const db = getFirestore();
    const user = requireUser(req);
    const userId = user.uid;
    const achievementsRef = db
      .collection("users")
      .doc(userId)
      .collection("achievements");
    const snapshot = await achievementsRef.orderBy("unlockedAt", "desc").get();

    const achievements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(achievements);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add achievement
router.post("/achievements", authenticateUser, async (req, res) => {
  try {
    const db = getFirestore();
    const user = requireUser(req);
    const userId = user.uid;
    const { type, title, description } = req.body;

    if (!type || !title || !description) {
      return res
        .status(400)
        .json({ error: "Type, title, and description are required" });
    }

    const achievementData = {
      type,
      title,
      description,
      unlockedAt: new Date(),
    };

    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("achievements")
      .add(achievementData);

    return res.status(201).json({
      id: docRef.id,
      ...achievementData,
    });
  } catch (error) {
    console.error("Error creating achievement:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get practice records
router.get("/practice-history", authenticateUser, async (req, res) => {
  try {
    const db = getFirestore();
    const user = requireUser(req);
    const userId = user.uid;
    const { limit = 10, offset = 0 } = req.query;

    const sessionsRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions");
    const snapshot = await sessionsRef
      .orderBy("createdAt", "desc")
      .limit(Number(limit))
      .offset(Number(offset))
      .get();

    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(sessions);
  } catch (error) {
    console.error("Error fetching practice history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get expression statistics
router.get("/expressions", authenticateUser, async (req, res) => {
  try {
    const db = getFirestore();
    const user = requireUser(req);
    const userId = user.uid;
    const expressionsRef = db
      .collection("users")
      .doc(userId)
      .collection("expressions");
    const snapshot = await expressionsRef.get();

    const expressions = snapshot.docs.map((doc) => ({
      id: doc.id,
      text: doc.data().text,
      categoryId: doc.data().categoryId,
      correctCount: doc.data().correctCount || 0,
      totalCount: doc.data().totalCount || 0,
      lastUsed: doc.data().lastUsed,
      createdAt: doc.data().createdAt || new Date(),
    }));

    // Calculate statistics
    const totalExpressions = expressions.length;
    const totalUsage = expressions.reduce(
      (sum, expr) => sum + (expr.totalCount || 0),
      0
    );
    const totalCorrect = expressions.reduce(
      (sum, expr) => sum + (expr.correctCount || 0),
      0
    );
    const overallAccuracy =
      totalUsage > 0 ? (totalCorrect / totalUsage) * 100 : 0;

    // Most used expressions
    const mostUsed = expressions
      .filter((expr) => expr.totalCount > 0)
      .sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0))
      .slice(0, 5);

    // Recently used expressions
    const recentlyUsed = expressions
      .filter((expr) => expr.lastUsed)
      .sort(
        (a, b) =>
          new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      )
      .slice(0, 5);

    return res.json({
      totalExpressions,
      totalUsage,
      totalCorrect,
      overallAccuracy,
      mostUsed,
      recentlyUsed,
    });
  } catch (error) {
    console.error("Error fetching expression stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as statsRouter };
