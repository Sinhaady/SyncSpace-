import express from "express";
import {
  createInvite,
  joinViaInvite,
  getWorkspaceInvites,
  revokeInvite,
} from "../controllers/Invite.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyRole } from "../middleware/role.middleware.js";

const router = express.Router();

// All invite routes require login

// ─── Public invite join (any logged-in user with the code) ───────────────────
router.get("/join/:code", verifyToken, joinViaInvite);

// ─── Workspace-scoped invite management (admin+) ─────────────────────────────
router.post(
  "/workspaces/:workspaceId/invite",
  verifyToken,
  verifyRole("admin"),
  createInvite
);
router.get(
  "/workspaces/:workspaceId/invite",
  verifyToken,
  verifyRole("admin"),
  getWorkspaceInvites
);
router.delete(
  "/workspaces/:workspaceId/:inviteId",
  verifyToken,
  verifyRole("admin"),
  revokeInvite
);

export default router;
