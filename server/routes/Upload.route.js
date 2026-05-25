import express from "express";
import {
  uploadFile,
  uploadUserAvatar,
  uploadWorkspaceIcon,
  deleteFile,
} from "../controllers/Upload.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyRole } from "../middleware/role.middleware.js";
import {
  uploadSingle,
  uploadAvatar,
  uploadIcon,
  handleUploadError,
} from "../middleware/upload.middleware.js";

const router = express.Router();

// All upload routes require login
router.use(verifyToken);

// ─── File upload (chat attachments) ──────────────────────────────────────────
// uploadSingle middleware streams file to Cloudinary before controller runs
router.post(
  "/file",
  uploadSingle,
  handleUploadError,
  uploadFile
);

// ─── Avatar upload ────────────────────────────────────────────────────────────
router.post(
  "/avatar",
  uploadAvatar,
  handleUploadError,
  uploadUserAvatar
);

// ─── Workspace icon upload ────────────────────────────────────────────────────
router.post(
  "/workspace-icon/:workspaceId",
  verifyRole("admin"),
  uploadIcon,
  handleUploadError,
  uploadWorkspaceIcon
);

// ─── Delete file from Cloudinary ─────────────────────────────────────────────
router.delete("/file", deleteFile);

export default router;
