import express from "express";
import {
  getLiveKitToken,
  disconnectParticipant,
} from "../controllers/Livekit.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// generate token to join a voice/video room
router.post("/token",       getLiveKitToken);

// kick participant from voice/video room (admin+)
router.delete("/disconnect", disconnectParticipant);

export default router;
