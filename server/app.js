import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";

import "./config/env.js";
import connectDB from "./config/db.js";
import passport from "./config/Passport.js";
import authRoutes      from "./routes/auth.route.js";
import workspaceRoutes from "./routes/Workspace.route.js";
import roomRoutes      from "./routes/Room.route.js";
import inviteRoutes    from "./routes/Invite.route.js";
import messageRoutes   from "./routes/Message.route.js";
import uploadRoutes    from "./routes/Upload.route.js";
import livekitRoutes   from "./routes/LikeKit.route.js";
import aiRoutes        from "./routes/Ai.route.js";
import { initSocket }  from "./socket/Socket.js";

const app = express();
const httpServer = createServer(app);

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── Health check — PUBLIC, must be before all other routes ──────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "SyncSpace API is running 🚀" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",                          authRoutes);
app.use("/api/workspaces",                    workspaceRoutes);
app.use("/api/workspaces/:workspaceId/rooms", roomRoutes);
app.use("/api/messages",                      messageRoutes);
app.use("/api/upload",                        uploadRoutes);
app.use("/api/livekit",                       livekitRoutes);
app.use("/api/ai",                            aiRoutes);

// ─── Invite routes last — they use /api/invite/join/:code ────────────────────
// kept separate to avoid catching other /api/* routes
app.use("/api/invite",                        inviteRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 SyncSpace server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
});

// ─── Initialise Socket.io ─────────────────────────────────────────────────────
initSocket(httpServer);

export { httpServer };
