import express from "express";
import { auth } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { authenticateUser, requireUser } from "../middleware/auth";

const router = express.Router();
const db = getFirestore();

// 사용자 프로필 조회
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 새 사용자 프로필 생성
      const defaultProfile = {
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        photoURL: user.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await userRef.set(defaultProfile);
      return res.json(defaultProfile);
    }

    const userData = userDoc.data();

    // 마지막 로그인 시간 업데이트
    await userRef.update({
      lastLoginAt: new Date(),
    });

    return res.json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 사용자 프로필 업데이트
router.put("/profile", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const { displayName, photoURL } = req.body;

    const userRef = db.collection("users").doc(userId);
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    await userRef.update(updateData);

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 사용자 삭제 (계정 탈퇴)
router.delete("/account", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;

    // Firestore에서 사용자 데이터 삭제
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // 하위 컬렉션들도 삭제
      const collections = [
        "expressions",
        "categories",
        "chatSessions",
        "stats",
        "achievements",
      ];

      for (const collectionName of collections) {
        const collectionRef = userRef.collection(collectionName);
        const snapshot = await collectionRef.get();

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // 사용자 문서 삭제
      await userRef.delete();
    }

    // Firebase Auth에서 사용자 삭제
    await auth().deleteUser(userId);

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 토큰 검증
router.post("/verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const decodedToken = await auth().verifyIdToken(token);

    return res.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.displayName,
      photoURL: decodedToken.photoURL,
    });
  } catch (error) {
    return res.json({
      valid: false,
      error: "Invalid token",
    });
  }
});

export { router as authRouter };
