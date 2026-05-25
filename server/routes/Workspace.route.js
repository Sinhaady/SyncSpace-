import express from "express";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  changeMemberRole,
  kickMember,
  leaveWorkspace,
} from "../controllers/Workspace.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyRole, verifyOwner } from "../middleware/role.middleware.js";

const router = express.Router();

// All workspace routes require login
router.use(verifyToken);

// ─── Workspace CRUD ───────────────────────────────────────────────────────────
router.post("/",                     createWorkspace);
router.get("/",                      getMyWorkspaces);
router.get("/:workspaceId",          getWorkspaceById);
router.patch("/:workspaceId",        verifyRole("admin"),  updateWorkspace);
router.delete("/:workspaceId",       verifyOwner,          deleteWorkspace);

// ─── Member management ────────────────────────────────────────────────────────
router.patch(
  "/:workspaceId/members/:userId/role",
  verifyRole("admin"),
  changeMemberRole
);
router.delete("/:workspaceId/members/:userId", verifyRole("admin"), kickMember);
router.delete("/:workspaceId/leave",           leaveWorkspace);

export default router;
