import express from "express";
import { auth } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { authenticateUser, requireUser } from "../middleware/auth";

const router = express.Router();
const db = getFirestore();

// Get user profile
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user profile
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

    // Update last login time
    await userRef.update({
      lastLoginAt: new Date(),
    });

    return res.json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
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

// Delete user (account withdrawal)
router.delete("/account", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;

    // Delete user data from Firestore
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Delete sub-collections as well
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

      // Delete user document
      await userRef.delete();
    }

    // Delete user from Firebase Auth
    await auth().deleteUser(userId);

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Token verification
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
