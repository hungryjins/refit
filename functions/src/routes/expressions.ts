import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { authenticateUser, requireUser } from "../middleware/auth";

const router = express.Router();

// Expression creation schema
const createExpressionSchema = z.object({
  text: z.string().min(1),
  categoryId: z.number().nullable().optional(),
});

// Expression update schema
const updateExpressionSchema = z.object({
  text: z.string().min(1).optional(),
  categoryId: z.number().nullable().optional(),
});

// Get expression list
router.get("/", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const db = getFirestore();
    const expressionsRef = db
      .collection("users")
      .doc(userId)
      .collection("expressions");
    const snapshot = await expressionsRef.get();

    const expressions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(expressions);
  } catch (error) {
    console.error("Error fetching expressions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create expression
router.post("/", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const validatedData = createExpressionSchema.parse(req.body);

    const expressionData = {
      ...validatedData,
      correctCount: 0,
      totalCount: 0,
      createdAt: new Date(),
    };

    const db = getFirestore();
    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("expressions")
      .add(expressionData);

    return res.status(201).json({
      id: docRef.id,
      ...expressionData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating expression:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update expression
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const expressionId = req.params.id;
    const validatedData = updateExpressionSchema.parse(req.body);

    const db = getFirestore();
    const expressionRef = db
      .collection("users")
      .doc(userId)
      .collection("expressions")
      .doc(expressionId);
    const doc = await expressionRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    await expressionRef.update({
      ...validatedData,
      updatedAt: new Date(),
    });

    return res.json({ message: "Success" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error updating expression:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete expression
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const expressionId = req.params.id;

    const db = getFirestore();
    const expressionRef = db
      .collection("users")
      .doc(userId)
      .collection("expressions")
      .doc(expressionId);
    const doc = await expressionRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    await expressionRef.delete();

    return res.json({ message: "Success" });
  } catch (error) {
    console.error("Error deleting expression:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get category list
router.get("/categories", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const db = getFirestore();
    const categoriesRef = db
      .collection("users")
      .doc(userId)
      .collection("categories");
    const snapshot = await categoriesRef.get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create category
router.post("/categories", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const {
      name,
      icon = "📝",
      color = "from-blue-500 to-purple-500",
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const categoryData = {
      name,
      icon,
      color,
      createdAt: new Date(),
    };

    const db = getFirestore();
    const docRef = await db
      .collection("users")
      .doc(userId)
      .collection("categories")
      .add(categoryData);

    return res.status(201).json({
      id: docRef.id,
      ...categoryData,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as expressionsRouter };
