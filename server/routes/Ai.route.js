import express from "express";
import {
  summariseRoom,
  summariseThread,
} from "../controllers/Ai.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// summarise last N messages in a room
router.post("/summarise",        summariseRoom);

// summarise a specific thread
router.post("/summarise-thread", summariseThread);

export default router;
