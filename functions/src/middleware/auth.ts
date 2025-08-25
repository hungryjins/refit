import express from "express";
import { auth } from "firebase-admin";

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: auth.DecodedIdToken;
    }
  }
}

// 인증 미들웨어
export const authenticateUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
};

// 타입 가드 함수
export const requireUser = (req: express.Request): auth.DecodedIdToken => {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
};
