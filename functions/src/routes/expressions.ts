import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { authenticateUser, requireUser } from "../middleware/auth";

const router = express.Router();
const db = getFirestore();

// 표현식 생성 스키마
const createExpressionSchema = z.object({
  text: z.string().min(1),
  categoryId: z.string().optional(),
});

// 표현식 업데이트 스키마
const updateExpressionSchema = z.object({
  text: z.string().min(1).optional(),
  categoryId: z.string().optional(),
});

// 표현식 목록 조회
router.get("/", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
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

// 표현식 생성
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

// 표현식 수정
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const expressionId = req.params.id;
    const validatedData = updateExpressionSchema.parse(req.body);

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

// 표현식 삭제
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
    const expressionId = req.params.id;

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

// 카테고리 목록 조회
router.get("/categories", authenticateUser, async (req, res) => {
  try {
    const user = requireUser(req);
    const userId = user.uid;
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

// 카테고리 생성
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
