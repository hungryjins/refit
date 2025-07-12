import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

// Middleware to verify Firebase ID token
export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  
  if (!authorization?.startsWith('Bearer ')) {
    // No token provided - continue as guest user
    req.user = null;
    return next();
  }

  const token = authorization.split(' ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    // Token verification failed - continue as guest user
    req.user = null;
    next();
  }
};

// Middleware that requires authentication
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authorization.split(' ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Helper to get session ID for guest users
export const getSessionId = (req: Request): string => {
  // Use session ID from cookie or generate a temporary one
  return req.sessionID || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};