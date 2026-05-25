import express from "express";
import {
  getMessages,
  editMessage,
  deleteMessage,
  getThreadReplies,
  searchMessages,
} from "../controllers/Message.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// All message routes require login
router.use(verifyToken);

// ─── Message CRUD ─────────────────────────────────────────────────────────────
// GET  ?workspaceId=&cursor=&limit=   cursor-based pagination
router.get("/:roomId",                          getMessages);
router.patch("/:messageId",                     editMessage);
// DELETE ?workspaceId=                admin/author check
router.delete("/:messageId",                    deleteMessage);

// ─── Threads ──────────────────────────────────────────────────────────────────
// GET ?workspaceId=
router.get("/:roomId/threads/:messageId",       getThreadReplies);

// ─── Search ───────────────────────────────────────────────────────────────────
// GET ?q=hello&roomId=(optional)
router.get("/:workspaceId/search",              searchMessages);

export default router;
