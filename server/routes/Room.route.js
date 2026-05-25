import express from "express";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  archiveRoom,
  deleteRoom,
  reorderRooms,
} from "../controllers/Room.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { verifyRole } from "../middleware/role.middleware.js";

// mergeParams: true lets us access :workspaceId from the parent router
const router = express.Router({ mergeParams: true });

// All room routes require login
router.use(verifyToken);

// ─── Room CRUD ────────────────────────────────────────────────────────────────
router.post("/",                        verifyRole("admin"), createRoom);
router.get("/",                         getRooms);
router.get("/:roomId",                  getRoomById);
router.patch("/reorder",                verifyRole("admin"), reorderRooms);
router.patch("/:roomId",                verifyRole("admin"), updateRoom);
router.patch("/:roomId/archive",        verifyRole("admin"), archiveRoom);
router.delete("/:roomId",              verifyRole("admin"), deleteRoom);

export default router;
