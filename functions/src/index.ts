import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Routes
import { expressionsRouter } from "./routes/expressions";
import { authRouter } from "./routes/auth";
import { chatRouter } from "./routes/chat";
import { statsRouter } from "./routes/stats";

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors({ 
  origin: [
    'https://conversation-practice-f2199.web.app',
    'https://conversation-practice-f2199.firebaseapp.com',
    'https://dailyconvo.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use("/expressions", expressionsRouter);
app.use("/auth", authRouter);
app.use("/chat", chatRouter);
app.use("/stats", statsRouter);

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "Firebase Functions API is running" });
});

// Export the API
export const api = functions.https.onRequest(app);
