import express from "express";
import { auth } from "firebase-admin";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: auth.DecodedIdToken;
    }
  }
}

// Authentication middleware
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

// Type guard function
export const requireUser = (req: express.Request): auth.DecodedIdToken => {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
};
